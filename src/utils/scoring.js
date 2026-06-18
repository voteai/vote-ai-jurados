/**
 * Vote Aí Jurados — Utilitário de cálculo de notas
 * Centraliza a lógica de normalização e pontuação ponderada.
 */

/**
 * Normaliza um valor bruto para a escala 0-100 com base nos limites do critério.
 * @param {object} criterion - Critério com min_value e max_value
 * @param {number} rawValue - Valor bruto inserido pelo jurado
 * @returns {number} Valor normalizado entre 0 e 100
 */
export function normalizeScore(criterion, rawValue) {
  const range = Number(criterion.max_value) - Number(criterion.min_value);
  if (range === 0) return 0;
  return ((Number(rawValue) - Number(criterion.min_value)) / range) * 100;
}

/**
 * Calcula a nota ponderada final de uma avaliação a partir dos EvaluationScores.
 * Retorna null se os pesos não somam 100% ou se não há scores.
 *
 * Fórmula: Σ (normalized_value × weight / 100)
 * Pré-condição: soma dos pesos dos critérios ativos = 100%
 *
 * @param {string} evaluationId - ID da avaliação
 * @param {Array} activeCriteria - Critérios ativos da categoria
 * @param {Array} allScores - Array de EvaluationScore para busca
 * @returns {number|null} Nota final entre 0 e 100, ou null se inválido
 */
export function getWeightedScore(evaluationId, activeCriteria, allScores) {
  if (!evaluationId || !activeCriteria?.length) return null;

  const totalWeight = activeCriteria.reduce((sum, c) => sum + Number(c.weight), 0);
  // Tolerância de ±0.5 para erros de ponto flutuante
  if (Math.abs(totalWeight - 100) > 0.5) return null;

  const scores = allScores.filter(s => s.evaluation_id === evaluationId);
  if (scores.length === 0) return null;

  return activeCriteria.reduce((sum, c) => {
    const s = scores.find(sc => sc.criterion_id === c.id);
    const norm = s ? Number(s.normalized_value ?? 0) : 0;
    return sum + norm * (Number(c.weight) / 100);
  }, 0);
}

/**
 * Calcula a nota ponderada em tempo real a partir do mapa de scores locais (rascunho).
 * Usado na tela do jurado antes do envio.
 *
 * @param {Array} criteria - Critérios ativos da categoria
 * @param {object} scoresMap - Mapa { criterion_id: raw_value }
 * @returns {number} Nota estimada entre 0 e 100
 */
export function calcLiveScore(criteria, scoresMap) {
  if (!criteria?.length) return 0;

  let total = 0;
  let coveredWeight = 0;

  criteria.forEach(c => {
    const raw = scoresMap[c.id];
    if (raw !== undefined && raw !== null) {
      const norm = normalizeScore(c, raw);
      total += norm * (Number(c.weight) / 100);
      coveredWeight += Number(c.weight);
    }
  });

  // Se nenhum critério foi respondido, retorna 0
  if (coveredWeight === 0) return 0;

  // Projeta a nota considerando apenas os critérios respondidos
  return total;
}

/**
 * Calcula a média das notas ponderadas de múltiplos jurados para um participante.
 * Ignora avaliações com score nulo (pesos inválidos).
 *
 * @param {string} participantId
 * @param {Array} evaluations - Avaliações submitted da categoria
 * @param {Array} activeCriteria - Critérios ativos
 * @param {Array} allScores - Todos os EvaluationScores da categoria
 * @returns {{ avg: number|null, count: number }}
 */
export function getParticipantAvgScore(participantId, evaluations, activeCriteria, allScores) {
  const participantEvals = evaluations.filter(e => e.participant_id === participantId);
  const scores = participantEvals
    .map(ev => getWeightedScore(ev.id, activeCriteria, allScores))
    .filter(s => s !== null);

  if (scores.length === 0) return { avg: null, count: 0 };

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { avg, count: scores.length };
}

export function roundScore(score, decimals = 4) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const factor = 10 ** decimals;
  return Math.round(Number(score) * factor) / factor;
}

export function getPublicVoteAvgScore(participantId, publicVotes) {
  const submittedVotes = publicVotes
    .filter((vote) => vote.participant_id === participantId && vote.status === "submitted")
    .map((vote) => Number(vote.final_score))
    .filter((score) => Number.isFinite(score));

  if (submittedVotes.length === 0) return { avg: null, count: 0 };

  const avg = submittedVotes.reduce((sum, score) => sum + score, 0) / submittedVotes.length;
  return { avg: roundScore(avg), count: submittedVotes.length };
}

export function blendFinalScore(judgeAvg, publicAvg, publicWeight = 0) {
  const judgeScore = Number.isFinite(Number(judgeAvg)) ? Number(judgeAvg) : null;
  const popularScore = Number.isFinite(Number(publicAvg)) ? Number(publicAvg) : null;
  const weight = Math.max(0, Math.min(100, Number(publicWeight) || 0));

  if (judgeScore === null && popularScore === null) return null;
  if (weight === 0 || popularScore === null) return roundScore(judgeScore);
  if (judgeScore === null) return roundScore(popularScore);

  return roundScore((judgeScore * (100 - weight) + popularScore * weight) / 100);
}
