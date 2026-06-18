import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart2, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";

export default function ChartsPanel({ contest }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [participants, setParticipants] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (contest?.id) loadCategories(); }, [contest?.id]);
  useEffect(() => { if (contest?.id && selectedCat) loadDetails(); }, [contest?.id, selectedCat]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.Evaluation.subscribe((event) => {
      if (event.data?.contest_id !== contest?.id) return;
      setEvaluations(prev => {
        if (event.type === "create") return [...prev, event.data];
        if (event.type === "update") return prev.map(e => e.id === event.id ? event.data : e);
        if (event.type === "delete") return prev.filter(e => e.id !== event.id);
        return prev;
      });
    });
    return unsub;
  }, [contest?.id]);

  const loadCategories = async () => {
    const cats = await base44.entities.Category.filter({ contest_id: contest.id });
    const validCats = asArray(cats)
      .filter(hasValidId)
      .map((category) => ({ ...category, name: safeText(category.name, "Sem nome") }))
      .sort(byDisplayOrder);
    setCategories(validCats);
    if (validCats.length > 0) setSelectedCat(idValue(validCats[0].id));
    else setLoading(false);
  };

  const loadDetails = async () => {
    setLoading(true);
    const [p, e, c] = await Promise.all([
      base44.entities.Participant.filter({ contest_id: contest.id, category_id: selectedCat }),
      base44.entities.Evaluation.filter({ contest_id: contest.id, category_id: selectedCat, status: "submitted" }),
      base44.entities.EvaluationCriterion.filter({ contest_id: contest.id, category_id: selectedCat }),
    ]);
    setParticipants(asArray(p).filter(hasValidId).map((participant) => ({ ...participant, name: safeText(participant.name, "Sem nome") })).filter(x => x.status !== "disqualified"));
    setEvaluations(asArray(e).filter(hasValidId));
    setCriteria(asArray(c).filter(hasValidId).filter(x => x.active));
    setLoading(false);
  };

  // Build bar chart data: average score per participant
  const participantAvgData = participants.map(p => {
    const evals = evaluations.filter(e => idValue(e.participant_id) === idValue(p.id) && e.final_score != null);
    const avg = evals.length > 0
      ? evals.reduce((s, e) => s + e.final_score, 0) / evals.length
      : null;
    return {
      name: p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name,
      fullName: p.name,
      media: avg !== null ? parseFloat(avg.toFixed(2)) : null,
      avaliacoes: evals.length,
    };
  }).sort((a, b) => (b.media ?? -1) - (a.media ?? -1));

  // Category overview: top 5 by average
  const categoryOverviewData = categories.map(cat => {
    const catEvals = evaluations.filter(e => e.category_id === cat.id && e.final_score != null);
    const avg = catEvals.length > 0
      ? catEvals.reduce((s, e) => s + e.final_score, 0) / catEvals.length
      : null;
    return { name: cat.name.length > 12 ? cat.name.slice(0, 11) + "…" : cat.name, media: avg !== null ? parseFloat(avg.toFixed(2)) : 0 };
  });

  const submittedCount = evaluations.filter(e => e.final_score != null).length;
  const overallAvg = submittedCount > 0
    ? (evaluations.filter(e => e.final_score != null).reduce((s, e) => s + e.final_score, 0) / submittedCount).toFixed(2)
    : "—";

  const topParticipant = participantAvgData.find(p => p.media !== null);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold">{item.payload.fullName || label}</p>
          <p className="text-blue-600">Média: <span className="font-bold">{item.value}</span></p>
          {item.payload.avaliacoes !== undefined && (
            <p className="text-muted-foreground">{item.payload.avaliacoes} avaliação(ões)</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedCat} onValueChange={setSelectedCat}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Selecione a categoria..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={idValue(c.id)} value={idValue(c.id)}>{safeText(c.name, "Sem nome")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadDetails} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Tempo real
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard label="Média geral" value={overallAvg} sub={`${submittedCount} avaliação(ões) enviada(s)`} color="blue" />
        <KPICard label="Participantes" value={participants.length} sub="nesta categoria" color="purple" />
        <KPICard label="1º Colocado" value={topParticipant?.name ?? "—"} sub={topParticipant ? `Média ${topParticipant.media}` : "Sem avaliações"} color="green" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Bar chart - participant averages */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Médias por Participante
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participantAvgData.filter(p => p.media !== null).length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma avaliação enviada ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={participantAvgData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="media" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Média" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar chart - category overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" /> Médias por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryOverviewData.every(c => c.media === 0) ? (
                <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma avaliação enviada ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryOverviewData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [v, "Média"]} />
                    <Bar dataKey="media" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Média" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Ranking table */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Classificação Parcial — {categories.find(c => c.id === selectedCat)?.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {participantAvgData.filter(p => p.media !== null).length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma avaliação enviada ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Participante</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground">Avaliações</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Média</th>
                      <th className="px-4 py-2 w-40"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantAvgData.map((p, idx) => (
                      <tr key={idx} className={`border-b border-border ${idx === 0 ? "bg-yellow-500/10" : idx === 1 ? "bg-muted/50" : "bg-card"}`}>
                        <td className="px-4 py-2.5 font-bold text-muted-foreground">{p.media !== null ? idx + 1 : "—"}</td>
                        <td className="px-4 py-2.5 font-medium">{p.fullName}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">{p.avaliacoes}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                          {p.media !== null ? p.media : <span className="text-muted-foreground font-normal">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {p.media !== null && (
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                                style={{ width: `${p.media}%` }}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, sub, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    green: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold truncate">{value}</p>
      <p className="text-xs opacity-60 mt-0.5 truncate">{sub}</p>
    </div>
  );
}
