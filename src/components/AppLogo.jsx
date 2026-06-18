import React from "react";

export default function AppLogo({ size = "md" }) {
  const sizes = {
    sm: { symbol: "w-6 h-6", text: "text-lg" },
    md: { symbol: "w-8 h-8", text: "text-2xl" },
    lg: { symbol: "w-12 h-12", text: "text-4xl" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2">
      {/* Symbol: V checkmark gradient */}
      <svg className={s.symbol} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* V shape */}
        <polygon points="4,4 14,4 20,26 26,4 36,4 20,38" fill="url(#logo-grad)" />
        {/* Check slash overlay */}
        <polygon points="22,18 28,10 36,10 26,26" fill="url(#logo-grad)" opacity="0.85" />
      </svg>

      {/* Text */}
      <div className="flex flex-col leading-none">
        <span
          className={`${s.text} font-black tracking-tight`}
          style={{
            background: "linear-gradient(135deg, #94a3b8 0%, #e2e8f0 40%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Vote{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Aí
          </span>
        </span>
        <span className="text-[0.55em] tracking-[0.3em] uppercase font-semibold text-muted-foreground mt-0.5">
          Jurados
        </span>
      </div>
    </div>
  );
}