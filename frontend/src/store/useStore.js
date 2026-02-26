import { create } from 'zustand';
import { io } from 'socket.io-client';
import i18n from '../i18n/index.js';

// ── AQI helpers ────────────────────────────────────────────────────────────────
const AQI_COLORS = {
  Good:                             { bg: 'bg-green-500',  text: 'text-green-600',  hex: '#22c55e', label: 'Good' },
  Moderate:                         { bg: 'bg-yellow-400', text: 'text-yellow-500', hex: '#facc15', label: 'Moderate' },
  'Unhealthy for Sensitive Groups': { bg: 'bg-orange-400', text: 'text-orange-500', hex: '#fb923c', label: 'USG' },
  Unhealthy:                        { bg: 'bg-red-500',    text: 'text-red-600',    hex: '#ef4444', label: 'Unhealthy' },
  'Very Unhealthy':                 { bg: 'bg-purple-600', text: 'text-purple-700', hex: '#9333ea', label: 'Very Unhealthy' },
  Hazardous:                        { bg: 'bg-rose-900',   text: 'text-rose-900',   hex: '#881337', label: 'Hazardous' },
};

export const getAQIColor = (category) =>
  AQI_COLORS[category] || { bg: 'bg-gray-400', text: 'text-gray-500', hex: '#9ca3af', label: 'Unknown' };

export const classifyAQI = (aqi) => {
  if (aqi == null) return 'Unknown';
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

// ── Haversine distance ─────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Theme init ─────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('aqi_theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
} else {
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
}

// ── Store ─────────────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  // ── Theme ──────────────────────────────────────────────────────────────────
  theme: savedTheme,
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('aqi_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  // ── Language ───────────────────────────────────────────────────────────────
  language: localStorage.getItem('aqi_lang') || 'en',
  setLanguage: (lang) => {
    localStorage.setItem('aqi_lang', lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
  },

  // ── Cities list ────────────────────────────────────────────────────────────
  cities: [],
  setCities: (cities) => set({ cities }),

  // ── Selected city (persisted) ─────────────────────────────────────────────
  selectedCityId: localStorage.getItem('aqi_selected_city')
    ? Number(localStorage.getItem('aqi_selected_city'))
    : null,
  setSelectedCityId: (id) => {
    if (id != null) localStorage.setItem('aqi_selected_city', String(id));
    else localStorage.removeItem('aqi_selected_city');
    set({ selectedCityId: id, showCityPicker: false });
  },

  // ── City picker modal ──────────────────────────────────────────────────────
  showCityPicker: false,
  setShowCityPicker: (v) => set({ showCityPicker: v }),

  // ── Location detection ─────────────────────────────────────────────────────
  locationDetecting: false,
  detectAndSelectCity: () => {
    const { cities } = get();
    if (!navigator.geolocation || !cities.length) {
      // Can't detect — show the picker
      set({ showCityPicker: true });
      return;
    }
    set({ locationDetecting: true });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest = null;
        let minDist = Infinity;
        for (const city of cities) {
          const d = haversineKm(latitude, longitude, parseFloat(city.lat), parseFloat(city.lon));
          if (d < minDist) { minDist = d; nearest = city; }
        }
        if (nearest) {
          localStorage.setItem('aqi_selected_city', String(nearest.id));
          set({ selectedCityId: nearest.id, locationDetecting: false, showCityPicker: false });
        } else {
          set({ locationDetecting: false, showCityPicker: true });
        }
      },
      () => {
        // Permission denied or error — show city picker
        set({ locationDetecting: false, showCityPicker: true });
      },
      { timeout: 8000 }
    );
  },

  // ── City data cache: { [city_id]: { summary, stations, weather } } ─────────
  cityCache: {},
  setCitySummary:  (city_id, data) => set((s) => ({ cityCache: { ...s.cityCache, [city_id]: { ...s.cityCache[city_id], summary:  data } } })),
  setCityStations: (city_id, data) => set((s) => ({ cityCache: { ...s.cityCache, [city_id]: { ...s.cityCache[city_id], stations: data } } })),
  setCityWeather:  (city_id, data) => set((s) => ({ cityCache: { ...s.cityCache, [city_id]: { ...s.cityCache[city_id], weather:  data } } })),

  // ── Live station updates via Socket.IO ─────────────────────────────────────
  liveUpdates: {},
  socket: null,

  initSocket: () => {
    if (get().socket) return;
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('aqi_update', (data) => {
      set((s) => ({ liveUpdates: { ...s.liveUpdates, [data.station_id]: data } }));
    });
    set({ socket });
  },

  destroySocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null });
  },

  // ── User profile (persisted in localStorage) ───────────────────────────────
  userProfile: JSON.parse(localStorage.getItem('aqi_profile') || 'null'),
  setUserProfile: (profile) => {
    localStorage.setItem('aqi_profile', JSON.stringify(profile));
    set({ userProfile: profile });
  },

  // ── Gamification stats ─────────────────────────────────────────────────────
  gamification: JSON.parse(localStorage.getItem('aqi_gamification') || 'null'),
  setGamification: (data) => {
    localStorage.setItem('aqi_gamification', JSON.stringify(data));
    set({ gamification: data });
  },
  refreshGamification: async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/gamification/stats/${userId}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('aqi_gamification', JSON.stringify(data));
        set({ gamification: data });
      }
    } catch { /* silent */ }
  },
}));

export default useStore;
