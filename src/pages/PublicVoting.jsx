import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Trophy, AlertCircle, User, CheckCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import ScoreControl from "@/components/evaluation/ScoreControl";
import { calcLiveScore, normalizeScore } from "@/utils/scoring";
import confetti from "canvas-confetti";
import { logAudit } from "@/lib/audit-log";

function getFingerprint() {
  const key = "public_vote_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, fp);
  }
  return fp;
}

export default function PublicVoting({ jurorOnly = false }) {
  const { contestId } = useParams();
  const [contest, setContest] = useState(null);
  const [categories, setCategories] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [votes, setVotes] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeParticipantId, setActiveParticipantId] = useState(null);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [justSubmittedVoteId, setJustSubmittedVoteId] = useState(null);
  const [voterKey, setVoterKey] = useState("");
  const [accessError, setAccessError] = useState("");
  const [jurorName, setJurorName] = useState("");

  useEffect(() => { loadData(); }, [contestId]);

  const loadData = async () => {
    setLoading(true);
    setAccessError("");

    try {
      let currentVoterKey = getFingerprint();

      if (jurorOnly) {
        const authUser = await base44.auth.me();
        const email = String(authUser?.email || "").trim().toLowerCase();
        if (!email) {
          setAccessError("Entre com a conta cadastrada pelo organizador para acessar esta votacao.");
          return;
        }

        const judgeRecords = await base44.entities.Judge.filter({ email });
        const allowedJudge = (judgeRecords || []).find((judge) =>
          String(judge.email || "").trim().toLowerCase() === email &&
          String(judge.contest_id || "") === String(contestId) &&
          judge.invitation_status !== "declined" &&
          judge.active !== false
        );

        if (!allowedJudge) {
          setAccessError("Este link e restrito aos jurados cadastrados pelo organizador.");
          return;
        }

        currentVoterKey = `juror_vote:${allowedJudge.id}`;
        setJurorName(allowedJudge.name || authUser.full_name || authUser.email);
      }

      setVoterKey(currentVoterKey);

      const [contestRes, catsRes, partsRes, criteriaRes, allVotes] = await Promise.all([
        base44.entities.Contest.filter({ id: contestId }),
        base44.entities.Category.filter({ contest_id: contestId }),
        base44.entities.Participant.filter({ contest_id: contestId }),
        base44.entities.EvaluationCriterion.filter({ contest_id: contestId }),
        base44.entities.PublicVote.filter({ contest_id: contestId }),
      ]);
      const foundContest = contestRes[0];
      const validCategories = catsRes || [];
      setContest(foundContest);
      setCategories(validCategories);
      setParticipants((partsRes || []).filter((participant) => participant.status !== "disqualified"));
      setCriteria((criteriaRes || []).filter((criterion) => criterion.active !== false));
      setVotes(allVotes || []);
      setMyVotes((allVotes || []).filter((vote) => vote.voter_fingerprint === currentVoterKey));
      if (validCategories.length > 0) setSelectedCategory(validCategories[0].id);
    } catch (error) {
      console.error("Erro ao carregar votacao:", error);
      setAccessError("Nao foi possivel carregar esta votacao agora.");
    } finally {
      setLoading(false);
    }
  };

  const categoryCriteria = useMemo(() => {
    return criteria.filter((criterion) => criterion.category_id === selectedCategory);
  }, [criteria, selectedCategory]);

  const filteredParticipants = selectedCategory
    ? participants.filter((participant) => participant.category_id === selectedCategory)
    : participants;

  const alreadyVotedInCategory = myVotes.some((vote) => vote.category_id === selectedCategory);
  const myCategoryVote = myVotes.find((vote) => vote.category_id === selectedCategory);

  const voteCountFor = (participantId) =>
    votes.filter((vote) => vote.participant_id === participantId && vote.category_id === selectedCategory).length;

  const openParticipant = (participant) => {
    if (alreadyVotedInCategory) return;
    setActiveParticipantId((current) => current === participant.id ? null : participant.id);
    const initialScores = {};
    categoryCriteria.forEach((criterion) => {
      initialScores[criterion.id] = scores[participant.id]?.[criterion.id] ?? criterion.min_value ?? 0;
    });
    setScores((prev) => ({ ...prev, [participant.id]: initialScores }));
  };

  const participantScores = (participantId) => scores[participantId] || {};
  const participantFinalScore = (participantId) => calcLiveScore(categoryCriteria, participantScores(participantId));

  const handleScoreChange = (participantId, criterionId, value) => {
    setScores((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] || {}),
        [criterionId]: value,
      },
    }));
  };

  const handleVote = async (participant) => {
    if (alreadyVotedInCategory) {
      toast.error("Voce ja votou nesta categoria.");
      return;
    }

    if (categoryCriteria.length === 0) {
      toast.error("Esta categoria ainda nao possui criterios de avaliacao.");
      return;
    }

    const currentScores = participantScores(participant.id);
    const missingCriterion = categoryCriteria.some((criterion) => currentScores[criterion.id] === undefined || currentScores[criterion.id] === null);
    if (missingCriterion) {
      toast.error("Preencha todos os criterios antes de enviar.");
      return;
    }

    const criteriaScores = categoryCriteria.map((criterion) => {
      const raw = currentScores[criterion.id];
      const normalized = normalizeScore(criterion, raw);
      return {
        criterion_id: criterion.id,
        criterion_name: criterion.name,
        control_type: criterion.control_type,
        raw_value: raw,
        normalized_value: normalized,
        weight: Number(criterion.weight || 0),
        weighted_score: normalized * (Number(criterion.weight || 0) / 100),
      };
    });

    setVoting(true);
    try {
      const newVote = await base44.entities.PublicVote.create({
        contest_id: contestId,
        category_id: participant.category_id,
        participant_id: participant.id,
        participant_name: participant.name,
        voter_fingerprint: voterKey || getFingerprint(),
        voter_user_id: jurorOnly ? jurorName : "",
        final_score: participantFinalScore(participant.id),
        scores_json: JSON.stringify(criteriaScores),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
      await logAudit({
        action: "public_vote.submit",
        entityType: "PublicVote",
        entityId: newVote?.id,
        contestId,
        newValue: {
          category_id: participant.category_id,
          participant_id: participant.id,
          final_score: participantFinalScore(participant.id),
        },
      });
      setVotes((prev) => [...prev, newVote]);
      setMyVotes((prev) => [...prev, newVote]);
      setActiveParticipantId(participant.id);
      setJustSubmittedVoteId(newVote.id);
      confetti({
        particleCount: 150,
        spread: 90,
        startVelocity: 42,
        scalar: 0.95,
        origin: { y: 0.72 },
        colors: ["#ec4899", "#8b5cf6", "#06b6d4", "#facc15", "#22c55e"],
      });
      toast.success(`Avaliacao registrada para ${participant.name}!`);
    } catch (error) {
      console.error("Erro ao registrar voto popular:", error);
      toast.error("Nao foi possivel registrar sua avaliacao.");
    } finally {
      setVoting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
    </div>
  );

  if (accessError) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500 px-4 text-center">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-lg font-medium">Acesso restrito</p>
      <p className="text-sm">{accessError}</p>
    </div>
  );

  if (!contest) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500">
      <AlertCircle className="w-10 h-10" />
      <p>Concurso nao encontrado.</p>
    </div>
  );

  if (!jurorOnly && !contest.allow_public_vote) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500 px-4 text-center">
      <Trophy className="w-12 h-12 opacity-30" />
      <p className="text-lg font-medium">Votacao popular nao disponivel</p>
      <p className="text-sm">O organizador nao habilitou a votacao publica para este concurso.</p>
    </div>
  );

  if (!["active", "evaluating"].includes(contest.status)) {
    const isDraft = contest.status === "draft";
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500 px-4 text-center">
        <Trophy className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">{isDraft ? "Votacao ainda nao aberta" : "Votacao encerrada"}</p>
        <p className="text-sm">
          {isDraft
            ? "O organizador ainda precisa abrir a votacao popular deste concurso."
            : "A votacao publica para este concurso nao esta disponivel no momento."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-pink-500" />
            <span className="text-sm font-medium text-pink-600 uppercase tracking-wide">
              {jurorOnly ? "Votacao dos Jurados" : "Votacao Popular"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{contest.name}</h1>
          {jurorOnly && jurorName && <p className="text-sm text-gray-500 mt-1">Jurado: {jurorName}</p>}
          {contest.location && <p className="text-sm text-gray-500 mt-1">{contest.location}</p>}
          {!jurorOnly && contest.public_vote_weight > 0 && (
            <Badge className="mt-2 bg-pink-100 text-pink-700 border-pink-200">
              Vale {contest.public_vote_weight}% da nota final
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {categories.length > 1 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {categories.map((category) => (
              <Button key={category.id} size="sm"
                variant={selectedCategory === category.id ? "default" : "outline"}
                className={selectedCategory === category.id ? "bg-pink-600 hover:bg-pink-700 border-pink-600" : ""}
                onClick={() => { setSelectedCategory(category.id); setActiveParticipantId(null); }}>
                {category.name}
              </Button>
            ))}
          </div>
        )}

        <div className={`rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2 ${alreadyVotedInCategory ? "bg-green-50 border border-green-200 text-green-700" : "bg-pink-50 border border-pink-200 text-pink-700"}`}>
          {alreadyVotedInCategory
            ? <><CheckCircle className="w-4 h-4 fill-green-500 text-green-500" /> Voce ja avaliou {myCategoryVote?.participant_name || "um participante"} nesta categoria.</>
            : <><Heart className="w-4 h-4" /> Escolha um participante e avalie usando os criterios oficiais.</>
          }
        </div>

        {categoryCriteria.length === 0 && (
          <Card className="mb-5 border-amber-200 bg-amber-50">
            <CardContent className="py-4 text-sm text-amber-800">
              Esta categoria ainda nao possui criterios de avaliacao. O publico podera votar quando os criterios forem configurados.
            </CardContent>
          </Card>
        )}

        {filteredParticipants.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-400">Nenhum participante nesta categoria.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filteredParticipants.map((participant) => {
              const isOpen = activeParticipantId === participant.id;
              const isChosen = myCategoryVote?.participant_id === participant.id;
              const showSubmittedResult = isChosen && myCategoryVote?.final_score !== undefined && myCategoryVote?.final_score !== null;
              const count = voteCountFor(participant.id);
              return (
                <Card key={participant.id} className={`transition-all duration-200 ${isChosen ? "border-green-400 shadow-md shadow-green-100" : isOpen ? "border-pink-300 shadow-md shadow-pink-100" : "hover:shadow-md"}`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-4">
                      {participant.photo_url ? (
                        <img src={participant.photo_url} alt={participant.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{participant.name}</p>
                        {participant.code && <p className="text-xs text-gray-400">#{participant.code}</p>}
                        {participant.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{participant.description}</p>
                        )}
                        {isChosen && myCategoryVote?.final_score !== undefined && myCategoryVote?.final_score !== null && (
                          <p className="mt-1 text-sm font-semibold text-green-600">
                            Nota final: {Number(myCategoryVote.final_score).toFixed(1)}
                          </p>
                        )}
                        {count > 0 && <p className="text-xs text-pink-500 mt-1">{count} avaliacao{count !== 1 ? "oes" : ""}</p>}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openParticipant(participant)}
                        disabled={alreadyVotedInCategory || categoryCriteria.length === 0}
                        className={`gap-1.5 ${isChosen ? "bg-green-600 hover:bg-green-600 text-white" : "bg-pink-500 hover:bg-pink-600 text-white"}`}
                      >
                        {isChosen ? <><CheckCircle className="w-4 h-4" /> Avaliado</> : <><ChevronDown className="w-4 h-4" /> Avaliar</>}
                      </Button>
                    </div>

                    {(isOpen || isChosen) && (
                      <div className="mt-5 space-y-4 border-t pt-4">
                        {!alreadyVotedInCategory && categoryCriteria.map((criterion) => (
                          <div key={criterion.id} className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">{criterion.name}</p>
                                {criterion.description && <p className="text-xs text-gray-500">{criterion.description}</p>}
                              </div>
                              <Badge variant="outline">{criterion.weight}%</Badge>
                            </div>
                            <ScoreControl
                              criterion={criterion}
                              value={participantScores(participant.id)[criterion.id] ?? criterion.min_value}
                              onChange={(value) => handleScoreChange(participant.id, criterion.id, value)}
                              disabled={voting}
                            />
                          </div>
                        ))}

                        {showSubmittedResult ? (
                          <div className={`festival-score-reveal rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 via-violet-50 to-cyan-50 px-4 py-4 shadow-lg ${justSubmittedVoteId === myCategoryVote.id ? "ring-2 ring-pink-300" : ""}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                              <span className="text-xs font-semibold uppercase tracking-wide text-pink-700">Nota Final</span>
                              <p className="text-sm text-gray-600">Avaliacao enviada com sucesso.</p>
                              </div>
                              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500">
                                {Number(myCategoryVote.final_score).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-700">
                              A nota final sera exibida depois que voce enviar a avaliacao.
                            </div>

                            <Button
                              className="w-full bg-pink-600 text-white hover:bg-pink-700"
                              disabled={voting}
                              onClick={() => handleVote(participant)}
                            >
                              {voting ? "Enviando..." : jurorOnly ? "Enviar avaliacao" : "Enviar avaliacao popular"}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          {jurorOnly ? "1 avaliacao por jurado em cada categoria." : "1 avaliacao por dispositivo por categoria - votacao anonima e segura"}
        </p>
      </div>
    </div>
  );
}
