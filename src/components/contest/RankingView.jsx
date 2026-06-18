import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, RefreshCw, Medal, Download } from "lucide-react";
import { toast } from "sonner";
import { exportResultsCSV } from "@/utils/exportCSV";
import { blendFinalScore, getParticipantAvgScore, getPublicVoteAvgScore } from "@/utils/scoring";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";
import { logAudit } from "@/lib/audit-log";

export default function RankingView({ contest, isAdmin }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (contest?.id) loadCategories();
  }, [contest?.id]);

  useEffect(() => {
    if (contest?.id && selectedCat) calcRanking();
  }, [contest?.id, selectedCat]);

  const loadCategories = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const cats = await base44.entities.Category.filter({ contest_id: contest.id });
      const validCats = asArray(cats).filter(hasValidId).sort(byDisplayOrder);
      setCategories(validCats);
      setSelectedCat(validCats.length > 0 ? idValue(validCats[0].id) : "");
      if (validCats.length === 0) setRanking([]);
    } catch (error) {
      console.error("Erro ao carregar categorias do ranking:", error);
      setLoadError("Nao foi possivel carregar a classificacao.");
      setCategories([]);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const calcRanking = async () => {
    if (!contest?.id || !selectedCat) return;
    setLoading(true);
    setLoadError("");

    try {
      const [participants, evaluations, criteriaList, publicVotes] = await Promise.all([
        base44.entities.Participant.filter({ contest_id: contest.id, category_id: selectedCat }),
        base44.entities.Evaluation.filter({ contest_id: contest.id, category_id: selectedCat, status: "submitted" }),
        base44.entities.EvaluationCriterion.filter({ contest_id: contest.id, category_id: selectedCat }),
        base44.entities.PublicVote.filter({ contest_id: contest.id, category_id: selectedCat, status: "submitted" }),
      ]);

      const validParticipants = asArray(participants).filter(hasValidId);
      const validEvaluations = asArray(evaluations).filter(hasValidId);
      const activeCriteria = asArray(criteriaList).filter((criterion) => hasValidId(criterion) && criterion.active !== false);
      const scoreArrays = await Promise.all(
        validEvaluations.map((evaluation) => base44.entities.EvaluationScore.filter({ evaluation_id: evaluation.id }))
      );
      const allScores = scoreArrays.flat();

      const ranked = validParticipants
        .filter((participant) => participant.status !== "disqualified")
        .map((participant) => {
          const judge = getParticipantAvgScore(participant.id, validEvaluations, activeCriteria, allScores);
          const popular = getPublicVoteAvgScore(participant.id, asArray(publicVotes));
          const finalScore = blendFinalScore(judge.avg, popular.avg, contest.public_vote_weight);
          return {
            ...participant,
            avg_score: finalScore,
            judge_score: judge.avg,
            public_score: popular.avg,
            total_judges: judge.count,
            total_public_votes: popular.count,
          };
        })
        .sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));

      setRanking(ranked);
    } catch (error) {
      console.error("Erro ao calcular ranking:", error);
      setLoadError("Nao foi possivel calcular a classificacao.");
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    const catName = categories.find((category) => idValue(category.id) === selectedCat)?.name || "Categoria";
    toast.promise(
      exportResultsCSV(base44, contest, selectedCat, catName),
      { loading: "Gerando planilha...", success: "Planilha baixada!", error: "Erro ao exportar." }
    );
  };

  const publishResults = async () => {
    if (!contest?.id || !selectedCat) return;
    if (!confirm("Publicar resultados desta categoria?")) return;

    const catName = categories.find((category) => idValue(category.id) === selectedCat)?.name || "";
    const scoredRanking = ranking.filter((participant) => participant.avg_score !== null && participant.avg_score !== undefined);
    const existingResults = await Promise.all(
      scoredRanking.map((participant) => base44.entities.Result.filter({ contest_id: contest.id, category_id: selectedCat, participant_id: participant.id }))
    );

    await Promise.all(
      scoredRanking.map((participant, index) => {
        const data = {
          contest_id: contest.id,
          category_id: selectedCat,
          participant_id: participant.id,
          participant_name: safeText(participant.name, "Sem nome"),
          category_name: catName,
          final_score: participant.avg_score,
          judge_score: participant.judge_score,
          public_score: participant.public_score,
          rank_position: index + 1,
          total_judges: participant.total_judges,
          total_public_votes: participant.total_public_votes,
          status: "published",
          published_at: new Date().toISOString(),
        };
        const existing = existingResults[index];
        return existing.length > 0
          ? base44.entities.Result.update(existing[0].id, data)
          : base44.entities.Result.create(data);
      })
    );
    await logAudit({
      action: "result.publish",
      entityType: "Result",
      entityId: selectedCat,
      contestId: contest.id,
      newValue: { category_id: selectedCat, count: scoredRanking.length },
    });
    toast.success("Resultados publicados!");
  };

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={selectedCat} onValueChange={setSelectedCat}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria..." /></SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={idValue(category.id)} value={idValue(category.id)}>
                {safeText(category.name, "Sem nome")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={calcRanking} className="gap-2" disabled={!selectedCat}>
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
        {isAdmin && <Button size="sm" onClick={publishResults} className="gap-2 bg-green-600 hover:bg-green-700" disabled={!selectedCat}><Trophy className="w-4 h-4" /> Publicar</Button>}
        {isAdmin && selectedCat && <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2"><Download className="w-4 h-4" /> Exportar CSV</Button>}
      </div>

      {loadError ? (
        <Card><CardContent className="py-8 text-center text-red-600">{loadError}</CardContent></Card>
      ) : loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : ranking.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum resultado disponivel.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {ranking.map((participant, index) => (
            <div key={idValue(participant.id)} className={`p-4 bg-card text-card-foreground rounded-lg border border-border ${index < 3 ? "border-l-4 border-l-yellow-400" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center">
                    {index < 3 ? <Medal className={`w-6 h-6 mx-auto ${medalColors[index]}`} /> : <span className="text-muted-foreground font-medium">{index + 1}o</span>}
                  </div>
                  <div>
                    <p className="font-medium">{safeText(participant.name, "Sem nome")}</p>
                    <p className="text-xs text-muted-foreground">
                      {participant.total_judges} jurado(s)
                      {contest.public_vote_weight > 0 ? ` + ${participant.total_public_votes} voto(s) popular(es)` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {participant.avg_score !== null && participant.avg_score !== undefined
                    ? <span className="text-xl font-bold text-blue-600">{Number(participant.avg_score).toFixed(1)}</span>
                    : <Badge variant="secondary">Sem nota</Badge>}
                </div>
              </div>
              {participant.avg_score !== null && participant.avg_score !== undefined && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, Number(participant.avg_score) || 0))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
