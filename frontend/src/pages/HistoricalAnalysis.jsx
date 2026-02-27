import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { CalendarDays, TrendingUp, Moon, Sun, ArrowLeft } from 'lucide-react';
import useStore from '../store/useStore';
import CitySelector from '../components/CitySelector';

// One distinct colour per year
const YEAR_COLOURS = ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb923c'];

// AQI category colour helpers
const aqiColour = (aqi) => {
  if (aqi == null) return '#6b7280';
  if (aqi <= 50)  return '#22c55e';
  if (aqi <= 100) return '#a3e635';
  if (aqi <= 150) return '#facc15';
  if (aqi <= 200) return '#f97316';
  if (aqi <= 300) return '#ef4444';
  return '#7c3aed';
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, colour }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold" style={{ color: colour || '#1e293b' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-blue-500 dark:text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function AQITooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-xs space-y-1 shadow-xl">
      <p className="text-gray-700 dark:text-gray-300 font-medium">Day {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoricalAnalysis() {
  const { t, i18n } = useTranslation();
  const navigate  = useNavigate();
  const { cities, setCities, selectedCityId, setSelectedCityId } = useStore();

  const [selectedMonth,  setSelectedMonth]  = useState(new Date().getMonth() + 1);
  const [selectedYears,  setSelectedYears]  = useState(new Set());
  const [availableYears, setAvailableYears] = useState([]);

  const [monthlyData, setMonthlyData] = useState([]);
  const [dayNightData, setDayNightData] = useState([]);
  const [rangeStats,  setRangeStats]  = useState(null);
  const [rangeStart,  setRangeStart]  = useState('');
  const [rangeEnd,    setRangeEnd]    = useState('');
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [loadingDN,      setLoadingDN]      = useState(false);
  const [loadingRange,   setLoadingRange]   = useState(false);

  // Load cities once
  useEffect(() => {
    if (cities.length === 0) {
      fetch('/api/aqi/cities').then((r) => r.json()).then(setCities).catch(() => {});
    }
  }, []);

  // Fetch available years whenever city changes
  useEffect(() => {
    if (!selectedCityId) return;
    fetch(`/api/history/city/${selectedCityId}/years`)
      .then((r) => r.json())
      .then((years) => {
        setAvailableYears(years);
        // Default: select all years
        setSelectedYears(new Set(years));
      })
      .catch(() => {});
  }, [selectedCityId]);

  // Fetch monthly data whenever city, month or year selection changes
  const fetchMonthly = useCallback(() => {
    if (!selectedCityId) return;
    setLoadingMonthly(true);
    fetch(`/api/history/city/${selectedCityId}/monthly?month=${selectedMonth}`)
      .then((r) => r.json())
      .then(setMonthlyData)
      .catch(() => setMonthlyData([]))
      .finally(() => setLoadingMonthly(false));
  }, [selectedCityId, selectedMonth]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  // Fetch day/night trend
  const fetchDayNight = useCallback(() => {
    if (!selectedCityId) return;
    setLoadingDN(true);
    fetch(`/api/history/city/${selectedCityId}/daynight`)
      .then((r) => r.json())
      .then(setDayNightData)
      .catch(() => setDayNightData([]))
      .finally(() => setLoadingDN(false));
  }, [selectedCityId]);

  useEffect(() => {
    fetchDayNight();
  }, [fetchDayNight]);

  // Fetch range stats on demand
  const fetchRange = () => {
    if (!selectedCityId || !rangeStart || !rangeEnd) return;
    setLoadingRange(true);
    fetch(`/api/history/city/${selectedCityId}/range?start=${rangeStart}&end=${rangeEnd}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setRangeStats)
      .catch(() => setRangeStats(null))
      .finally(() => setLoadingRange(false));
  };

  // ── Transform monthly data for Recharts ────────────────────────────────────
  // Pivot: [{day: 1, 2022: 120, 2023: 145, ...}, ...]
  const chartMonthly = (() => {
    const map = {};
    for (const row of monthlyData) {
      if (!selectedYears.has(row.year)) continue;
      if (!map[row.day]) map[row.day] = { day: row.day };
      map[row.day][row.year] = row.avg_aqi;
    }
    return Object.values(map).sort((a, b) => a.day - b.day);
  })();

  const visibleYears = availableYears.filter((y) => selectedYears.has(y));

  // ── Best / worst hour from day-night data ──────────────────────────────────
  const bestHour  = dayNightData.reduce((a, b) => (!a || b.avg_aqi < a.avg_aqi) ? b : a, null);
  const worstHour = dayNightData.reduce((a, b) => (!a || b.avg_aqi > a.avg_aqi) ? b : a, null);

  const cityName = cities.find((c) => c.id === selectedCityId)?.display_name || '—';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-400" />
                {t('history.title')}
              </h1>
              <p className="text-xs text-gray-400">{cityName}</p>
            </div>
          </div>
          <CitySelector cities={cities} selected={selectedCityId} onChange={setSelectedCityId} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Section 1: Year-over-Year Monthly Chart ── */}
        <Section title={t('history.yoyComparison')} icon={TrendingUp}>
          {/* Month selector */}
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const mn = i + 1;
              const monthLabel = new Intl.DateTimeFormat(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' }).format(new Date(2024, i, 1));
              return (
                <button
                  key={mn}
                  onClick={() => setSelectedMonth(mn)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                    ${selectedMonth === mn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>

          {/* Year toggles */}
          {availableYears.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableYears.map((y, i) => {
                const on = selectedYears.has(y);
                return (
                  <button
                    key={y}
                    onClick={() => {
                      setSelectedYears((prev) => {
                        const next = new Set(prev);
                        on ? next.delete(y) : next.add(y);
                        return next;
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                      ${on ? 'border-transparent text-white' : 'border-gray-600 text-gray-400 bg-transparent'}`}
                    style={on ? { backgroundColor: YEAR_COLOURS[i % YEAR_COLOURS.length] } : {}}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart */}
          {loadingMonthly ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">{t('history.loading')}</div>
          ) : chartMonthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              {t('history.noMonthData', { month: new Intl.DateTimeFormat(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long' }).format(new Date(2024, selectedMonth - 1, 1)) })}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartMonthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <Tooltip content={<AQITooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                {visibleYears.map((y, i) => (
                  <Line
                    key={y}
                    type="monotone"
                    dataKey={y}
                    name={String(y)}
                    stroke={YEAR_COLOURS[i % YEAR_COLOURS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* ── Section 2: Day / Night Trend ── */}
        <Section title={t('history.dayNightTitle')} icon={Sun}>
          {/* Best / worst hour stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label={t('history.bestHour')}
              value={bestHour ? `${bestHour.hour}:00` : '—'}
              sub={bestHour ? `AQI ${bestHour.avg_aqi}` : ''}
              colour="#22c55e"
            />
            <StatCard
              label={t('history.worstHour')}
              value={worstHour ? `${worstHour.hour}:00` : '—'}
              sub={worstHour ? `AQI ${worstHour.avg_aqi}` : ''}
              colour="#ef4444"
            />
            <StatCard
              label={t('history.dayAvg')}
              value={
                (() => {
                  const d = dayNightData.filter((r) => r.period === 'day');
                  if (!d.length) return null;
                  return Math.round(d.reduce((acc, r) => acc + r.avg_aqi, 0) / d.length);
                })()
              }
              colour="#facc15"
            />
            <StatCard
              label={t('history.nightAvg')}
              value={
                (() => {
                  const n = dayNightData.filter((r) => r.period === 'night');
                  if (!n.length) return null;
                  return Math.round(n.reduce((acc, r) => acc + r.avg_aqi, 0) / n.length);
                })()
              }
              colour="#818cf8"
            />
          </div>

          {loadingDN ? (
            <div className="h-40 flex items-center justify-center text-gray-500 text-sm">{t('history.loading')}</div>
          ) : dayNightData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
              {t('history.noHourlyData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayNightData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <Tooltip
                  formatter={(v, n, p) => [v, 'Avg AQI']}
                  labelFormatter={(h) => `${h}:00 — ${h >= 6 && h <= 17 ? 'Day' : 'Night'}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="avg_aqi" radius={[3, 3, 0, 0]}>
                  {dayNightData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.period === 'day' ? '#fbbf24' : '#818cf8'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend hint */}
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />
              {t('history.dayLegend')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" />
              {t('history.nightLegend')}
            </span>
          </div>
        </Section>

        {/* ── Section 3: Custom Date Range ── */}
        <Section title={t('history.rangeTitle')} icon={CalendarDays}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">{t('history.startDate')}</label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">{t('history.endDate')}</label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchRange}
              disabled={!rangeStart || !rangeEnd || loadingRange}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
            {loadingRange ? t('history.loading') : t('history.analyse')}
            </button>
          </div>

          {rangeStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <StatCard label={t('history.minAQI')} value={rangeStats.min_aqi} colour={aqiColour(rangeStats.min_aqi)} />
              <StatCard label={t('history.avgAQI')} value={rangeStats.avg_aqi} colour={aqiColour(rangeStats.avg_aqi)} />
              <StatCard label={t('history.maxAQI')} value={rangeStats.max_aqi} colour={aqiColour(rangeStats.max_aqi)} />
              <StatCard
                label={t('history.from')}
                value={rangeStats.recorded_min_at ? new Date(rangeStats.recorded_min_at).toLocaleDateString() : '—'}
                sub={t('history.earliest')}
              />
              <StatCard
                label={t('history.to')}
                value={rangeStats.recorded_max_at ? new Date(rangeStats.recorded_max_at).toLocaleDateString() : '—'}
                sub={t('history.latest')}
              />
              <StatCard
                label={t('history.dataPoints')}
                value={rangeStats.data_points?.toLocaleString()}
                sub={t('history.totalRecords')}
              />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
