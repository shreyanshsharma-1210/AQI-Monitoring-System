import React from 'react';
import { useTranslation } from 'react-i18next';
import { Thermometer, Droplets, Wind as WindIcon, Sun, CloudRain } from 'lucide-react';

function Stat({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={18} className="text-blue-500 dark:text-blue-400" />
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value != null ? `${value}${unit}` : '—'}</span>
    </div>
  );
}

export default function WeatherCard({ weather }) {
  const { t } = useTranslation();
  if (!weather) {
    return <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-pulse h-28" />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('weather.title')}</h3>
      <div className="grid grid-cols-5 gap-2">
        <Stat icon={Thermometer} label={t('weather.temp')} value={Math.round(weather.temp)} unit="°C" />
        <Stat icon={Thermometer} label={t('weather.feels')} value={Math.round(weather.feels_like)} unit="°C" />
        <Stat icon={Droplets} label={t('weather.humidity')} value={weather.humidity} unit="%" />
        <Stat icon={WindIcon} label={t('weather.wind')} value={Math.round(weather.wind_speed)} unit=" km/h" />
        <Stat icon={Sun} label={t('weather.uv')} value={weather.uv_index?.toFixed(1)} unit="" />
      </div>
      {weather.precip_prob > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-300">
          <CloudRain size={13} />
          {weather.precip_prob}% {t('weather.chanceOfRain')}
        </div>
      )}
    </div>
  );
}
