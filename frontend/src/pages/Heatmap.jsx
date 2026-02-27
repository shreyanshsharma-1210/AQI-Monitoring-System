import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useSearchParams } from 'react-router-dom';
import useStore, { classifyAQI, getAQIColor } from '../store/useStore';
import StationDetailPanel from '../components/StationDetailPanel';
import CitySelector from '../components/CitySelector';

// India bounds
const INDIA_CENTER = [20.5937, 78.9629];
const INDIA_ZOOM   = 5;

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom]);
  return null;
}

function AQIMarker({ station, onClick }) {
  const cat = station.aqi != null ? classifyAQI(station.aqi) : 'Unknown';
  const color = getAQIColor(cat);
  return (
    <CircleMarker
      center={[station.lat, station.lon]}
      radius={station._isCityMarker ? 14 : 9}
      pathOptions={{
        color: '#fff',
        weight: station._isCityMarker ? 2 : 1.5,
        fillColor: color.hex,
        fillOpacity: 0.85,
      }}
      eventHandlers={{ click: () => onClick(station) }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        <div className="text-xs">
          <strong>{station.station_name || station.display_name}</strong>
          {station.aqi != null && (
            <span style={{ color: color.hex }}> — AQI {Math.round(station.aqi)}</span>
          )}
          <br />
          <span style={{ color: color.hex }}>{cat}</span>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}

export default function Heatmap() {
  const { cities, setCities, selectedCityId, setSelectedCityId, initSocket, liveUpdates } = useStore();
  const [searchParams] = useSearchParams();

  const [cityStations, setCityStations] = useState([]);
  const [mapCenter, setMapCenter] = useState(INDIA_CENTER);
  const [mapZoom, setMapZoom] = useState(INDIA_ZOOM);
  const [selectedStation, setSelectedStation] = useState(null);
  const [drillMode, setDrillMode] = useState(false); // false = city view, true = station view

  useEffect(() => {
    initSocket();
    if (cities.length === 0) {
      fetch('/api/aqi/cities').then((r) => r.json()).then(setCities).catch(() => {});
    }
  }, []);

  // Drill into city stations + fetch community reports
  const drillIntoCity = async (city) => {
    setSelectedCityId(city.id);
    const res = await fetch(`/api/aqi/cities/${city.id}/stations`);
    if (!res.ok) return;
    const data = await res.json();
    setCityStations(data.filter((s) => s.lat && s.lon));
    const validCity = cities.find((c) => c.id === city.id);
    if (validCity) {
      setMapCenter([validCity.lat, validCity.lon]);
      setMapZoom(11);
    }
    setDrillMode(true);
  };

  // Reset to country view
  const resetToCountry = () => {
    setDrillMode(false);
    setCityStations([]);
    setSelectedStation(null);
    setMapCenter(INDIA_CENTER);
    setMapZoom(INDIA_ZOOM);
  };

  // Handle ?station= param on load
  useEffect(() => {
    const stationId = parseInt(searchParams.get('station'));
    if (stationId && cities.length > 0) {
      cities.forEach(async (c) => {
        const res = await fetch(`/api/aqi/cities/${c.id}/stations`);
        if (!res.ok) return;
        const stations = await res.json();
        const found = stations.find((s) => s.id === stationId);
        if (found) {
          setCityStations(stations.filter((s) => s.lat && s.lon));
          setMapCenter([found.lat, found.lon]);
          setMapZoom(13);
          setDrillMode(true);
          setSelectedStation(found);
          setSelectedCityId(c.id);
        }
      });
    }
  }, [searchParams, cities]);

  // Enrich city stations from live updates
  const enrichedStations = cityStations.map((s) => {
    const live = liveUpdates[s.id];
    return live ? { ...s, aqi: live.aqi, pm25: live.pm25, pm10: live.pm10, health_category: live.health_category } : s;
  });

  // City markers with latest AQI from liveUpdates
  const cityMarkers = cities
    .filter((c) => c.lat && c.lon)
    .map((c) => {
      // Find any live station update for this city
      const liveStation = Object.values(liveUpdates).find((u) => u.city_id === c.id);
      return {
        ...c,
        station_name: c.display_name,
        aqi: liveStation?.aqi ?? null,
        lat: parseFloat(c.lat),
        lon: parseFloat(c.lon),
        _isCityMarker: true,
        _cityData: c,
      };
    });

  return (
    <div className="relative h-[calc(100vh-56px)] flex flex-col bg-gray-950">
      {/* Controls bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
        {drillMode && (
          <button
            onClick={resetToCountry}
            className="bg-gray-900 border border-gray-600 text-white text-xs px-3 py-1.5 rounded-lg hover:border-blue-400 transition-colors"
          >
            ← All India
          </button>
        )}
        <CitySelector
          cities={cities}
          selected={selectedCityId}
          onChange={(id) => {
            const city = cities.find((c) => c.id === id);
            if (city) drillIntoCity(city);
          }}
        />
        {drillMode && (
          <>
            <span className="bg-blue-600/80 text-white text-xs px-2.5 py-1 rounded-lg">
              {enrichedStations.length} stations
            </span>
          </>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={INDIA_CENTER}
        zoom={INDIA_ZOOM}
        style={{ flex: 1, minHeight: 0, height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />
        <FlyTo center={mapCenter} zoom={mapZoom} />

        {/* City markers (country view) */}
        {!drillMode && cityMarkers.map((city) => (
          <AQIMarker
            key={`city-${city.id}`}
            station={city}
            onClick={() => drillIntoCity(city._cityData)}
          />
        ))}

        {/* Station markers (drill-down view) */}
        {drillMode && enrichedStations.map((s) => (
          <AQIMarker
            key={`station-${s.id}`}
            station={s}
            onClick={() => setSelectedStation(s)}
          />
        ))}

      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/90 border border-gray-700 rounded-xl p-3 text-xs space-y-1">
        <p className="text-gray-400 font-semibold mb-1.5">AQI Scale</p>
        {[
          ['Good', '#22c55e', '0–50'],
          ['Moderate', '#facc15', '51–100'],
          ['USG', '#fb923c', '101–150'],
          ['Unhealthy', '#ef4444', '151–200'],
          ['Very Unhealthy', '#9333ea', '201–300'],
          ['Hazardous', '#881337', '300+'],
        ].map(([label, hex, range]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
            <span className="text-gray-300">{label}</span>
            <span className="text-gray-500 ml-auto pl-3">{range}</span>
          </div>
        ))}
        {!drillMode && (
          <p className="text-gray-500 pt-1 border-t border-gray-700">Click a city to drill down</p>
        )}
      </div>

      {/* Station detail panel */}
      {selectedStation && (
        <StationDetailPanel
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  );
}
