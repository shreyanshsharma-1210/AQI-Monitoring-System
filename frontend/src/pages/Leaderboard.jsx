import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, RefreshCw, Medal } from 'lucide-react';
import useStore from '../store/useStore';
import { SkeletonList } from '../components/LoadingSkeleton';

// ── Level colours ─────────────────────────────────────────────────────────────
const levelColour = (lvl) => {
  if (lvl >= 9)  return '#f59e0b'; // gold
  if (lvl >= 7)  return '#8b5cf6'; // purple
  if (lvl >= 5)  return '#3b82f6'; // blue
  if (lvl >= 3)  return '#22c55e'; // green
  return '#6b7280';                // gray
};

// ── Single leaderboard row ────────────────────────────────────────────────────
function LeaderRow({ entry, currentUserId }) {
  const isSelf = entry.user_id === currentUserId;
  const rankStyle =
    entry.rank === 1 ? 'text-yellow-400' :
    entry.rank === 2 ? 'text-gray-300'   :
    entry.rank === 3 ? 'text-amber-600'  : 'text-gray-500';

  return (
    <div className={`
      flex items-center gap-3 rounded-xl px-4 py-3 transition-colors
      ${isSelf
        ? 'bg-blue-600/20 border border-blue-500/40'
        : 'bg-gray-800 dark:bg-gray-800 light:bg-gray-50 border border-transparent hover:border-gray-700'}
    `}>
      {/* Rank */}
      <span className={`text-sm font-bold w-7 text-center shrink-0 ${rankStyle}`}>
        {entry.rank <= 3
          ? ['🥇','🥈','🥉'][entry.rank - 1]
          : entry.rank}
      </span>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white dark:text-white light:text-gray-900 truncate">
          {entry.username}
          {isSelf && <span className="ml-1 text-xs text-blue-400">(you)</span>}
        </p>
        <p className="text-xs text-gray-400">{entry.level_name}</p>
      </div>

      {/* Streak */}
      {entry.streak_days > 0 && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-orange-400">
          🔥 {entry.streak_days}d
        </div>
      )}

      {/* Points badge */}
      <div
        className="text-sm font-bold px-2.5 py-1 rounded-lg shrink-0"
        style={{
          color: levelColour(entry.level),
          backgroundColor: `${levelColour(entry.level)}1a`,
        }}
      >
        {entry.points.toLocaleString()} pts
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const { t } = useTranslation();
  const { cities, userProfile, gamification } = useStore();
  const [activeTab, setActiveTab] = useState('global');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const currentUserId = userProfile?.id || null;
  const preferredCityId = userProfile?.preferred_city_id || null;

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setRows([]);
    try {
      const url =
        activeTab === 'city' && preferredCityId
          ? `/api/gamification/leaderboard/city/${preferredCityId}`
          : '/api/gamification/leaderboard';
      const res = await fetch(url);
      if (res.ok) setRows(await res.json());
      setLastFetched(new Date());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [activeTab, preferredCityId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const preferredCity = cities.find((c) => c.id === preferredCityId);

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 light:bg-gray-50 text-white dark:text-white light:text-gray-900">
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-800 dark:border-gray-800 light:border-gray-200 bg-gray-900 dark:bg-gray-900 light:bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <h1 className="text-lg font-bold">{t('leaderboard.title')}</h1>
            {lastFetched && (
              <span className="text-xs text-gray-500 ml-2">
                · {lastFetched.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-800 dark:bg-gray-800 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 hover:border-gray-500 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* My stats snippet */}
        {gamification && (
          <div className="rounded-xl bg-blue-600/10 border border-blue-500/30 px-4 py-3 flex items-center gap-4">
            <Medal size={18} className="text-yellow-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{gamification.level_name}</p>
              <p className="text-xs text-gray-400">Level {gamification.level}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-400">{gamification.points}</p>
              <p className="text-xs text-gray-400">points</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${activeTab === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-800 dark:bg-gray-800 light:bg-gray-200 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-gray-700'}`}
          >
            🌍 {t('leaderboard.global')}
          </button>
          <button
            onClick={() => setActiveTab('city')}
            disabled={!preferredCityId}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${activeTab === 'city' ? 'bg-blue-600 text-white' : 'bg-gray-800 dark:bg-gray-800 light:bg-gray-200 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-gray-700'}
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            🏙️ {preferredCity ? preferredCity.display_name : t('leaderboard.city')}
          </button>
        </div>

        {/* Rows */}
        {loading ? (
          <SkeletonList count={10} />
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            {t('leaderboard.noUsers')}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((entry) => (
              <LeaderRow key={entry.user_id} entry={entry} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
