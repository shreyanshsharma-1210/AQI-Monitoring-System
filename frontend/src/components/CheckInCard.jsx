import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, CheckCircle, CalendarCheck } from 'lucide-react';

/**
 * Daily Check-In card.
 * Props:
 *   userId: string — the local user ID
 *   stats: gamification stats object from API (may be null initially)
 *   onCheckin: (updatedStats) => void
 */
export default function CheckInCard({ userId, stats, onCheckin }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const checkedInToday = stats?.checked_in_today === true;

  const handleCheckIn = async () => {
    if (!userId || checkedInToday || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gamification/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.badges_earned?.length) {
          setNotification(`🏅 New badge${data.badges_earned.length > 1 ? 's' : ''}: ${data.badges_earned.join(', ')}`);
          setTimeout(() => setNotification(null), 4000);
        }
        onCheckin?.(data);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const streak = stats?.streak_days ?? 0;
  const totalCheckins = stats?.total_checkins ?? 0;

  return (
    <div className="rounded-xl border p-4 mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">{t('checkin.title')}</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 text-xs text-orange-400">
            <Flame size={13} />
            <span>{streak} {t('checkin.dayStreak')}</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-center mb-3">
        <div className="flex-1">
          <p className="text-xl font-bold text-orange-400">{streak}</p>
          <p className="text-xs text-gray-400">{t('profile.streak')}</p>
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold text-blue-400">{totalCheckins}</p>
          <p className="text-xs text-gray-400">{t('profile.totalCheckins')}</p>
        </div>
      </div>

      {/* Badge notification */}
      {notification && (
        <div className="text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-lg px-3 py-1.5 mb-2 text-center">
          {notification}
        </div>
      )}

      {/* Button */}
      <button
        onClick={handleCheckIn}
        disabled={checkedInToday || loading || !userId}
        className={`
          w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all
          ${checkedInToday
            ? 'bg-green-600/30 text-green-400 border border-green-600/40 cursor-default'
            : !userId
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'}
        `}
      >
        {checkedInToday
          ? <><CheckCircle size={15} /> {t('profile.checkedIn')}</>
          : loading
            ? t('checkin.checkingIn')
            : t('profile.checkIn')}
      </button>
    </div>
  );
}
