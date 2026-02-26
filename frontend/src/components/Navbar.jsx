import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wind, Map, BarChart2, User, CalendarDays, Trophy } from 'lucide-react';

const links = [
  { to: '/',          label: 'Dashboard',  icon: Wind },
  { to: '/heatmap',   label: 'Heatmap',    icon: Map },
  { to: '/pollutant/pm25', label: 'Pollutants', icon: BarChart2 },
  { to: '/history',   label: 'History',    icon: CalendarDays },
  { to: '/rankings',  label: 'Rankings',   icon: Trophy },
  { to: '/profile',   label: 'Profile',    icon: User },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-white text-lg">
          <Wind size={20} className="text-blue-400" />
          <span>AQI<span className="text-blue-400">India</span></span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
