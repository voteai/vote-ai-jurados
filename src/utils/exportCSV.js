import { blendFinalScore, getPublicVoteAvgScore } from "./scoring";

/**
 * Gera e baixa um CSV com ranking, notas dos jurados e voto popular.
 */
export async function exportResultsCSV(base44, contest, categoryId, categoryName) {
  const [participants, evaluations, criteria, judges, publicVotes] = await Promise.all([
    base44.entities.Participant.filter({ contest_id: contest.id, category_id: categoryId }),
    base44.entities.Evaluation.filter({ contest_id: contest.id, category_id: categoryId, status: "submitted" }),
    base44.entities.EvaluationCriterion.filter({ contest_id: contest.id, category_id: categoryId }),
    base44.entities.Judge.filter({ contest_id: contest.id }),
    base44.entities.PublicVote.filter({ contest_id: contest.id, category_id: categoryId, status: "submitted" }),
  ]);

  const allScores = await Promise.all(
    evaluations.map((evaluation) => base44.entities.EvaluationScore.filter({ evaluation_id: evaluation.id }))
  );

  const scoresByEval = {};
  evaluations.forEach((evaluation, index) => {
    scoresByEval[evaluation.id] = allScores[index] || [];
  });

  const participantMap = {};
  participants
    .filter((participant) => participant.status !== "disqualified")
    .forEach((participant) => {
      const participantEvaluations = evaluations.filter((evaluation) => evaluation.participant_id === participant.id);
      const judgeScore = participantEvaluations.length > 0
        ? participantEvaluations.reduce((sum, evaluation) => sum + (Number(evaluation.final_score) || 0), 0) / participantEvaluations.length
        : null;
      const popular = getPublicVoteAvgScore(participant.id, publicVotes || []);

      participantMap[participant.id] = {
        ...participant,
        evaluations: participantEvaluations,
        judge_score: judgeScore,
        public_score: popular.avg,
        public_vote_count: popular.count,
        avg_score: blendFinalScore(judgeScore, popular.avg, contest.public_vote_weight, participantEvaluations.length, popular.count),
      };
    });

  const ranked = Object.values(participantMap).sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));
  const criteriaNames = criteria.map((criterion) => criterion.name);
  const judgeNames = judges.map((judge) => judge.name);

  const headers = [
    "Posicao",
    "Participante",
    "Codigo",
    "Nota Final",
    "Media Jurados",
    "Media Voto Popular",
    "Peso Voto Popular",
    "N Avaliacoes Jurados",
    "N Votos Populares",
    ...judgeNames.flatMap((judgeName) => [
      `${judgeName} - Nota Geral`,
      ...criteriaNames.map((criterionName) => `${judgeName} | ${criterionName}`),
    ]),
  ];

  const rows = ranked.map((participant, index) => {
    const cells = [
      index + 1,
      participant.name,
      participant.code || "",
      participant.avg_score !== null ? participant.avg_score.toFixed(2) : "Sem nota",
      participant.judge_score !== null ? participant.judge_score.toFixed(2) : "",
      participant.public_score !== null ? participant.public_score.toFixed(2) : "",
      Number(contest.public_vote_weight || 0),
      participant.evaluations.length,
      participant.public_vote_count,
    ];

    judges.forEach((judge) => {
      const evaluation = participant.evaluations.find((item) => item.judge_id === judge.id);
      if (evaluation) {
        cells.push(evaluation.final_score?.toFixed(2) ?? "");
        const evaluationScores = scoresByEval[evaluation.id] || [];
        criteria.forEach((criterion) => {
          const score = evaluationScores.find((item) => item.criterion_id === criterion.id);
          cells.push(score ? score.normalized_value?.toFixed(2) ?? "" : "");
        });
      } else {
        cells.push("");
        criteria.forEach(() => cells.push(""));
      }
    });

    return cells;
  });

  const escape = (value) => {
    const stringValue = String(value ?? "");
    return stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")
      ? `"${stringValue.replace(/"/g, '""')}"`
      : stringValue;
  };

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${contest.name} - ${categoryName} - Resultados.csv`.replace(/[/\\?%*:|"<>]/g, "-");
  link.click();
  URL.revokeObjectURL(url);
}
