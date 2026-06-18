import React, { useState } from "react";
import ScoreControl from "./ScoreControl";

const typeInfo = {
  numeric_bar: { label: "Numérico com Barra", desc: "Ideal para critérios objetivos com nota precisa.", color: "bg-blue-50 border-blue-200 text-blue-700" },
  thermometer: { label: "Termômetro", desc: "Ótimo para percepção gradual: impacto, emoção, presença.", color: "bg-orange-50 border-orange-200 text-orange-700" },
  speedometer: { label: "Velocímetro", desc: "Ideal para intensidade e performance: ritmo, potência, domínio.", color: "bg-green-50 border-green-200 text-green-700" },
  ruler: { label: "Régua", desc: "Melhor para precisão comparativa: técnica, acabamento, alinhamento.", color: "bg-purple-50 border-purple-200 text-purple-700" },
};

export default function CriterionPreview({ criterion }) {
  const mid = (criterion.min_value + criterion.max_value) / 2;
  const [previewVal, setPreviewVal] = useState(mid);
  const info = typeInfo[criterion.control_type] || typeInfo.numeric_bar;
  const norm = criterion.max_value !== criterion.min_value
    ? (((previewVal - criterion.min_value) / (criterion.max_value - criterion.min_value)) * 100).toFixed(0)
    : 0;

  return (
    <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${info.color}`}>{info.label}</span>
      </div>
      <p className="text-xs text-gray-500">{info.desc}</p>

      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{criterion.name || "Critério"}</span>
          {criterion.weight > 0 && <span className="text-xs text-gray-400">{criterion.weight}%</span>}
        </div>
        <ScoreControl
          criterion={criterion}
          value={previewVal}
          onChange={setPreviewVal}
          disabled={false}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 bg-white rounded-lg border px-3 py-2">
        <span>Valor selecionado: <strong className="text-gray-700">{criterion.allow_decimal ? Number(previewVal).toFixed(1) : Math.round(previewVal)}</strong></span>
        <span>Nota interna (0–100): <strong className="text-blue-600">{norm}</strong></span>
      </div>
    </div>
  );
}