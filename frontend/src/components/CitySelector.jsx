import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

export default function CitySelector({ cities, selected, onChange }) {
  return (
    <div className="relative inline-block">
      <select
        value={selected || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none bg-gray-800 border border-gray-600 text-white text-sm pl-8 pr-8 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:border-blue-500"
      >
        <option value="" disabled>Select city…</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>{c.display_name}</option>
        ))}
      </select>
      <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
