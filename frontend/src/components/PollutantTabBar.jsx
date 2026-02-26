import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TABS = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'pm10', label: 'PM10' },
  { key: 'no2',  label: 'NO₂' },
  { key: 'o3',   label: 'O₃' },
  { key: 'co',   label: 'CO' },
  { key: 'so2',  label: 'SO₂' },
];

export default function PollutantTabBar({ cityId }) {
  const navigate = useNavigate();
  const { pollutant: activePollutant } = useParams();

  return (
    <div className="flex gap-1.5 flex-wrap">
      {TABS.map(({ key, label }) => {
        const active = activePollutant === key;
        return (
          <button
            key={key}
            onClick={() => navigate(`/city/${cityId}/pollutant/${key}`)}
            className={`text-sm px-3 py-1 rounded-full border font-medium transition-colors
              ${active
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-300'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
