import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Star, Flame, CheckCircle, Settings, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
import CheckInCard from '../components/CheckInCard';
import DailyChallengeCard from '../components/DailyChallengeCard';
import { SkeletonCard } from '../components/LoadingSkeleton';

// ── Level colours ──────────────────────────────────────────────────────────────
const levelColour = (lvl) => {
  if (lvl >= 9)  return '#f59e0b';
  if (lvl >= 7)  return '#8b5cf6';
  if (lvl >= 5)  return '#3b82f6';
  if (lvl >= 3)  return '#22c55e';
  return '#6b7280';
};

// ── Progress bar toward next level ────────────────────────────────────────────
function LevelProgress({ points, nextLevel }) {
  if (!nextLevel) return <p className="text-xs text-yellow-400 text-center">Max Level!</p>;
  const pct = Math.min((points / nextLevel.threshold) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{points} pts</span>
        <span>{nextLevel.threshold} pts → {nextLevel.name}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }}
        />
      </div>
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const {
    cities, userProfile, setUserProfile,
    gamification, refreshGamification,
    language, setLanguage,
  } = useStore();

  // ── Derive user ID from profile ─────────────────────────────────────────────
  const userId = userProfile?.id || null;

  // ── Settings state ──────────────────────────────────────────────────────────
  const [cityId, setCityId] = useState(userProfile?.preferred_city_id?.toString() || '');
  const [selectedLang, setSelectedLang] = useState(language);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  // ── Badges tab ──────────────────────────────────────────────────────────────
  const [badgeTab, setBadgeTab] = useState('earned');

  // ── Auto-refresh gamification on mount ─────────────────────────────────────
  useEffect(() => {
    if (userId) refreshGamification(userId);
  }, [userId]);

  // ── Sync language picker with store ────────────────────────────────────────
  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  // ── Ensure user profile exists ─────────────────────────────────────────────
  const ensureUser = useCallback(async () => {
    if (userId) return userId;
    // Auto-generate a local user ID and register it
    const id = `user-${Date.now()}`;
    const email = `${id}@aqi-local.app`;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email, preferred_city_id: null, language: 'en' }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        return data.id;
      }
    } catch { /* silent */ }
    return null;
  }, [userId, setUserProfile]);

  // ── Handle check-in ────────────────────────────────────────────────────────
  const handleCheckin = useCallback(async (checkinData) => {
    if (userId) await refreshGamification(userId);
  }, [userId, refreshGamification]);

  // ── Handle challenge complete ──────────────────────────────────────────────
  const handleChallengeComplete = useCallback(async () => {
    if (userId) await refreshGamification(userId);
  }, [userId, refreshGamification]);

  // ── Save settings ──────────────────────────────────────────────────────────
  const saveSettings = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    let uid = userId;
    if (!uid) {
      uid = await ensureUser();
      if (!uid) { setSaveStatus('idle'); return; }
    }

    // Apply language immediately
    if (selectedLang !== language) setLanguage(selectedLang);

    try {
      const res = await fetch(`/api/users/profile/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_city_id: cityId ? parseInt(cityId) : null,
          language: selectedLang,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile({ ...userProfile, ...data });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
    } catch {
      setSaveStatus('idle');
    }
  };

  // ── Aliases ─────────────────────────────────────────────────────────────────
  const g = gamification;
  const allBadges = g?.all_badges || [];
  const earnedBadges = allBadges.filter((b) => b.earned);
  const lockedBadges = allBadges.filter((b) => !b.earned);

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950 light:bg-gray-50 text-white dark:text-white light:text-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Hero stats ── */}
        {g ? (
          <div
            className="rounded-2xl p-5 border"
            style={{
              backgroundColor: `${levelColour(g.level)}0d`,
              borderColor:     `${levelColour(g.level)}40`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-800 dark:bg-gray-800 light:bg-gray-200 flex items-center justify-center">
                <User size={22} className="text-gray-300 dark:text-gray-300 light:text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200 dark:text-gray-200 light:text-gray-700">
                  {userProfile?.email || 'Guest User'}
                </p>
                <p className="text-xs font-bold" style={{ color: levelColour(g.level) }}>
                  {g.level_name} · Level {g.level}
                </p>
              </div>
            </div>

            {/* Points / Streak / Check-ins row */}
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              {[
                { label: t('profile.points'),       value: g.points,        icon: '⭐' },
                { label: t('profile.streak'),        value: `${g.streak_days}d`, icon: '🔥' },
                { label: t('profile.totalCheckins'), value: g.total_checkins, icon: '📅' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-xl bg-gray-800/60 dark:bg-gray-800/60 light:bg-white/80 border border-gray-700/40 dark:border-gray-700/40 light:border-gray-200 p-2">
                  <p className="text-lg font-bold">{icon} {value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Level progress */}
            <LevelProgress points={g.points} nextLevel={g.next_level} />
          </div>
        ) : (
          <SkeletonCard lines={4} />
        )}

        {/* ── Check-In card ── */}
        <CheckInCard
          userId={userId}
          stats={g}
          onCheckin={handleCheckin}
        />

        {/* ── Daily challenges ── */}
        <DailyChallengeCard
          userId={userId}
          onComplete={handleChallengeComplete}
        />

        {/* ── Badges ── */}
        <div className="rounded-xl border bg-gray-800 dark:bg-gray-800 light:bg-white border-gray-700 dark:border-gray-700 light:border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={15} className="text-yellow-400" />
            <span className="text-sm font-semibold">{t('profile.badges')}</span>
            <span className="ml-auto text-xs text-gray-400">{earnedBadges.length}/{allBadges.length}</span>
          </div>

          {/* Badge tabs */}
          <div className="flex gap-2 mb-3">
            {[
              { key: 'earned', label: t('profile.earned') },
              { key: 'all',    label: t('profile.allBadges') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBadgeTab(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${badgeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-700 dark:bg-gray-700 light:bg-gray-100 text-gray-300 dark:text-gray-300 light:text-gray-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Badge grid */}
          {!g ? (
            <SkeletonCard lines={2} />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(badgeTab === 'earned' ? earnedBadges : allBadges).map((b) => (
                <div
                  key={b.key}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all
                    ${b.earned
                      ? 'bg-yellow-400/10 border-yellow-400/40'
                      : 'bg-gray-700/40 dark:bg-gray-700/40 light:bg-gray-100 border-gray-600/40 dark:border-gray-600/40 light:border-gray-200 opacity-50'}
                  `}
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <p className="text-xs font-medium leading-tight">{b.title}</p>
                  <p className="text-xs text-gray-400 leading-tight">{b.desc}</p>
                  {!b.earned && (
                    <span className="text-xs text-gray-500 mt-0.5">{t('profile.locked')}</span>
                  )}
                </div>
              ))}
              {badgeTab === 'earned' && earnedBadges.length === 0 && (
                <p className="col-span-3 text-center text-xs text-gray-500 py-4">
                  Check in to earn your first badge!
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Settings ── */}
        <div className="rounded-xl border bg-gray-800 dark:bg-gray-800 light:bg-white border-gray-700 dark:border-gray-700 light:border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings size={15} className="text-blue-400" />
            <span className="text-sm font-semibold">Settings</span>
          </div>

          <form onSubmit={saveSettings} className="space-y-3">
            {/* Preferred City */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('profile.preferredCity')}</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-700 dark:bg-gray-700 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 text-white dark:text-white light:text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a city…</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('profile.language')}</label>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-700 dark:bg-gray-700 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 text-white dark:text-white light:text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                ${saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'}
                disabled:opacity-60`}
            >
              {saveStatus === 'saving' ? t('profile.saving')
               : saveStatus === 'saved'  ? <><CheckCircle size={14} /> {t('profile.saved')}</>
               : t('profile.save')}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
