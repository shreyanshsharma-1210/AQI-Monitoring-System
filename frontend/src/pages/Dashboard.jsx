import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Radio, MapPin, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore, { classifyAQI, getAQIColor } from '../store/useStore';
import AQIGauge from '../components/AQIGauge';
import HealthInsightCard from '../components/HealthInsightCard';
import WeatherCard from '../components/WeatherCard';
import ForecastChart from '../components/ForecastChart';
import PollutantTabBar from '../components/PollutantTabBar';
import CitySelector from '../components/CitySelector';
import YoYInsightCard from '../components/YoYInsightCard';
import { SkeletonGauge, SkeletonCard, SkeletonList } from '../components/LoadingSkeleton';

const POLLUTANT_META = {
  pm25: { label: 'PM2.5', unit: 'μg/m³', safe: 12, warn: 35 },
  pm10: { label: 'PM10',  unit: 'μg/m³', safe: 54, warn: 154 },
  no2:  { label: 'NO₂',  unit: 'μg/m³', safe: 53, warn: 100 },
  o3:   { label: 'O₃',   unit: 'μg/m³', safe: 54, warn: 70 },
  co:   { label: 'CO',   unit: 'mg/m³', safe: 4.4, warn: 9.4 },
  so2:  { label: 'SO₂',  unit: 'μg/m³', safe: 35, warn: 75 },
};

