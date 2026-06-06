interface LapoLogoProps {
  size?: number;
  wordmark?: boolean;
  className?: string;
}

export function LapoMark({ size = 40 }: { size?: number }) {
  const id = `lg-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Arc gradient: navy → blue → cyan */}
        <linearGradient id={`${id}-arc`} x1="5" y1="31" x2="35" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#004796" />
          <stop offset="55%"  stopColor="#006bff" />
          <stop offset="100%" stopColor="#0ae8f0" />
        </linearGradient>
        {/* Glow filter for the peak dot */}
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Pool baseline — the foundation of capital */}
      <line
        x1="5" y1="32"
        x2="22" y2="32"
        stroke="#006bff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />

      {/* Vertical anchor — the "L" stem */}
      <line
        x1="5" y1="22"
        x2="5" y2="32"
        stroke={`url(#${id}-arc)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Rising arc — credit score climbing */}
      <path
        d="M5 22 C5 10 18 7 35 7"
        stroke={`url(#${id}-arc)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Peak dot — the funded milestone */}
      <circle
        cx="35" cy="7" r="3.2"
        fill="#0ae8f0"
        filter={`url(#${id}-glow)`}
      />
      {/* Inner dot highlight */}
      <circle cx="35" cy="7" r="1.4" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

export function LapoLogo({ size = 40, wordmark = true, className }: LapoLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LapoMark size={size} />
      {wordmark && (
        <span
          style={{ fontSize: size * 0.48, lineHeight: 1, letterSpacing: "-0.03em" }}
          className="font-bold text-white"
        >
          lapo
        </span>
      )}
    </div>
  );
}
