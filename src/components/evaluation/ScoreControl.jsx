import React from "react";
import { Slider } from "@/components/ui/slider";

// Normaliza qualquer valor raw para 0-100
export function normalizeScore(criterion, raw) {
  const { min_value = 0, max_value = 10 } = criterion;
  const range = max_value - min_value;
  return range === 0 ? 0 : Math.min(100, Math.max(0, ((raw - min_value) / range) * 100));
}

export default function ScoreControl({ criterion, value, onChange, disabled }) {
  const { min_value = 0, max_value = 10, allow_decimal = true, control_type = "numeric_bar", labels = "" } = criterion;

  const handleChange = (newVal) => {
    if (disabled) return;
    const v = allow_decimal ? newVal : Math.round(newVal);
    onChange(Math.min(max_value, Math.max(min_value, v)));
  };

  const pct = ((value - min_value) / (max_value - min_value)) * 100;
  const displayVal = allow_decimal ? Number(value).toFixed(1) : Math.round(value);
  const labelList = labels ? labels.split(",").map(l => l.trim()).filter(Boolean) : [];

  if (control_type === "thermometer") return <ThermometerControl value={value} pct={pct} displayVal={displayVal} min={min_value} max={max_value} step={allow_decimal ? 0.1 : 1} onChange={handleChange} disabled={disabled} labels={labelList} />;
  if (control_type === "speedometer") return <SpeedometerControl value={value} pct={pct} displayVal={displayVal} min={min_value} max={max_value} step={allow_decimal ? 0.1 : 1} onChange={handleChange} disabled={disabled} labels={labelList} />;
  if (control_type === "ruler") return <RulerControl value={value} pct={pct} displayVal={displayVal} min={min_value} max={max_value} step={allow_decimal ? 0.1 : 1} onChange={handleChange} disabled={disabled} labels={labelList} />;
  // default: numeric_bar
  return <NumericBarControl value={value} pct={pct} displayVal={displayVal} min={min_value} max={max_value} step={allow_decimal ? 0.1 : 1} onChange={handleChange} disabled={disabled} labels={labelList} />;
}

/* ─── Numérico com Barra ─── */
function NumericBarControl({ value, pct, displayVal, min, max, step, onChange, disabled, labels }) {
  const color = pct >= 75 ? "from-green-400 to-green-600" : pct >= 40 ? "from-blue-400 to-blue-600" : "from-red-400 to-orange-400";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{min}</span>
        <span className="text-3xl font-bold text-blue-600 tabular-nums">{displayVal}</span>
        <span className="text-xs text-gray-400">{max}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} disabled={disabled} className="w-full" />
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-200`} style={{ width: `${pct}%` }} />
      </div>
      {labels.length > 0 && <LabelRow labels={labels} pct={pct} />}
    </div>
  );
}

/* ─── Termômetro ─── */
function ThermometerControl({ value, pct, displayVal, min, max, step, onChange, disabled, labels }) {
  const color = pct >= 75 ? "#ef4444" : pct >= 50 ? "#f97316" : pct >= 25 ? "#eab308" : "#3b82f6";
  return (
    <div className="flex items-end gap-4">
      {/* Coluna do termômetro */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-400">{max}</span>
        <div className="relative w-6 h-36 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300"
            style={{ height: `${pct}%`, background: color }}
          />
        </div>
        <span className="text-xs text-gray-400">{min}</span>
      </div>
      {/* Controle e valor */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>{displayVal}</span>
          <span className="text-xs text-gray-400">/ {max}</span>
        </div>
        <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} disabled={disabled} className="w-full" />
        {labels.length > 0 && <LabelRow labels={labels} pct={pct} />}
      </div>
    </div>
  );
}

/* ─── Velocímetro ─── */
function SpeedometerControl({ value, pct, displayVal, min, max, step, onChange, disabled, labels }) {
  // Arco SVG: 180° (semicírculo)
  const angle = -180 + (pct / 100) * 180; // de -180 a 0
  const toRad = (deg) => (deg * Math.PI) / 180;
  const cx = 60, cy = 60, r = 45;
  const startAngle = -180;
  const endAngle = startAngle + (pct / 100) * 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = pct > 50 ? 1 : 0;
  const color = pct >= 75 ? "#22c55e" : pct >= 40 ? "#f97316" : "#ef4444";
  // agulha
  const needleAngle = -180 + (pct / 100) * 180;
  const nx = cx + (r - 8) * Math.cos(toRad(needleAngle));
  const ny = cy + (r - 8) * Math.sin(toRad(needleAngle));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-center gap-4">
        <div className="flex flex-col items-center">
          <svg width="120" height="70" viewBox="0 0 120 70">
            {/* trilha */}
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
            {/* progresso */}
            {pct > 0 && (
              <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
            )}
            {/* agulha */}
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="4" fill="#374151" />
          </svg>
          <div className="flex justify-between w-full px-1 -mt-1">
            <span className="text-xs text-gray-400">{min}</span>
            <span className="text-xs text-gray-400">{max}</span>
          </div>
        </div>
        <span className="text-3xl font-bold tabular-nums mb-3" style={{ color }}>{displayVal}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} disabled={disabled} className="w-full" />
      {labels.length > 0 && <LabelRow labels={labels} pct={pct} />}
    </div>
  );
}

/* ─── Régua ─── */
function RulerControl({ value, pct, displayVal, min, max, step, onChange, disabled, labels }) {
  const ticks = 10;
  const color = pct >= 75 ? "#8b5cf6" : pct >= 40 ? "#6366f1" : "#a5b4fc";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{min}</span>
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{displayVal}</span>
        <span className="text-xs text-gray-400">{max}</span>
      </div>
      {/* Régua visual */}
      <div className="relative h-8 bg-gray-50 rounded border border-gray-200 overflow-hidden">
        {/* preenchimento */}
        <div className="absolute left-0 top-0 bottom-0 transition-all duration-200" style={{ width: `${pct}%`, background: `linear-gradient(to right, #c4b5fd, ${color})` }} />
        {/* marcações */}
        <div className="absolute inset-0 flex items-end pb-1">
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <div className={`w-px bg-gray-400 opacity-50 ${i % 5 === 0 ? "h-3" : "h-1.5"}`} />
            </div>
          ))}
        </div>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} disabled={disabled} className="w-full" />
      {labels.length > 0 && <LabelRow labels={labels} pct={pct} />}
    </div>
  );
}

/* ─── Labels ─── */
function LabelRow({ labels, pct }) {
  const idx = Math.min(labels.length - 1, Math.floor((pct / 100) * labels.length));
  return (
    <div className="flex justify-between mt-1">
      {labels.map((l, i) => (
        <span key={i} className={`text-xs transition-colors ${i === idx ? "font-semibold text-gray-800" : "text-gray-400"}`}>{l}</span>
      ))}
    </div>
  );
}