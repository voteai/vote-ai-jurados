import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import ScoreControl from "@/components/evaluation/ScoreControl";

// Demo data
const demoContest = {
  id: "demo-1",
  name: "Concurso de Talentos 2026",
};

const demoJudge = {
  id: "judge-demo",
  name: "Jurado Demo",
};

const demoCategory = {
  id: "cat-1",
  name: "Música",
};

const demoParticipants = [
  { id: "p1", name: "Candidato A", code: "001", description: "Performance instrumental clássica" },
  { id: "p2", name: "Candidato B", code: "002", description: "Performance de MPB" },
  { id: "p3", name: "Candidato C", code: "003", description: "Performance pop/rock" },
];

const demoCriteria = [
  {
    id: "c1",
    name: "Técnica Vocal",
    description: "Qualidade e precisão vocal",
    weight: 30,
    control_type: "numeric_bar",
    min_value: 0,
    max_value: 10,
  },
  {
    id: "c2",
    name: "Interpretação",
    description: "Expressão e sentimento da performance",
    weight: 35,
    control_type: "thermometer",
    min_value: 0,
    max_value: 10,
  },
  {
    id: "c3",
    name: "Presença de Palco",
    description: "Conexão com o público",
    weight: 35,
    control_type: "speedometer",
    min_value: 0,
    max_value: 10,
  },
];

export default function JudgeDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const currentParticipant = demoParticipants[currentIndex];
  const dk = darkMode;

  const toggleDark = () => setDarkMode(!darkMode);

  const normalizeScore = (criterion, raw) => {
    if (criterion.min_value === criterion.max_value) return 0;
    const normalized = ((raw - criterion.min_value) / (criterion.max_value - criterion.min_value)) * 100;
    return Math.round(normalized);
  };

  const calcFinalScore = () => {
    let totalWeighted = 0;
    let totalWeight = 0;
    demoCriteria.forEach((c) => {
      const raw = scores[c.id] ?? c.min_value;
      const norm = normalizeScore(c, raw);
      totalWeighted += norm * (c.weight / 100);
      totalWeight += c.weight;
    });
    return totalWeight > 0 ? (totalWeighted / totalWeight) * 100 : 0;
  };

  return (
    <div className={`min-h-screen ${dk ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className={dk ? "text-gray-300 hover:bg-gray-800" : ""}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{demoContest.name}</h1>
            <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-500"}`}>
              Jurado: {demoJudge.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className={dk ? "text-yellow-400 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}
          >
            {dk ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        {/* Category Badge */}
        <div className="mb-4">
          <Badge className="bg-teal-600 text-white">{demoCategory.name}</Badge>
        </div>

        {/* Participant Navigation */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {demoParticipants.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-10 h-10 rounded-full text-sm font-medium border-2 transition-colors ${
                i === currentIndex
                  ? "border-blue-500 bg-blue-600 text-white"
                  : dk
                    ? "border-gray-600 bg-gray-800 text-gray-300"
                    : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Participant Info */}
        <Card className={`mb-4 ${dk ? "bg-gray-900 border-gray-700 text-gray-100" : ""}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{currentParticipant.name}</CardTitle>
            <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-500"}`}>Código: {currentParticipant.code}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-600"}`}>
              {currentParticipant.description}
            </p>
          </CardContent>
        </Card>

        {/* Criteria Scoring */}
        <div className="space-y-4 mb-4">
          {demoCriteria.map((c) => (
            <Card key={c.id} className={dk ? "bg-gray-900 border-gray-700 text-gray-100" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className={`text-xs ${dk ? "text-gray-400" : "text-gray-500"}`}>{c.description}</p>
                  </div>
                  <Badge variant="outline">{c.weight}%</Badge>
                </div>
                <ScoreControl
                  criterion={c}
                  value={scores[c.id] ?? c.min_value}
                  onChange={(v) => setScores((prev) => ({ ...prev, [c.id]: v }))}
                  disabled={false}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comment Section */}
        <Card className={`mb-4 ${dk ? "bg-gray-900 border-gray-700 text-gray-100" : ""}`}>
          <CardContent className="pt-4">
            <label className="block text-sm font-medium mb-2">Comentário Geral</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Observações sobre este participante..."
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                dk
                  ? "bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
            />
          </CardContent>
        </Card>

        {/* Final Score */}
        <div className={`rounded-lg border p-4 mb-4 ${dk ? "bg-gray-900 border-gray-700" : "bg-white"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${dk ? "text-gray-400" : "text-gray-500"}`}>Nota Final</span>
            <span className="text-2xl font-bold text-blue-400">{calcFinalScore().toFixed(1)}</span>
          </div>
        </div>

        {/* Demo Info */}
        <div className={`rounded-lg border px-4 py-3 mb-4 ${dk ? "bg-blue-900 border-blue-700 text-blue-100" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
          <p className="text-sm font-medium">💡 Modo Demo</p>
          <p className="text-xs mt-1">Explore livremente como funciona a avaliação. Todos os controles estão funcionais!</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            ← Anterior
          </Button>
          <Button
            onClick={() => setCurrentIndex((i) => Math.min(demoParticipants.length - 1, i + 1))}
            disabled={currentIndex === demoParticipants.length - 1}
            className="flex-1"
          >
            Próximo →
          </Button>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center space-y-3">
          <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-600"}`}>
            Pronto para usar o Vote Aí Jurados com seus próprios eventos?
          </p>
          <Link to="/login">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">Fazer Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}