import React from 'react';
import { Thermometer, Droplets, Wind as WindIcon, Sun, CloudRain } from 'lucide-react';

function Stat({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={18} className="text-blue-400" />
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value != null ? `${value}${unit}` : '—'}</span>
    </div>
  );
}

export default function WeatherCard({ weather }) {
  if (!weather) {
    return <div className="bg-gray-800 rounded-xl p-4 animate-pulse h-28" />;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-3">Current Weather</h3>
      <div className="grid grid-cols-5 gap-2">
        <Stat icon={Thermometer} label="Temp" value={Math.round(weather.temp)} unit="°C" />
        <Stat icon={Thermometer} label="Feels" value={Math.round(weather.feels_like)} unit="°C" />
        <Stat icon={Droplets} label="Humidity" value={weather.humidity} unit="%" />
        <Stat icon={WindIcon} label="Wind" value={Math.round(weather.wind_speed)} unit=" km/h" />
        <Stat icon={Sun} label="UV" value={weather.uv_index?.toFixed(1)} unit="" />
      </div>
      {weather.precip_prob > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-300">
          <CloudRain size={13} />
          {weather.precip_prob}% chance of rain
        </div>
      )}
    </div>
  );
}
