import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle, Save, User, Moon, Sun, AlertTriangle } from "lucide-react";
import ScoreControl from "@/components/evaluation/ScoreControl";
import SubmitConfirmDialog from "@/components/evaluation/SubmitConfirmDialog";
import { toast } from "sonner";
import { normalizeScore as normalizeFn, calcLiveScore } from "@/utils/scoring";
import confetti from "canvas-confetti";
import { logAudit } from "@/lib/audit-log";

export default function EvaluationPage({ linkMode = false }) {
  const { contestId, judgeId } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [judge, setJudge] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("eval_dark_mode") === "true");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSubmittedParticipantId, setJustSubmittedParticipantId] = useState(null);
  const [confirmedParticipantIds, setConfirmedParticipantIds] = useState(() => new Set());

  const dk = darkMode;
  const backTarget = linkMode ? "/" : "/judge";

  const toggleDark = () => setDarkMode((prev) => {
    localStorage.setItem("eval_dark_mode", String(!prev));
    return !prev;
  });

  useEffect(() => { loadData(); }, [contestId, judgeId, linkMode]);

  const filteredParticipants = useMemo(() => {
    if (!selectedCategory) return [];

    const catAssignments = assignments.filter((assignment) => assignment.category_id === selectedCategory);
    const specificParticipantIds = catAssignments
      .filter((assignment) => assignment.participant_id)
      .map((assignment) => assignment.participant_id);

    return participants.filter((participant) => {
      if (participant.category_id !== selectedCategory) return false;
      if (specificParticipantIds.length > 0) return specificParticipantIds.includes(participant.id);
      return true;
    });
  }, [assignments, participants, selectedCategory]);

  const currentParticipant = filteredParticipants[currentIndex];
  const currentCriteria = selectedCategory
    ? criteria.filter((criterion) => criterion.category_id === selectedCategory)
    : criteria;
  const currentEvaluation = currentParticipant
    ? evaluations.find((evaluation) => evaluation.participant_id === currentParticipant.id)
    : null;
  const currentEvaluationSubmitted = currentEvaluation?.status === "submitted";
  const currentCategory = categories.find((category) => category.id === selectedCategory);
  const currentParticipantConfirmed = !!currentParticipant && (
    currentEvaluationSubmitted || confirmedParticipantIds.has(currentParticipant.id)
  );

  useEffect(() => {
    loadCurrentEvaluation();
  }, [currentIndex, filteredParticipants, evaluations]);

  const loadData = async () => {
    setLoading(true);
    setAccessError("");

    try {
      const [contestRes, judgeRes] = await Promise.all([
        base44.entities.Contest.filter({ id: contestId }),
        base44.entities.Judge.filter({ id: judgeId }),
      ]);

      const foundContest = contestRes[0] || null;
      const foundJudge = judgeRes[0] || null;

      setContest(foundContest);

      if (!foundContest) {
        setJudge(null);
        setParticipants([]);
        setCriteria([]);
        setCategories([]);
        setAssignments([]);
        setEvaluations([]);
        setAccessError("Concurso nao encontrado.");
        return;
      }

      if (!foundJudge) {
        setJudge(null);
        setParticipants([]);
        setCriteria([]);
        setCategories([]);
        setAssignments([]);
        setEvaluations([]);
        setAccessError("Link individual de jurado invalido.");
        return;
      }

      if (!linkMode) {
        const user = await base44.auth.me();
        const userEmail = String(user?.email || "").trim().toLowerCase();
        const judgeEmail = String(foundJudge?.email || "").trim().toLowerCase();

        if (!userEmail || judgeEmail !== userEmail) {
          setJudge(null);
          setParticipants([]);
          setCriteria([]);
          setCategories([]);
          setAssignments([]);
          setEvaluations([]);
          setAccessError("Voce nao tem permissao para acessar estas avaliacoes.");
          return;
        }
      }

      if (foundJudge.contest_id && foundJudge.contest_id !== contestId) {
        setJudge(null);
        setAccessError("Este jurado nao pertence ao concurso informado.");
        return;
      }

      if (foundJudge.invitation_status === "declined" || foundJudge.active === false) {
        setJudge(null);
        setAccessError("Seu cadastro de jurado nao esta ativo para este concurso.");
        return;
      }

      if (!["active", "evaluating"].includes(foundContest.status)) {
        setJudge(null);
        setAccessError("A votacao ainda nao foi liberada pelo organizador.");
        return;
      }

      const [participantsRes, criteriaRes, categoriesRes, evaluationsRes, assignmentsRes] = await Promise.all([
        base44.entities.Participant.filter({ contest_id: contestId }),
        base44.entities.EvaluationCriterion.filter({ contest_id: contestId }),
        base44.entities.Category.filter({ contest_id: contestId }),
        base44.entities.Evaluation.filter({ contest_id: contestId, judge_id: foundJudge.id }),
        base44.entities.JudgeAssignment.filter({ contest_id: contestId, judge_id: foundJudge.id, status: "active" }),
      ]);

      const assignedCategoryIds = [...new Set(assignmentsRes.map((assignment) => assignment.category_id))];
      const assignedCategories = categoriesRes.filter((category) => assignedCategoryIds.includes(category.id));

      setJudge(foundJudge);
      setAssignments(assignmentsRes);
      setParticipants(participantsRes.filter((participant) => participant.status !== "disqualified"));
      setCriteria(criteriaRes.filter((criterion) => criterion.active));
      setCategories(assignedCategories);
      setEvaluations(evaluationsRes);
      setSelectedCategory(assignedCategories[0]?.id || null);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Erro ao carregar painel de avaliacao:", error);
      setAccessError("Nao foi possivel carregar suas avaliacoes agora.");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentEvaluation = async () => {
    const participant = filteredParticipants[currentIndex];
    if (!participant) {
      setScores({});
      setComment("");
      return;
    }

    const existing = evaluations.find((evaluation) => evaluation.participant_id === participant.id);
    if (!existing) {
      setScores({});
      setComment("");
      return;
    }

    const evalScores = await base44.entities.EvaluationScore.filter({ evaluation_id: existing.id });
    const scoreMap = {};
    evalScores.forEach((score) => { scoreMap[score.criterion_id] = score.raw_value; });
    setScores(scoreMap);
    setComment(existing.general_comment || "");
  };

  const normalizeScore = (criterion, raw) => normalizeFn(criterion, raw);
  const calcFinalScore = () => calcLiveScore(currentCriteria, scores);

  const getEvalStatus = (participantId) => {
    const evaluation = evaluations.find((ev) => ev.participant_id === participantId);
    return evaluation?.status || "pending";
  };

  const isEvalEditable = (participantId) => {
    const status = getEvalStatus(participantId);
    return status === "draft" || status === "unlocked" || status === "pending";
  };

  const handleSave = async (submit = false) => {
    if (!currentParticipant || !judge?.id || accessError) return;
    if (!currentParticipantConfirmed) {
      toast.error("Confirme o participante antes de avaliar.");
      return;
    }

    setSaving(true);
    try {
      let evaluation = evaluations.find((ev) => ev.participant_id === currentParticipant.id);
      const isEditable = !evaluation || evaluation.status === "draft" || evaluation.status === "unlocked";

      if (evaluation && !isEditable) {
        toast.error("Esta avaliacao ja foi enviada e nao pode ser alterada.");
        return;
      }

      const finalScore = calcFinalScore();
      const evalData = {
        contest_id: contestId,
        category_id: currentParticipant.category_id,
        participant_id: currentParticipant.id,
        judge_id: judge.id,
        judge_name: judge?.name,
        participant_name: currentParticipant.name,
        general_comment: comment,
        final_score: finalScore,
        status: submit ? "submitted" : "draft",
        ...(submit ? { submitted_at: new Date().toISOString() } : {}),
      };
      const writableEvalData = submit
        ? Object.fromEntries(
          Object.entries({ ...evalData, status: evaluation?.status === "unlocked" ? "unlocked" : "draft" })
            .filter(([key]) => key !== "submitted_at")
        )
        : evalData;

      if (evaluation) {
        await base44.entities.Evaluation.update(evaluation.id, writableEvalData);
      } else {
        evaluation = await base44.entities.Evaluation.create(writableEvalData);
      }

      for (const criterion of currentCriteria) {
        const raw = scores[criterion.id] ?? criterion.min_value;
        const norm = normalizeScore(criterion, raw);
        const weighted = norm * (criterion.weight / 100);
        const existing = await base44.entities.EvaluationScore.filter({ evaluation_id: evaluation.id, criterion_id: criterion.id });
        const scoreData = {
          evaluation_id: evaluation.id,
          criterion_id: criterion.id,
          criterion_name: criterion.name,
          raw_value: raw,
          normalized_value: norm,
          weighted_score: weighted,
        };

        if (existing.length > 0) await base44.entities.EvaluationScore.update(existing[0].id, scoreData);
        else await base44.entities.EvaluationScore.create(scoreData);
      }

      if (submit) {
        await base44.entities.Evaluation.update(evaluation.id, evalData);
      }

      await logAudit({
        action: submit ? "evaluation.submit" : "evaluation.save_draft",
        entityType: "Evaluation",
        entityId: evaluation.id,
        contestId,
        newValue: evalData,
      });

      const updatedEvals = await base44.entities.Evaluation.filter({ contest_id: contestId, judge_id: judge.id });
      setEvaluations(updatedEvals);

      toast.success(submit ? "Avaliacao enviada!" : "Rascunho salvo!");
      if (submit) {
        setJustSubmittedParticipantId(currentParticipant.id);
        confetti({
          particleCount: 140,
          spread: 85,
          startVelocity: 42,
          scalar: 0.95,
          origin: { y: 0.72 },
          colors: ["#06b6d4", "#8b5cf6", "#22c55e", "#facc15", "#ec4899"],
        });
      }
    } catch (error) {
      console.error("Erro ao salvar avaliacao:", error);
      toast.error("Nao foi possivel salvar esta avaliacao.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (accessError) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dk ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
        <div className="text-center max-w-sm px-6">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Acesso bloqueado</h2>
          <p className="text-sm text-gray-500 mb-4">{accessError}</p>
          <div className="flex justify-center gap-2">
            <Link to={backTarget}><Button variant="outline">Voltar</Button></Link>
            {!linkMode && <Button onClick={() => navigate("/judge")} className="bg-blue-600 hover:bg-blue-700">Meus concursos</Button>}
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dk ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
        <div className="text-center max-w-sm px-6">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">Sem atribuicoes ativas</h2>
          <p className="text-sm text-gray-500 mb-4">Voce ainda nao foi atribuido a nenhuma categoria neste concurso. Entre em contato com o organizador.</p>
          <Link to={backTarget}><Button variant="outline">Voltar</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${dk ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to={backTarget}><Button variant="ghost" size="icon" className={dk ? "text-gray-300 hover:bg-gray-800" : ""}><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{contest?.name}</h1>
            <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-500"}`}>Jurado: {judge?.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleDark} title={dk ? "Modo claro" : "Modo noturno"}
            className={dk ? "text-yellow-400 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}>
            {dk ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {categories.map((category) => (
              <Button key={category.id} size="sm"
                className={selectedCategory === category.id ? "" : dk ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700" : ""}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => { setSelectedCategory(category.id); setCurrentIndex(0); }}>
                {category.name}
              </Button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filteredParticipants.map((participant, index) => {
            const status = getEvalStatus(participant.id);
            const stateClass = index === currentIndex
              ? "border-blue-500 bg-blue-600 text-white"
              : status === "submitted"
                ? `border-green-500 ${dk ? "bg-green-900 text-green-400" : "bg-green-50 text-green-700"}`
                : dk
                  ? "border-gray-600 bg-gray-800 text-gray-300"
                  : "border-gray-300 bg-white text-gray-600";

            return (
              <button key={participant.id} onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-10 h-10 rounded-full text-sm font-medium border-2 transition-colors ${stateClass}`}>
                {index + 1}
              </button>
            );
          })}
        </div>

        {currentParticipant ? (
          <div>
            <Card className={`mb-4 ${dk ? "bg-gray-900 border-gray-700 text-gray-100" : ""}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-lg">
                  <span className="flex items-center gap-3 min-w-0">
                    {currentParticipant.photo_url ? (
                      <img src={currentParticipant.photo_url} alt={currentParticipant.name} className="h-16 w-16 rounded-full border border-border object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                        <User className="w-7 h-7" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{currentParticipant.name}</span>
                      {currentCategory?.name && (
                        <span className={`block text-sm font-normal ${dk ? "text-gray-400" : "text-gray-500"}`}>{currentCategory.name}</span>
                      )}
                    </span>
                  </span>
                  <span className="flex-shrink-0">
                    {getEvalStatus(currentParticipant.id) === "submitted" && <Badge className="bg-green-600 text-white">Enviado</Badge>}
                    {getEvalStatus(currentParticipant.id) === "unlocked" && <Badge className="bg-amber-500 text-white">Desbloqueado - Reeditar</Badge>}
                    {getEvalStatus(currentParticipant.id) === "draft" && <Badge variant="secondary">Rascunho</Badge>}
                    {getEvalStatus(currentParticipant.id) === "pending" && <Badge variant="outline">Pendente</Badge>}
                  </span>
                </CardTitle>
                {currentParticipant.code && <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-500"}`}>Codigo: {currentParticipant.code}</p>}
              </CardHeader>
              {currentParticipant.description && (
                <CardContent className="pt-0">
                  <p className={`text-sm ${dk ? "text-gray-400" : "text-gray-600"}`}>{currentParticipant.description}</p>
                </CardContent>
              )}
            </Card>

            {!currentEvaluationSubmitted && (
              <div className={`mb-4 rounded-xl border p-4 ${currentParticipantConfirmed ? dk ? "border-green-500/30 bg-green-500/10" : "border-green-200 bg-green-50" : dk ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${currentParticipantConfirmed ? dk ? "text-green-200" : "text-green-800" : dk ? "text-amber-200" : "text-amber-800"}`}>
                      {currentParticipantConfirmed ? "Participante confirmado" : "Confirme o participante antes de votar"}
                    </p>
                    <p className={`text-sm ${dk ? "text-gray-300" : "text-gray-600"}`}>
                      Verifique foto, nome{currentParticipant.code ? ` e codigo ${currentParticipant.code}` : ""} para evitar voto no candidato errado.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className={currentParticipantConfirmed ? "gap-2 bg-green-600 text-white hover:bg-green-700" : "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700"}
                    onClick={() => setConfirmedParticipantIds((prev) => new Set(prev).add(currentParticipant.id))}
                    disabled={currentParticipantConfirmed}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {currentParticipantConfirmed ? "Confirmado" : "Confirmar participante"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-4">
              {currentCriteria.map((criterion) => (
                <Card key={criterion.id} className={dk ? "bg-gray-900 border-gray-700 text-gray-100" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{criterion.name}</p>
                        {criterion.description && <p className={`text-xs ${dk ? "text-gray-400" : "text-gray-500"}`}>{criterion.description}</p>}
                      </div>
                      <Badge variant="outline">{criterion.weight}%</Badge>
                    </div>
                    <ScoreControl
                      criterion={criterion}
                      value={scores[criterion.id] ?? criterion.min_value}
                      onChange={(value) => setScores((prev) => ({ ...prev, [criterion.id]: value }))}
                      disabled={!isEvalEditable(currentParticipant.id) || !currentParticipantConfirmed}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className={`mb-4 ${dk ? "bg-gray-900 border-gray-700 text-gray-100" : ""}`}>
              <CardContent className="pt-4">
                <Label className="mb-2 block">Comentario Geral</Label>
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3}
                  placeholder="Observacoes sobre este participante..."
                  disabled={!isEvalEditable(currentParticipant.id) || !currentParticipantConfirmed} />
              </CardContent>
            </Card>

            {currentEvaluationSubmitted && (
              <div className={`festival-score-reveal rounded-xl border p-4 mb-4 shadow-lg ${dk ? "border-cyan-500/30 bg-cyan-500/10" : "border-cyan-200 bg-gradient-to-r from-cyan-50 via-violet-50 to-pink-50"} ${justSubmittedParticipantId === currentParticipant.id ? "ring-2 ring-cyan-300" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${dk ? "text-cyan-200" : "text-cyan-700"}`}>Nota Final</span>
                    <p className={`text-sm ${dk ? "text-gray-300" : "text-gray-600"}`}>Avaliacao enviada com sucesso.</p>
                  </div>
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500">
                    {Number(currentEvaluation?.final_score ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            <div className={`rounded-lg border px-4 py-3 mb-4 ${dk ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs ${dk ? "text-gray-400" : "text-gray-500"}`}>
                  Criterios respondidos: {currentCriteria.filter((criterion) => scores[criterion.id] !== undefined).length}/{currentCriteria.length}
                </span>
                {currentEvaluationSubmitted && (
                  <span className="text-2xl font-black text-blue-400">{Number(currentEvaluation?.final_score ?? 0).toFixed(1)}</span>
                )}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${currentCriteria.length > 0 ? Math.round((currentCriteria.filter((criterion) => scores[criterion.id] !== undefined).length / currentCriteria.length) * 100) : 0}%` }}
                />
              </div>
            </div>

            {isEvalEditable(currentParticipant.id) && (
              <div className="space-y-3">
                {getEvalStatus(currentParticipant.id) === "unlocked" && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-medium mb-1"><AlertTriangle className="w-4 h-4" /> Desbloqueada para reedicao</div>
                    Esta avaliacao foi desbloqueada pelo organizador. Revise suas notas e reenvie.
                    {evaluations.find((evaluation) => evaluation.participant_id === currentParticipant.id)?.unlock_reason && (
                      <p className="mt-1">Motivo: <strong>{evaluations.find((evaluation) => evaluation.participant_id === currentParticipant.id).unlock_reason}</strong></p>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || !currentParticipantConfirmed}
                    className={`flex-1 gap-2 h-12 text-base ${dk ? "border-gray-600 text-gray-200 hover:bg-gray-800" : ""}`}>
                    <Save className="w-5 h-5" /> Rascunho
                  </Button>
                  <Button onClick={() => setConfirmOpen(true)} disabled={saving || !currentParticipantConfirmed}
                    className="flex-1 gap-2 h-12 text-base bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-5 h-5" /> Enviar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button variant="ghost" onClick={() => setCurrentIndex((index) => Math.min(filteredParticipants.length - 1, index + 1))} disabled={currentIndex === filteredParticipants.length - 1} className="gap-2">
                Proximo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Card className={dk ? "bg-gray-900 border-gray-700" : ""}><CardContent className={`py-12 text-center ${dk ? "text-gray-500" : "text-gray-400"}`}>Nenhum participante nesta categoria.</CardContent></Card>
        )}
      </div>

      <SubmitConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); handleSave(true); }}
        participantName={currentParticipant?.name || ""}
        criteria={currentCriteria}
        scores={scores}
      />
    </div>
  );
}
