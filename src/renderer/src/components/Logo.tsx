import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Background Gradient */}
        <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#080d1a" />
          <stop offset="50%" stopColor="#0e172a" />
          <stop offset="100%" stopColor="#04060d" />
        </linearGradient>

        {/* Key Body Gradient (Electric Cyan to Cobalt) */}
        <linearGradient id="logo-key" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#0ea5e9" />
          <stop offset="75%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        {/* Inner Core Gradient */}
        <linearGradient id="logo-core" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
        </linearGradient>

        {/* Drop Shadow */}
        <filter id="logo-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#000000" floodOpacity="0.8" />
        </filter>

        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* App Tile Background (Squircle) */}
      <rect
        x="32"
        y="32"
        width="448"
        height="448"
        rx="112"
        fill="url(#logo-bg)"
        stroke="#38bdf8"
        strokeOpacity="0.25"
        strokeWidth="3"
        filter="url(#logo-shadow)"
      />

      {/* Ambient Light Reflection in Center */}
      <circle cx="256" cy="256" r="140" fill="#38bdf8" opacity="0.08" filter="url(#logo-glow)" />

      {/* Master Key (45-degree Angled Precision) */}
      <g transform="rotate(135 256 262)" filter="url(#logo-glow)">
        {/* 1. Geometric Hex-Rounded Key Head */}
        <path
          d="M 226 95 L 286 95 A 70 70 0 0 1 334 142 L 334 186 A 70 70 0 0 1 286 235 L 226 235 A 70 70 0 0 1 178 186 L 178 142 A 70 70 0 0 1 226 95 Z"
          fill="url(#logo-key)"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Inner Geometric Core (Square-Circle blend) */}
        <rect
          x="222"
          y="131"
          width="68"
          height="68"
          rx="20"
          fill="#0e172a"
          stroke="url(#logo-core)"
          strokeWidth="3.5"
        />
        <circle cx="256" cy="165" r="12" fill="#38bdf8" opacity="0.85" />

        {/* 2. Stepped Collar */}
        <rect
          x="230"
          y="235"
          width="52"
          height="14"
          rx="4"
          fill="url(#logo-key)"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />

        {/* 3. Key Shaft (Haste Central) */}
        <rect x="238" y="246" width="36" height="184" rx="6" fill="url(#logo-key)" />
        {/* Longitudinal Dual Bevel Grooves */}
        <line x1="250" y1="256" x2="250" y2="420" stroke="#082f49" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="262" y1="256" x2="262" y2="420" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

        {/* 4. Angled Precision Teeth (45-degree chamfered bit notches) */}
        <path
          d="M 274 316 L 335 316 L 348 329 L 348 344 L 335 344 L 310 344 L 310 360 L 345 360 L 358 373 L 358 392 L 345 392 L 320 392 L 320 406 L 332 406 L 342 416 L 342 426 L 332 426 L 274 426 Z"
          fill="url(#logo-key)"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
      </g>
    </svg>
  );
};
