import React from 'react';
import { getAQIColor } from '../store/useStore';

/**
 * Circular AQI gauge with colour fill and category label.
 */
export default function AQIGauge({ aqi, category, size = 140 }) {
  const color = getAQIColor(category);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // Map AQI 0-500 → 0-1 fill, clamped
  const fill = Math.min(Math.max((aqi || 0) / 500, 0), 1);
  const dash = circumference * fill;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2937" strokeWidth="12" />
        {/* Fill */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color.hex}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset={circumference * 0.25}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* AQI number */}
        <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="white">
          {aqi != null ? Math.round(aqi) : '—'}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#9ca3af">AQI</text>
      </svg>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${color.bg}`}
        style={{ backgroundColor: color.hex }}
      >
        {category || 'No Data'}
      </span>
    </div>
  );
}
