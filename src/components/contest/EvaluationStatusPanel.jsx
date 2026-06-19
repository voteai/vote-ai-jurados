import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Circle, RefreshCw, Users, Star, Search, X, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UnlockEvaluationDialog from "@/components/contest/UnlockEvaluationDialog";
import { getWeightedScore } from "@/utils/scoring";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";

export default function EvaluationStatusPanel({ contest, isAdmin }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [participants, setParticipants] = useState([]);
  const [judges, setJudges] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [evalScores, setEvalScores] = useState([]); // all EvaluationScore for this category
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unlockTarget, setUnlockTarget] = useState(null); // { evaluation, participantName, judgeName }

  useEffect(() => { if (contest?.id) loadBase(); }, [contest?.id]);
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

  const loadBase = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const cats = await base44.entities.Category.filter({ contest_id: contest.id });
      const validCats = asArray(cats).filter(hasValidId).sort(byDisplayOrder);
      setCategories(validCats);
      setParticipants([]);
      setJudges([]);
      setAssignments([]);
      setEvaluations([]);
      setEvalScores([]);
      setCriteria([]);

      if (validCats.length > 0) setSelectedCat(idValue(validCats[0].id));
      else {
        setSelectedCat("");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias do acompanhamento:", error);
      setCategories([]);
      setSelectedCat("");
      setParticipants([]);
      setJudges([]);
      setAssignments([]);
      setEvaluations([]);
      setEvalScores([]);
      setCriteria([]);
      setLoadError("Nao foi possivel carregar o acompanhamento deste concurso.");
      setLoading(false);
    }
  };

  const loadDetails = async () => {
    if (!selectedCat) {
      setParticipants([]);
      setJudges([]);
      setAssignments([]);
      setEvaluations([]);
      setEvalScores([]);
      setCriteria([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const [p, j, a, e, cr] = await Promise.all([
        base44.entities.Participant.filter({ contest_id: contest.id, category_id: selectedCat }),
        base44.entities.Judge.filter({ contest_id: contest.id }),
        base44.entities.JudgeAssignment.filter({ contest_id: contest.id, category_id: selectedCat, status: "active" }),
        base44.entities.Evaluation.filter({ contest_id: contest.id, category_id: selectedCat }),
        base44.entities.EvaluationCriterion.filter({ contest_id: contest.id, category_id: selectedCat }),
      ]);
      setParticipants(asArray(p).filter(hasValidId).filter(x => x.status !== "disqualified"));
      setJudges(asArray(j).filter(hasValidId));
      setAssignments(asArray(a).filter(hasValidId));
      setEvaluations(asArray(e).filter(hasValidId));
      setCriteria(asArray(cr).filter(hasValidId).filter(c => c.active));

      const submittedEvals = asArray(e).filter(ev => ev.status === "submitted" || ev.status === "unlocked");
      const scoreArrays = await Promise.all(
        submittedEvals.map(ev => base44.entities.EvaluationScore.filter({ evaluation_id: ev.id }))
      );
      setEvalScores(scoreArrays.flat());
    } catch (error) {
      console.error("Erro ao carregar detalhes do acompanhamento:", error);
      setParticipants([]);
      setJudges([]);
      setAssignments([]);
      setEvaluations([]);
      setEvalScores([]);
      setCriteria([]);
      setLoadError("Nao foi possivel carregar os dados desta categoria.");
    } finally {
      setLoading(false);
    }
  };

  const getEval = (participantId, judgeId) =>
    evaluations.find(e => idValue(e.participant_id) === idValue(participantId) && idValue(e.judge_id) === idValue(judgeId));

  const calcScore = (evaluationId) => getWeightedScore(evaluationId, criteria, evalScores);

  const getAssignedJudges = () => {
    const assignedIds = assignments.map(a => idValue(a.judge_id));
    return judges.filter(j => assignedIds.includes(idValue(j.id)));
  };

  const getParticipantProgress = (participantId) => {
    const assigned = getAssignedJudges();
    if (assigned.length === 0) return { submitted: 0, draft: 0, pending: 0, total: 0 };
    let submitted = 0, draft = 0;
    assigned.forEach(j => {
      const ev = getEval(participantId, j.id);
      if (ev?.status === "submitted") submitted++;
      else if (ev?.status === "draft") draft++;
    });
    return { submitted, draft, pending: assigned.length - submitted - draft, total: assigned.length };
  };

  const assignedJudges = getAssignedJudges();

  const filteredParticipants = participants.filter(p => {
    const matchName = safeText(p.name).toLowerCase().includes(search.toLowerCase()) || safeText(p.code).toLowerCase().includes(search.toLowerCase());
    if (!matchName) return false;
    if (statusFilter === "all") return true;
    const prog = getParticipantProgress(p.id);
    if (statusFilter === "complete") return prog.submitted === prog.total && prog.total > 0;
    if (statusFilter === "partial") return prog.submitted > 0 && prog.submitted < prog.total;
    if (statusFilter === "pending") return prog.submitted === 0;
    return true;
  });

  const totalSubmitted = participants.reduce((acc, p) => {
    const { submitted } = getParticipantProgress(p.id);
    return acc + submitted;
  }, 0);
  const totalExpected = participants.length * assignedJudges.length;

  const completionPct = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedCat} onValueChange={setSelectedCat}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione a categoria..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={idValue(c.id)} value={idValue(c.id)}>{safeText(c.name, "Sem nome")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={selectedCat ? loadDetails : loadBase} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-4 h-4" />{assignedJudges.length} jurado(s)</span>
          <span className="flex items-center gap-1"><Star className="w-4 h-4" />{filteredParticipants.length}/{participants.length} participante(s)</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status das avaliações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="complete">✅ Completo</SelectItem>
            <SelectItem value="partial">🕐 Parcial</SelectItem>
            <SelectItem value="pending">⭕ Pendente</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progresso geral das avaliações</span>
            <span className="text-sm font-bold text-blue-600">{completionPct}% ({totalSubmitted}/{totalExpected})</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <Card><CardContent className="py-10 text-center text-red-500">{loadError}</CardContent></Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold text-foreground">Nenhuma categoria cadastrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">Cadastre as categorias da final antes de acompanhar as avaliacoes.</p>
          </CardContent>
        </Card>
      ) : participants.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum participante nesta categoria.</CardContent></Card>
      ) : filteredParticipants.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum participante encontrado com esses filtros.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status por Participante × Jurado</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="text-left px-4 py-3 font-medium text-foreground min-w-[160px]">Participante</th>
                  {assignedJudges.map(j => (
                    <th key={j.id} className="px-3 py-3 font-medium text-foreground text-center min-w-[100px]">
                      <div className="truncate max-w-[90px]" title={j.name}>{j.name.split(" ")[0]}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-foreground text-center min-w-[100px]">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p, idx) => {
                  const prog = getParticipantProgress(p.id);
                  const allDone = prog.submitted === prog.total && prog.total > 0;
                  return (
                    <tr key={p.id} className={`border-b border-border transition-colors ${allDone ? "bg-green-500/10" : idx % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-card-foreground">{p.name}</div>
                        {p.code && <div className="text-xs text-muted-foreground">{p.code}</div>}
                      </td>
                      {assignedJudges.map(j => {
                        const ev = getEval(p.id, j.id);
                        const status = ev?.status || "pending";
                        return (
                          <td key={j.id} className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <StatusIcon status={status} score={calcScore(ev?.id)} />
                              {isAdmin && ev && status === "submitted" && (
                                <button
                                  onClick={() => setUnlockTarget({ evaluation: ev, participantName: p.name, judgeName: j.name })}
                                  className="text-xs text-amber-500 hover:text-amber-700 flex items-center gap-0.5 mt-0.5"
                                  title="Desbloquear para reenvio"
                                >
                                  <Unlock className="w-3 h-3" /> desbloquear
                                </button>
                              )}
                              {status === "unlocked" && (
                                <span className="text-xs text-amber-600 font-medium">Desbloqueado</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <ProgressBadge submitted={prog.submitted} total={prog.total} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Enviado</span>
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-yellow-500" /> Rascunho</span>
        <span className="flex items-center gap-1.5"><Circle className="w-4 h-4 text-muted-foreground" /> Pendente</span>
        <span className="flex items-center gap-1.5"><Unlock className="w-4 h-4 text-amber-500" /> Desbloqueado</span>
      </div>

      {unlockTarget && (
        <UnlockEvaluationDialog
          open={!!unlockTarget}
          evaluation={unlockTarget.evaluation}
          participantName={unlockTarget.participantName}
          judgeName={unlockTarget.judgeName}
          onClose={() => setUnlockTarget(null)}
          onUnlocked={loadDetails}
        />
      )}
    </div>
  );
}

function StatusIcon({ status, score }) {
  if (status === "submitted") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        {score !== undefined && score !== null && (
          <span className="text-xs font-semibold text-green-600">{Number(score).toFixed(1)}</span>
        )}
      </div>
    );
  }
  if (status === "draft") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Clock className="w-5 h-5 text-yellow-400" />
        <span className="text-xs text-yellow-500">Rascunho</span>
      </div>
    );
  }
  if (status === "unlocked") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Unlock className="w-5 h-5 text-amber-500" />
        {score !== undefined && score !== null && (
          <span className="text-xs font-semibold text-amber-600">{Number(score).toFixed(1)}</span>
        )}
      </div>
    );
  }
  return <Circle className="w-5 h-5 text-muted-foreground mx-auto" />;
}

function ProgressBadge({ submitted, total }) {
  if (total === 0) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round((submitted / total) * 100);
  const color = pct === 100 ? "bg-green-500/15 text-green-600 dark:text-green-300" : pct > 0 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {submitted}/{total}
    </span>
  );
}
