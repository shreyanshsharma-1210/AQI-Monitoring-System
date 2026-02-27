import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Wind, Users } from 'lucide-react';
import { getAQIColor } from '../store/useStore';

const icons = [ShieldAlert, Wind, Users];

export default function HealthInsightCard({ aqi, age = 25, condition = 'none' }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (aqi == null) return;
    fetch(`/api/aqi/health-recommendation?aqi=${Math.round(aqi)}&age=${age}&condition=${condition}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [aqi, age, condition]);

  const color = getAQIColor(data?.risk_level === 'Low' ? 'Good'
    : data?.risk_level === 'Moderate' ? 'Moderate'
    : data?.risk_level === 'High' ? 'Unhealthy'
    : data?.risk_level === 'Very High' ? 'Very Unhealthy'
    : data?.risk_level === 'Hazardous' ? 'Hazardous'
    : 'Unknown');

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-pulse h-32" />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={16} style={{ color: color.hex }} />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('health.advisory')}</h3>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color.hex }}
        >
          {t(`health.${data.risk_level}`, t('health.risk', { level: data.risk_level }))}
        </span>
      </div>
      <ul className="space-y-1.5">
        {data.recommendations.map((rec, i) => {
          const Icon = icons[i % icons.length];
          return (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <Icon size={13} className="mt-0.5 shrink-0 text-gray-400" />
              {rec}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
