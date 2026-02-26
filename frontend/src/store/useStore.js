import { create } from 'zustand';
import { io } from 'socket.io-client';

const AQI_COLORS = {
  Good: { bg: 'bg-green-500', text: 'text-green-600', hex: '#22c55e', label: 'Good' },
  Moderate: { bg: 'bg-yellow-400', text: 'text-yellow-500', hex: '#facc15', label: 'Moderate' },
  'Unhealthy for Sensitive Groups': { bg: 'bg-orange-400', text: 'text-orange-500', hex: '#fb923c', label: 'USG' },
  Unhealthy: { bg: 'bg-red-500', text: 'text-red-600', hex: '#ef4444', label: 'Unhealthy' },
  'Very Unhealthy': { bg: 'bg-purple-600', text: 'text-purple-700', hex: '#9333ea', label: 'Very Unhealthy' },
  Hazardous: { bg: 'bg-rose-900', text: 'text-rose-900', hex: '#881337', label: 'Hazardous' },
};

export const getAQIColor = (category) =>
  AQI_COLORS[category] || { bg: 'bg-gray-400', text: 'text-gray-500', hex: '#9ca3af', label: 'Unknown' };

export const classifyAQI = (aqi) => {
  if (aqi == null) return 'Unknown';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

const useStore = create((set, get) => ({
  // Cities list
  cities: [],
  setCities: (cities) => set({ cities }),

  // Selected city
  selectedCityId: null,
  setSelectedCityId: (id) => set({ selectedCityId: id }),

  // City data cache: { [city_id]: { summary, stations, weather } }
  cityCache: {},
  setCitySummary: (city_id, data) =>
    set((s) => ({ cityCache: { ...s.cityCache, [city_id]: { ...s.cityCache[city_id], summary: data } } })),
  setCityStations: (city_id, data) =>
    set((s) => ({ cityCache: { ...s.cityCache, [city_id]: { ...s.cityCache[city_id], stations: data } } })),
  setCityWeather: (city_id, data) =>
    set((s) => ({ cityCache: { ...s.cityCache, [city_id]: { ...s.cityCache[city_id], weather: data } } })),

  // Live station updates via Socket.IO
  liveUpdates: {},  // { [station_id]: record }
  socket: null,

  initSocket: () => {
    const existing = get().socket;
    if (existing) return;
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('aqi_update', (data) => {
      set((s) => ({
        liveUpdates: { ...s.liveUpdates, [data.station_id]: data },
      }));
    });
    set({ socket });
  },

  destroySocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null });
  },

  // User profile (persisted in localStorage)
  userProfile: JSON.parse(localStorage.getItem('aqi_profile') || 'null'),
  setUserProfile: (profile) => {
    localStorage.setItem('aqi_profile', JSON.stringify(profile));
    set({ userProfile: profile });
  },
}));

export default useStore;
