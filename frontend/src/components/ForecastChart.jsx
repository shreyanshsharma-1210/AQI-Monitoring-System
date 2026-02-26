import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getAQIColor, classifyAQI } from '../store/useStore';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const cat = classifyAQI(val);
  const color = getAQIColor(cat);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-0.5">{payload[0].payload.label}</p>
      <p className="font-bold" style={{ color: color.hex }}>AQI {val} — {cat}</p>
    </div>
  );
};

export default function ForecastChart({ forecastJson }) {
  const data = useMemo(() => {
    try {
      const arr = JSON.parse(forecastJson || '[]');
      return arr.map((val, i) => ({
        label: `+${i}h`,
        aqi: val ?? 0,
      }));
    } catch {
      return [];
    }
  }, [forecastJson]);

  if (!data.length) {
    return <div className="bg-gray-800 rounded-xl p-4 h-36 flex items-center justify-center text-gray-500 text-xs">No forecast data</div>;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-3">24h AQI Forecast</h3>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} interval={3} />
          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone" dataKey="aqi"
            stroke="#3b82f6" strokeWidth={2}
            fill="url(#aqiGrad)" dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
