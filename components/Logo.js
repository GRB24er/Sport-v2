"use client";

export default function Logo({ height = 60, style = {} }) {
  const scale = height / 60;
  return (
    <svg
      width={180 * scale}
      height={60 * scale}
      viewBox="0 0 180 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Shield icon */}
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B9635" />
          <stop offset="100%" stopColor="#076B25" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#F0D060" />
        </linearGradient>
        <linearGradient id="textGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C8C8C8" />
        </linearGradient>
      </defs>

      {/* Shield shape */}
      <path
        d="M8 8 L30 4 L52 8 L52 28 C52 40 30 54 30 54 C30 54 8 40 8 28 Z"
        fill="url(#shieldGrad)"
        stroke="url(#goldGrad)"
        strokeWidth="1.5"
      />

      {/* Football icon inside shield */}
      <circle cx="30" cy="24" r="10" fill="none" stroke="url(#goldGrad)" strokeWidth="1.2" />
      <path
        d="M30 14 L30 34 M20.5 19 L39.5 29 M39.5 19 L20.5 29"
        stroke="url(#goldGrad)"
        strokeWidth="0.8"
        opacity="0.6"
      />
      {/* Pentagon in center */}
      <polygon
        points="30,18 34.8,21.5 33,27 27,27 25.2,21.5"
        fill="url(#goldGrad)"
        opacity="0.3"
      />

      {/* "V" accent on shield */}
      <path
        d="M22 38 L30 46 L38 38"
        stroke="url(#goldGrad)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* VIRTUAL text */}
      <text
        x="62"
        y="28"
        fontFamily="'Bebas Neue', 'Arial Black', sans-serif"
        fontSize="24"
        fontWeight="700"
        letterSpacing="3"
        fill="url(#textGrad)"
      >
        VIRTUAL
      </text>

      {/* BET text in gold */}
      <text
        x="62"
        y="48"
        fontFamily="'Bebas Neue', 'Arial Black', sans-serif"
        fontSize="24"
        fontWeight="700"
        letterSpacing="3"
        fill="url(#goldGrad)"
      >
        BET
      </text>

      {/* Accent line */}
      <rect x="108" y="36" width="60" height="2" rx="1" fill="url(#shieldGrad)" opacity="0.6" />

      {/* PRO badge */}
      <rect x="108" y="40" width="28" height="12" rx="3" fill="url(#goldGrad)" />
      <text
        x="122"
        y="49.5"
        fontFamily="'DM Sans', sans-serif"
        fontSize="7"
        fontWeight="800"
        fill="#0B0D10"
        textAnchor="middle"
        letterSpacing="1.5"
      >
        PRO
      </text>
    </svg>
  );
}
