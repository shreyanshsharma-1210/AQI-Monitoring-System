import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';

/**
 * YoYInsightCard — displays a plain-English year-over-year AQI comparison
 * for the current city and today's calendar date.
 *
 * Only renders when at least 2 years of data are present.
 * Placed on the Dashboard between the AQI gauge row and the weather row.
 */
export default function YoYInsightCard({ cityId }) {
  const { t } = useTranslation();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) return;
    const today = new Date();
    const month = today.getMonth() + 1;
    const day   = today.getDate();

    setLoading(true);
    fetch(`/api/aqi/cities/${cityId}/yoy-insight`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cityId]);

  // Don't show if still loading, no data, or insufficient years
  if (loading || !data || !data.insight) return null;

  const { insight, years_data, current_rank, worst, best } = data;
  const totalYears = years_data?.length ?? 0;
  if (totalYears < 2) return null;

  // Determine trend icon
  const TrendIcon =
    current_rank === 1 ? TrendingDown :
    current_rank === totalYears ? TrendingUp :
    Minus;

  const trendColour =
    current_rank === 1 ? '#ef4444' :
    current_rank === totalYears ? '#22c55e' :
    '#facc15';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${trendColour}1a` }}
        >
          <TrendIcon size={18} style={{ color: trendColour }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={12} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
              {t('yoy.title')}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{insight}</p>
        </div>
      </div>

      {/* Sparkline: compact bar chart of same-day AQI per year */}
      {years_data && years_data.length > 0 && (
        <div className="mt-3 flex items-end gap-1 h-10">
          {[...years_data]
            .sort((a, b) => a.year - b.year)
            .map(({ year, aqi }) => {
              const maxAqi = Math.max(...years_data.map((d) => d.aqi || 0));
              const pct    = maxAqi > 0 ? Math.max(10, (aqi / maxAqi) * 100) : 10;
              const isWorst = worst && year === worst.year;
              const isBest  = best  && year === best.year;
              const colour  = isWorst ? '#ef4444' : isBest ? '#22c55e' : '#60a5fa';

              return (
                <div key={year} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div
                    className="w-full rounded-sm transition-all duration-500"
                    style={{ height: `${pct}%`, backgroundColor: colour, opacity: 0.8 }}
                  />
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-none">{year}</span>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-white dark:bg-gray-700 border border-gray-200 dark:border-transparent text-xs text-gray-800 dark:text-white px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                    {year}: AQI {aqi ?? '—'}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