function PollutantBar({ label, value, safe, warn, unit }) {
  const max = warn * 2;
  const pct = Math.min((value / max) * 100, 100);
  const color = value <= safe ? '#22c55e' : value <= warn ? '#facc15' : '#ef4444';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{value != null ? value.toFixed(1) : '—'} {unit}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    cities, setCities, selectedCityId, setSelectedCityId,
    initSocket, liveUpdates, userProfile,
    locationDetecting, detectAndSelectCity,
  } = useStore();

  const [summary, setSummary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load cities once
  useEffect(() => {
    if (cities.length === 0) {
      fetch('/api/aqi/cities').then((r) => r.json()).then(setCities).catch(() => {});
    }
    initSocket();
  }, []);

  // Auto-select from saved profile preference only (LocationGate handles first-time detection)
  useEffect(() => {
    if (!selectedCityId && cities.length > 0 && userProfile?.preferred_city_id) {
      setSelectedCityId(userProfile.preferred_city_id);
    }
  }, [cities, userProfile]);

  const loadCityData = useCallback(async (cityId) => {
    if (!cityId) return;
    setLoading(true);
    try {
      const [sumRes, weatherRes, stationRes] = await Promise.all([
        fetch(`/api/aqi/cities/${cityId}/summary`),
        fetch(`/api/aqi/cities/${cityId}/weather`),
        fetch(`/api/aqi/cities/${cityId}/stations`),
      ]);
      if (sumRes.ok) { const d = await sumRes.json(); setSummary(d); }
      if (weatherRes.ok) { const d = await weatherRes.json(); setWeather(d); }
      if (stationRes.ok) { const d = await stationRes.json(); setStations(d); }
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to load city data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCityData(selectedCityId);
  }, [selectedCityId]);

  // Apply live Socket.IO updates to stations list
  const enrichedStations = stations.map((s) => {
    const live = liveUpdates[s.id];
    if (!live) return s;
    return { ...s, aqi: live.aqi, pm25: live.pm25, pm10: live.pm10, health_category: live.health_category };
  });

  const aqi = summary?.aqi ?? null;
  const category = aqi != null ? classifyAQI(aqi) : 'Unknown';
  const color = getAQIColor(category);
  const cityName = cities.find((c) => c.id === selectedCityId)?.display_name || '—';

  // Aggregate pollutants from stations
  const pollutantAvg = {};
  if (enrichedStations.length > 0) {
    ['pm25', 'pm10', 'no2', 'o3', 'co', 'so2'].forEach((p) => {
      const vals = enrichedStations.map((s) => s[p]).filter((v) => v != null && v > 0);
      pollutantAvg[p] = vals.length ? vals.reduce((a, b) => a + b) / vals.length : null;
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 light:bg-gray-50 text-white dark:text-white light:text-gray-900">
      {/* City Header */}
      <div
        className="px-4 py-5 border-b border-gray-800 dark:border-gray-800 light:border-gray-200"
        style={{ background: `linear-gradient(135deg, ${color.hex}18 0%, transparent 60%)` }}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{cityName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {enrichedStations.filter((s) => s.aqi != null).length} of {enrichedStations.length} stations reporting
              {lastUpdated && (
                <span className="ml-2">· {t('dashboard.lastUpdated')} {lastUpdated.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CitySelector cities={cities} selected={selectedCityId} onChange={setSelectedCityId} />
            {/* Location detect button */}
            <button
              onClick={detectAndSelectCity}
              disabled={locationDetecting || !cities.length}
              title={t('dashboard.detectLocation')}
              className="p-2 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 hover:border-blue-500 text-gray-300 hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {locationDetecting ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            </button>
            <button
              onClick={() => loadCityData(selectedCityId)}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 hover:border-gray-400 text-gray-300 hover:text-white transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Top row: Gauge + Health + Weather */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AQI Gauge Card */}
          <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-xl border border-gray-700 dark:border-gray-700 light:border-gray-200 p-5 flex flex-col items-center gap-3">
            {loading && !aqi ? (
              <SkeletonGauge />
            ) : (
              <>
                <AQIGauge aqi={aqi} category={category} size={150} />
                <div className="text-center">
                  <p className="text-xs text-gray-400">
                    Avg of {enrichedStations.filter((s) => s.aqi != null).length} stations
                  </p>
                  {summary?.station_count > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Radio size={10} className="text-green-400 animate-pulse" />
                      <span className="text-xs text-green-400">{t('dashboard.live')}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Health Insight */}
          <div className="md:col-span-2">
            {loading && !summary ? <SkeletonCard lines={5} /> : <HealthInsightCard aqi={aqi} />}
          </div>
        </div>

        {/* Weather + Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading && !weather ? (
            <>
              <SkeletonCard lines={4} />
              <SkeletonCard lines={4} />
            </>
          ) : (
            <>
              <WeatherCard weather={weather} />
              <ForecastChart forecastJson={weather?.forecast_aqi_24h} />
            </>
          )}
        </div>

        {/* Year-over-Year Insight */}
        {selectedCityId && <YoYInsightCard cityId={selectedCityId} />}

        {/* Pollutant bars */}
        <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-xl border border-gray-700 dark:border-gray-700 light:border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{t('dashboard.pollutants')}</h3>
            <PollutantTabBar cityId={selectedCityId} />
          </div>
          {loading && !enrichedStations.length ? (
            <SkeletonCard lines={3} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(POLLUTANT_META).map(([key, meta]) => (
                <PollutantBar
                  key={key}
                  label={meta.label}
                  unit={meta.unit}
                  value={pollutantAvg[key]}
                  safe={meta.safe}
                  warn={meta.warn}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stations list */}
        <div className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-xl border border-gray-700 dark:border-gray-700 light:border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-3">
            {t('dashboard.stations')} — {cityName}
          </h3>
          {loading && enrichedStations.length === 0 ? (
            <SkeletonList count={6} />
          ) : enrichedStations.length === 0 ? (
            <p className="text-xs text-gray-500">No station data yet. Pipeline refreshes every 15 min.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {enrichedStations.map((s) => {
                const cat = s.aqi != null ? classifyAQI(s.aqi) : 'Unknown';
                const col = getAQIColor(cat);
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/heatmap?station=${s.id}`)}
                    className="flex items-center gap-3 bg-gray-800 dark:bg-gray-800 light:bg-gray-50 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-100 rounded-lg px-3 py-2.5 text-left transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: col.hex }}
                    >
                      {s.aqi != null ? Math.round(s.aqi) : '—'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{s.station_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{cat}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
