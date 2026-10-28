import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#070a14" />
          <stop offset="50%" stopColor="#0c1322" />
          <stop offset="100%" stopColor="#050811" />
        </linearGradient>

        <linearGradient id="logo-primary-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        <linearGradient id="logo-cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>

        <linearGradient id="logo-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Squircle Tile Canvas */}
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="108"
        fill="url(#logo-bg-grad)"
        stroke="url(#logo-border-grad)"
        strokeWidth="6"
      />

      {/* Wi-Fi Arcs */}
      <path
        d="M 144 154 A 150 150 0 0 1 368 154"
        stroke="url(#logo-primary-glow)"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 182 188 A 102 102 0 0 1 330 188"
        stroke="url(#logo-primary-glow)"
        strokeWidth="20"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Center Wi-Fi Hub */}
      <circle
        cx="256"
        cy="226"
        r="44"
        fill="#0c1322"
        stroke="url(#logo-primary-glow)"
        strokeWidth="20"
      />
      <circle cx="256" cy="226" r="14" fill="#00f2fe" />

      {/* Key Shaft (Stem) */}
      <rect
        x="245"
        y="248"
        width="22"
        height="162"
        rx="11"
        fill="url(#logo-primary-glow)"
      />

      {/* "t" Crossbar */}
      <rect
        x="204"
        y="292"
        width="104"
        height="20"
        rx="10"
        fill="url(#logo-primary-glow)"
      />

      {/* Teeth */}
      <rect
        x="256"
        y="344"
        width="48"
        height="18"
        rx="9"
        fill="url(#logo-cyan-glow)"
      />
      <rect
        x="256"
        y="378"
        width="36"
        height="18"
        rx="9"
        fill="url(#logo-cyan-glow)"
      />

      {/* 3 Satellite Nodes */}
      <circle cx="140" cy="396" r="16" fill="#090d16" stroke="#38bdf8" strokeWidth="5" />
      <circle cx="140" cy="396" r="7" fill="#38bdf8" />

      <circle cx="372" cy="396" r="16" fill="#090d16" stroke="#a855f7" strokeWidth="5" />
      <circle cx="372" cy="396" r="7" fill="#a855f7" />

      <circle cx="256" cy="442" r="14" fill="#090d16" stroke="#10b981" strokeWidth="5" />
      <circle cx="256" cy="442" r="6" fill="#10b981" />
    </svg>
  );
};
