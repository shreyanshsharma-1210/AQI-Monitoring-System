import React, { useEffect, useId } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { getAQIColor } from '../store/useStore';

/**
 * Build a sinusoidal wave SVG path.
 * Surface sits at y=0 in local group coords; path fills downward to y=120.
 * Made wider than the 100-unit viewBox so scrolling never shows a gap.
 */
function buildWavePath(amp = 3.5, period = 38) {
  let d = 'M -120 0';
  for (let x = -118; x <= 220; x += 2) {
    const y =
      amp * Math.sin((x / period) * 2 * Math.PI) +
      amp * 0.45 * Math.sin((x / (period * 0.65)) * 2 * Math.PI);
    d += ` L ${x} ${y}`;
  }
  return d + ' L 220 120 L -120 120 Z';
}

const WAVE_PATH   = buildWavePath(3.5, 38);
const WAVE_PATH_2 = buildWavePath(2.2, 52);
const WAVE_PERIOD = 38;

export default function AQIGauge({ aqi, category, size = 160 }) {
  const uid    = useId().replace(/:/g, '');
  const clipId = `wc-${uid}`;
  const color  = getAQIColor(category);

  // AQI 0–200 → 0–100% fill. AQI 100 = 50%, AQI 200+ = full.
  const targetLevel = Math.min(Math.max((aqi || 0) / 200, 0), 1);

  const levelMv = useMotionValue(0);
  const waveX   = useMotionValue(0);
  const waveX2  = useMotionValue(0);

  // Animate water level when AQI changes
  useEffect(() => {
    const ctrl = animate(levelMv, targetLevel, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
    });
    return ctrl.stop;
  }, [targetLevel]);

  // Wave 1 — scrolls left
  useEffect(() => {
    const ctrl = animate(waveX, [0, -WAVE_PERIOD], {
      duration: 2.2,
      ease: 'linear',
      repeat: Infinity,
    });
    return ctrl.stop;
  }, []);

  // Wave 2 — scrolls right slower (depth effect)
  useEffect(() => {
    const ctrl = animate(waveX2, [0, WAVE_PERIOD], {
      duration: 3.5,
      ease: 'linear',
      repeat: Infinity,
    });
    return ctrl.stop;
  }, []);

  // level=0 → group at y=100 (empty); level=1 → group at y=0 (full)
  const groupY = useTransform(levelMv, l => (1 - l) * 100);

  return (
    <div className="flex flex-col items-center gap-3 text-gray-900 dark:text-white select-none">
      <div style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <defs>
            <clipPath id={clipId}>
              <circle cx="50" cy="50" r="43" />
            </clipPath>
            {/* Glass sheen gradient */}
            <radialGradient id={`${uid}-vg`} cx="38%" cy="30%" r="58%">
              <stop offset="0%"   stopColor="white" stopOpacity="0.22" />
              <stop offset="100%" stopColor="white" stopOpacity="0"    />
            </radialGradient>
          </defs>

          {/* Outer ghost ring */}
          <circle cx="50" cy="50" r="46.5" fill="none"
            stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.1" />

          {/* Water fill — clipped to circle */}
          <g clipPath={`url(#${clipId})`}>
            {/* Very subtle base tint */}
            <circle cx="50" cy="50" r="43" fill={color.hex} fillOpacity="0.07" />

            {/* Depth wave (lighter, opposite scroll) */}
            <motion.g style={{ x: waveX2, y: groupY }}>
              <path d={WAVE_PATH_2} fill={color.hex} fillOpacity="0.28" />
            </motion.g>

            {/* Main wave */}
            <motion.g style={{ x: waveX, y: groupY }}>
              <path d={WAVE_PATH} fill={color.hex} fillOpacity="0.80" />
            </motion.g>

            {/* Glass sheen always on top */}
            <circle cx="50" cy="50" r="43" fill={`url(#${uid}-vg)`} />
          </g>

          {/* Colored border ring */}
          <circle cx="50" cy="50" r="46.5" fill="none"
            stroke={color.hex} strokeWidth="2.5" strokeOpacity="0.55" />

          {/* AQI value */}
          <text x="50" y="46" textAnchor="middle" fontSize="21" fontWeight="800"
            fill="currentColor"
            style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.22))' }}>
            {aqi != null ? Math.round(aqi) : '—'}
          </text>
          <text x="50" y="57" textAnchor="middle" fontSize="7.5" fontWeight="600"
            fill="#9ca3af" letterSpacing="1">
            AQI
          </text>
        </svg>
      </div>

      {/* Category badge — re-animates when category changes */}
      <motion.span
        key={category}
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-[11px] font-bold px-3 py-1 rounded-full text-white tracking-wide shadow-md"
        style={{ backgroundColor: color.hex }}
      >
        {category || 'No Data'}
      </motion.span>
    </div>
  );
}
