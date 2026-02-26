import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getAQIColor, classifyAQI } from '../store/useStore';
import AQIGauge from './AQIGauge';

const POLLUTANTS = [
  { key: 'aqi', label: 'AQI', unit: '' },
  { key: 'pm25', label: 'PM2.5', unit: 'μg/m³' },
  { key: 'pm10', label: 'PM10',  unit: 'μg/m³' },
  { key: 'no2',  label: 'NO₂',  unit: 'μg/m³' },
  { key: 'o3',   label: 'O₃',   unit: 'μg/m³' },
  { key: 'co',   label: 'CO',   unit: 'mg/m³' },
  { key: 'so2',  label: 'SO₂',  unit: 'μg/m³' },
];

export default function StationDetailPanel({ station, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState('aqi');

  useEffect(() => {
    if (!station?.id) return;
    setLoading(true);
    fetch(`/api/aqi/stations/${station.id}/history?limit=48`)
      .then((r) => r.json())
      .then((d) => { setHistory(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [station?.id]);

  if (!station) return null;

  const aqi = station.aqi ?? null;
  const category = aqi != null ? classifyAQI(aqi) : 'Unknown';
  const color = getAQIColor(category);

  const chartData = history.map((h) => ({
    t: h.recorded_at ? h.recorded_at.slice(11, 16) : '',
    value: h[activeKey] ?? 0,
  }));

  const latest = history[history.length - 1] || {};

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-sm font-bold text-white leading-tight">{station.station_name}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {station.lat?.toFixed(4)}, {station.lon?.toFixed(4)}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 -mt-1 -mr-1">
          <X size={18} />
        </button>
      </div>

      {/* AQI Gauge */}
      <div className="flex justify-center py-4">
        <AQIGauge aqi={aqi} category={category} size={120} />
      </div>

      {/* Pollutant table */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-1.5">
          {POLLUTANTS.slice(1).map(({ key, label, unit }) => (
            <div key={key} className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
              <div className="text-xs text-gray-400">{label}</div>
              <div className="text-sm font-semibold text-white">
                {latest[key] != null ? latest[key].toFixed(1) : '—'}
              </div>
              <div className="text-[10px] text-gray-500">{unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart tab bar */}
      <div className="px-4 pb-2 flex gap-1 flex-wrap">
        {POLLUTANTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors
              ${activeKey === key
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* History chart */}
      <div className="px-3 flex-1">
        {loading ? (
          <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
            No history yet — data arrives after first pipeline cycle
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line
                type="monotone" dataKey="value" name={activeKey.toUpperCase()}
                stroke={color.hex} strokeWidth={2} dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
