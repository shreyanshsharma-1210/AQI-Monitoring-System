import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Thermometer, Wind, Droplets, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

// ── AQI colour helper ─────────────────────────────────────────────────────────
const aqiMeta = (aqi) => {
  if (aqi == null) return { colour: '#6b7280', label: '—' };
  if (aqi <= 50)  return { colour: '#22c55e', label: 'Good' };
  if (aqi <= 100) return { colour: '#a3e635', label: 'Moderate' };
  if (aqi <= 150) return { colour: '#facc15', label: 'USG' };
  if (aqi <= 200) return { colour: '#f97316', label: 'Unhealthy' };
  if (aqi <= 300) return { colour: '#ef4444', label: 'Very Unhealthy' };
  return { colour: '#7c3aed', label: 'Hazardous' };
};

// ── Single row card ───────────────────────────────────────────────────────────
function RankRow({ rank, row, tab }) {
  const isAQI  = tab === 'polluted' || tab === 'cleanest';
  const isTemp = tab === 'hottest'  || tab === 'coldest';
  const { colour, label } = aqiMeta(row.aqi);

  const primaryValue = isTemp
    ? `${row.temp != null ? row.temp.toFixed(1) : '—'}°C`
    : `${row.aqi ?? '—'} AQI`;

  const primaryColour = isAQI ? colour : (row.temp > 35 ? '#f97316' : row.temp < 15 ? '#60a5fa' : '#22c55e');

  const rankStyle = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-100 dark:border-transparent rounded-xl px-4 py-3 transition-colors shadow-sm">
      {/* Rank */}
      <span className={`text-sm font-bold w-6 text-center shrink-0 ${rankStyle}`}>{rank}</span>

      {/* City */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.city}</p>
        <p className="text-xs text-gray-400">{row.country_code}</p>
      </div>

      {/* Secondary stats */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
        {isTemp && row.aqi != null && (
          <span>
            AQI <span style={{ color: colour }}>{Math.round(row.aqi)}</span>
          </span>
        )}
        {isAQI && row.temp != null && (
          <span className="flex items-center gap-1">
            <Thermometer size={12} />
            {row.temp.toFixed(1)}°C
          </span>
        )}
        {row.humidity != null && (
          <span className="flex items-center gap-1">
            <Droplets size={12} />
            {row.humidity}%
          </span>
        )}
        {row.wind_speed != null && (
          <span className="flex items-center gap-1">
            <Wind size={12} />
            {row.wind_speed.toFixed(1)} km/h
          </span>
        )}
      </div>

      {/* Primary value badge */}
      <div
        className="text-sm font-bold px-2.5 py-1 rounded-lg shrink-0"
        style={{ color: primaryColour, backgroundColor: `${primaryColour}1a` }}
      >
        {primaryValue}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Rankings() {
  const { t } = useTranslation();
  const { liveUpdates } = useStore();

  const TABS = [
    { key: 'hottest',  label: t('rankings.hottest'),  field: 'temp', sort: 'desc' },
    { key: 'coldest',  label: t('rankings.coldest'),  field: 'temp', sort: 'asc'  },
    { key: 'polluted', label: t('rankings.polluted'), field: 'aqi',  sort: 'desc' },
    { key: 'cleanest', label: t('rankings.cleanest'), field: 'aqi',  sort: 'asc'  },
  ];

  const [weatherRows, setWeatherRows] = useState([]);
  const [aqiRows,     setAqiRows]     = useState([]);
  const [activeTab,   setActiveTab]   = useState('hottest');
  const [loading,     setLoading]     = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch('/api/rankings/weather'),
        fetch('/api/rankings/aqi'),
      ]);
      if (wRes.ok) setWeatherRows(await wRes.json());
      if (aRes.ok) setAqiRows(await aRes.json());
      setLastFetched(new Date());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Merge live Socket.IO updates into rows so rankings stay fresh
  const mergedWeather = useMemo(() => {
    if (!Object.keys(liveUpdates).length) return weatherRows;
    return weatherRows.map((r) => {
      const live = liveUpdates[r.city_id];
      if (!live) return r;
      return { ...r, aqi: live.aqi ?? r.aqi, temp: live.temp ?? r.temp };
    });
  }, [weatherRows, liveUpdates]);

  const mergedAqi = useMemo(() => {
    if (!Object.keys(liveUpdates).length) return aqiRows;
    return aqiRows.map((r) => {
      const live = liveUpdates[r.city_id];
      if (!live) return r;
      return { ...r, aqi: live.aqi ?? r.aqi };
    });
  }, [aqiRows, liveUpdates]);

  // Active sorted list
  const displayRows = useMemo(() => {
    const tabCfg = TABS.find((tab) => tab.key === activeTab);
    if (!tabCfg) return [];

    const source = tabCfg.field === 'temp' ? mergedWeather : mergedAqi;
    const sorted = [...source].sort((a, b) => {
      const av = a[tabCfg.field] ?? -Infinity;
      const bv = b[tabCfg.field] ?? -Infinity;
      return tabCfg.sort === 'desc' ? bv - av : av - bv;
    });
    return sorted;
  }, [activeTab, mergedWeather, mergedAqi]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            <h1 className="text-lg font-bold">{t('rankings.title')}</h1>
            {lastFetched && (
              <span className="text-xs text-gray-400 ml-2">
                · {t('rankings.updated')} {lastFetched.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-400 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort direction hint */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {TABS.find((tab) => tab.key === activeTab)?.sort === 'desc'
            ? <><ArrowDown size={11} /> {t('common.highestFirst')}</>
            : <><ArrowUp size={11} /> {t('common.lowestFirst')}</>}
          <span>· {displayRows.length} {t('common.cities')}</span>
        </div>

        {/* Rows */}
        {loading && displayRows.length === 0 ? (
          <div className="py-16 text-center text-gray-400">{t('rankings.loading')}</div>
        ) : displayRows.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {t('rankings.noData')}
          </div>
        ) : (
          <div className="space-y-2">
            {displayRows.map((row, i) => (
              <RankRow key={row.city_id ?? i} rank={i + 1} row={row} tab={activeTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
