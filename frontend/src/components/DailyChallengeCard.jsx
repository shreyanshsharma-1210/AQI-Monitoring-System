import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Daily Challenge card showing today's 3 challenges.
 * Props:
 *   userId: string — the local user ID (optional, for completion tracking)
 *   onComplete: (pts) => void — called when a challenge is completed
 */
export default function DailyChallengeCard({ userId, onComplete }) {
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const url = userId
        ? `/api/gamification/challenges?user_id=${encodeURIComponent(userId)}`
        : '/api/gamification/challenges';
      const res = await fetch(url);
      if (res.ok) setChallenges(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [userId]);

  const handleComplete = async (challenge) => {
    if (!userId || challenge.completed || completing) return;
    setCompleting(challenge.id);
    try {
      const res = await fetch(`/api/gamification/challenges/${challenge.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges((prev) =>
          prev.map((c) => (c.id === challenge.id ? { ...c, completed: true } : c))
        );
        onComplete?.(data.points_earned);
      }
    } catch { /* silent */ } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Star size={15} className="text-yellow-400" />
        <span className="text-sm font-semibold">{t('challenges.title')}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{t('challenges.subtitle')}</p>

      {loading ? (
        <p className="text-xs text-gray-500 text-center py-4">{t('challenges.loading')}</p>
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            <div
              key={c.id}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors
                ${c.completed
                  ? 'bg-green-600/15 border border-green-600/30'
                  : 'bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600/40 hover:border-gray-300 dark:hover:border-gray-500/60'}
              `}
            >
              {/* Icon */}
              <div className={`shrink-0 ${c.completed ? 'text-green-400' : 'text-gray-500'}`}>
                {c.completed ? <CheckCircle2 size={16} /> : <Star size={16} />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${c.completed ? 'text-green-400 dark:text-green-300' : 'text-gray-700 dark:text-gray-200'}`}>
                  {c.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{c.description}</p>
              </div>

              {/* Points badge + button */}
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-yellow-400 font-semibold">+{c.points_reward}</span>
                {!c.completed && userId && (
                  <button
                    onClick={() => handleComplete(c)}
                    disabled={completing === c.id}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-md px-2 py-0.5 transition-colors disabled:opacity-50"
                  >
                    {completing === c.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : t('challenges.complete')}
                  </button>
                )}
                {c.completed && (
                  <span className="text-xs text-green-400">{t('challenges.completed')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
