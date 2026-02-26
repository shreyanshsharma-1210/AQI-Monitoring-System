import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wind, Map, BarChart2, User, CalendarDays, Trophy, Medal, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';

export default function Navbar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { theme, toggleTheme, language, setLanguage, gamification } = useStore();

  const links = [
    { to: '/',          label: t('nav.dashboard'),   icon: Wind },
    { to: '/heatmap',   label: t('nav.heatmap'),     icon: Map },
    { to: '/pollutant/pm25', label: t('nav.pollutants'), icon: BarChart2 },
    { to: '/history',   label: t('nav.history'),     icon: CalendarDays },
    { to: '/rankings',  label: t('nav.rankings'),    icon: Trophy },
    { to: '/leaderboard', label: t('nav.leaderboard'), icon: Medal },
    { to: '/profile',   label: t('nav.profile'),     icon: User },
  ];

  return (
    <header className="bg-gray-900 dark:bg-gray-900 light:bg-white border-b border-gray-800 dark:border-gray-800 light:border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-white dark:text-white light:text-gray-900 text-lg">
          <Wind size={20} className="text-blue-400" />
          <span>AQI<span className="text-blue-400">India</span></span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 dark:text-gray-300 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-800 light:hover:bg-gray-100'}`}
              >
                <Icon size={15} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Points indicator */}
          {gamification && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold">
              ⭐ {gamification.points}
            </div>
          )}

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors bg-gray-800 dark:bg-gray-800 light:bg-gray-100 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-200 border border-gray-700 dark:border-gray-700 light:border-gray-300"
            title="Switch language"
          >
            {language === 'en' ? 'हि' : 'EN'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md transition-colors bg-gray-800 dark:bg-gray-800 light:bg-gray-100 text-gray-300 dark:text-gray-300 light:text-gray-700 hover:bg-gray-700 dark:hover:bg-gray-700 light:hover:bg-gray-200 border border-gray-700 dark:border-gray-700 light:border-gray-300"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
