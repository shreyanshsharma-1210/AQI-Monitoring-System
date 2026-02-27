import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import useStore, { getAQIColor, classifyAQI } from '../store/useStore';
import CitySelector from '../components/CitySelector';
import PollutantTabBar from '../components/PollutantTabBar';

const META = {
  pm25: { label: 'PM2.5', unit: 'μg/m³', safe: 12,  warn: 35,  color: '#818cf8' },
  pm10: { label: 'PM10',  unit: 'μg/m³', safe: 54,  warn: 154, color: '#34d399' },
  no2:  { label: 'NO₂',  unit: 'μg/m³', safe: 53,  warn: 100, color: '#f59e0b' },
  o3:   { label: 'O₃',   unit: 'μg/m³', safe: 54,  warn: 70,  color: '#22d3ee' },
  co:   { label: 'CO',   unit: 'mg/m³', safe: 4.4, warn: 9.4, color: '#f87171' },
  so2:  { label: 'SO₂',  unit: 'μg/m³', safe: 35,  warn: 75,  color: '#a78bfa' },
  aqi:  { label: 'AQI',  unit: '',       safe: 50,  warn: 100, color: '#3b82f6' },
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-gray-400 mb-1">{payload[0]?.payload?.recorded_at?.slice(0, 16) || label}</p>
      <p className="font-semibold text-gray-900 dark:text-white">{payload[0]?.value?.toFixed(2)} {unit}</p>
    </div>
  );
};

export default function PollutantPage() {
  const { t } = useTranslation();
  const { pollutant = 'pm25', cityId } = useParams();
  const navigate = useNavigate();
  const { cities, setCities, selectedCityId, setSelectedCityId } = useStore();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const meta = META[pollutant] || META.pm25;
  const effectiveCityId = cityId ? parseInt(cityId) : selectedCityId;

  // Load cities if needed
  useEffect(() => {
    if (cities.length === 0)
      fetch('/api/aqi/cities').then((r) => r.json()).then(setCities).catch(() => {});
  }, []);

  // Sync selected city
  useEffect(() => {
    if (effectiveCityId && effectiveCityId !== selectedCityId) {
      setSelectedCityId(effectiveCityId);
    }
  }, [effectiveCityId]);

  // Fetch pollutant history
  useEffect(() => {
    if (!effectiveCityId) return;
    setLoading(true);
    setData([]);
    fetch(`/api/aqi/cities/${effectiveCityId}/pollutant/${pollutant}?limit=120`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [effectiveCityId, pollutant]);

  const cityName = cities.find((c) => c.id === effectiveCityId)?.display_name || '—';

  const avg = data.length ? data.reduce((s, d) => s + (d.value || 0), 0) / data.length : 0;
  const max = data.length ? Math.max(...data.map((d) => d.value || 0)) : 0;
  const min = data.length ? Math.min(...data.filter((d) => d.value > 0).map((d) => d.value)) : 0;

  const chartData = data.map((d) => ({
    recorded_at: d.recorded_at,
    label: d.recorded_at?.slice(11, 16) || '',
    value: d.value,
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {meta.label}
              <span className="text-gray-400 font-normal text-sm ml-2">in {cityName}</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              Safe ≤ {meta.safe} {meta.unit} · EPA warns above {meta.warn} {meta.unit}
            </p>
          </div>
          <CitySelector
            cities={cities}
            selected={effectiveCityId}
            onChange={(id) => {
              setSelectedCityId(id);
              navigate(`/city/${id}/pollutant/${pollutant}`);
            }}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Pollutant tab bar */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('history.switchPollutant')}</p>
          <PollutantTabBar cityId={effectiveCityId} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('history.average') || 'Average', value: avg },
            { label: t('history.maximum') || 'Maximum', value: max },
            { label: t('history.minimum') || 'Minimum', value: min },
          ].map(({ label, value }) => {
            const statusColor = value <= meta.safe ? '#22c55e' : value <= meta.warn ? '#facc15' : '#ef4444';
            return (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color: statusColor }}>
                  {data.length ? value.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{meta.unit}</p>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {meta.label} History (last {data.length} readings)
          </h2>
          {loading ? (
            <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ) : data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              {t('history.noPollutantData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="pollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={meta.color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  interval={Math.floor(data.length / 8)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip unit={meta.unit} />} />
                {/* Safe / warn reference lines */}
                <ReferenceLine y={meta.safe} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Safe', position: 'right', fill: '#22c55e', fontSize: 10 }} />
                <ReferenceLine y={meta.warn} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'High', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={meta.label}
                  stroke={meta.color}
                  strokeWidth={2}
                  fill="url(#pollGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
