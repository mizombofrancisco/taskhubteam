import React from "react";

// Acuratech brand mark — stylized "A" within a sweeping circular arc.
export default function Brand({ size = 36, className = "", withWordmark = false, light = false }) {
  const id = React.useId();
  const main = light ? "#FFFFFF" : "#0057D9";
  const accent = light ? "#FFFFFF" : "#0BB4F5";
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor={main} />
            <stop offset="1" stopColor={accent} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="46" stroke={`url(#g-${id})`} strokeWidth="9" strokeLinecap="round" strokeDasharray="180 260" transform="rotate(-40 50 50)" />
        <path d="M50 26 L30 74 H40 L50 50 L60 74 H70 Z" fill={`url(#g-${id})`} />
        <path d="M40 74 H60 L50 56 Z" fill={light ? "#0C1421" : "#0C1421"} opacity="0.92" />
      </svg>
      {withWordmark && (
        <div className="leading-none">
          <div className="font-display font-extrabold tracking-tight text-[1.05rem]" style={{ color: light ? "#fff" : "#EEF3F9" }}>
            ACURATECH
          </div>
          <div className="text-[0.58rem] font-medium tracking-[0.18em] uppercase" style={{ color: light ? "rgba(255,255,255,0.7)" : "#9AA3B5" }}>
            Soluções Hospitalares
          </div>
        </div>
      )}
    </div>
  );
}