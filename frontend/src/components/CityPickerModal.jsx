import React, { useState } from 'react';
import { MapPin, Loader2, Search, Globe } from 'lucide-react';
import useStore from '../store/useStore';

export default function CityPickerModal() {
  const { cities, detectAndSelectCity, locationDetecting, setSelectedCityId, setShowCityPicker } = useStore();
  const [query, setQuery] = useState('');

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.state || '').toLowerCase().includes(query.toLowerCase())
  );

  function pick(city) {
    setSelectedCityId(city.id);
    setShowCityPicker(false);
  }

  function handleDetect() {
    detectAndSelectCity(() => {
      // on success the modal will close via the store effect in App.jsx
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <Globe size={20} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Welcome to AQIFY</h2>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Select your city to see live air quality data, or let us detect your location automatically.
          </p>

          {/* Auto-detect button */}
          <button
            onClick={handleDetect}
            disabled={locationDetecting || !cities.length}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
              bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed
              text-white text-sm font-medium transition-colors"
          >
            {locationDetecting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Detecting your location…
              </>
            ) : (
              <>
                <MapPin size={15} />
                Detect My Location Automatically
              </>
            )}
          </button>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or choose manually</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              type="text"
              placeholder="Search city or state…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2
                text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* City list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No cities found</p>
          )}
          {filtered.map((city) => (
            <button
              key={city.id}
              onClick={() => pick(city)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                bg-gray-50 dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-transparent text-left transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-600/30 flex items-center justify-center transition-colors shrink-0">
                <MapPin size={14} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{city.name}</p>
                {city.state && <p className="text-xs text-gray-500 truncate">{city.state}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
