import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Trophy, Medal, RefreshCw, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { blendFinalScore, getPublicVoteAvgScore } from "@/utils/scoring";

export default function LiveRanking() {
  const { contestId } = useParams();
  const [contest, setContest] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadBase();
    return () => clearInterval(intervalRef.current);
  }, [contestId]);

  useEffect(() => {
    if (selectedCat) {
      calcRanking(selectedCat);
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => calcRanking(selectedCat), 30000);
    }
  }, [selectedCat]);

  const loadBase = async () => {
    const [cRes, cats] = await Promise.all([
      base44.entities.Contest.filter({ id: contestId }),
      base44.entities.Category.filter({ contest_id: contestId }),
    ]);
    setContest(cRes[0] || null);
    setCategories(cats);
    if (cats.length > 0) setSelectedCat(cats[0].id);
    setLoading(false);
  };

  const calcRanking = async (catId) => {
    const [participants, evaluations, publicVotes] = await Promise.all([
      base44.entities.Participant.filter({ contest_id: contestId, category_id: catId }),
      base44.entities.Evaluation.filter({ contest_id: contestId, category_id: catId, status: "submitted" }),
      base44.entities.PublicVote.filter({ contest_id: contestId, category_id: catId, status: "submitted" }),
    ]);

    const scores = {};
    const counts = {};
    evaluations.forEach(ev => {
      if (!scores[ev.participant_id]) { scores[ev.participant_id] = 0; counts[ev.participant_id] = 0; }
      scores[ev.participant_id] += ev.final_score || 0;
      counts[ev.participant_id]++;
    });

    const ranked = participants
      .filter(p => p.status !== "disqualified")
      .map(p => {
        const judgeAvg = counts[p.id] ? scores[p.id] / counts[p.id] : null;
        const popular = getPublicVoteAvgScore(p.id, publicVotes || []);
        return {
          ...p,
          avg_score: blendFinalScore(judgeAvg, popular.avg, contest?.public_vote_weight),
          judge_score: judgeAvg,
          public_score: popular.avg,
          total_judges: counts[p.id] || 0,
          total_public_votes: popular.count,
        };
      })
      .sort((a, b) => (b.avg_score ?? -1) - (a.avg_score ?? -1));

    setRanking(ranked);
    setLastUpdated(new Date());
  };

  const medalColors = [
    "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]",
    "text-slate-300 drop-shadow-[0_0_4px_rgba(200,200,200,0.6)]",
    "text-amber-600 drop-shadow-[0_0_4px_rgba(217,119,6,0.6)]"
  ];
  const podiumBg = [
    "from-yellow-900/40 to-yellow-800/20 border-yellow-500/40",
    "from-slate-700/40 to-slate-600/20 border-slate-400/40",
    "from-amber-900/40 to-amber-800/20 border-amber-600/40"
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );

  if (!contest) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
      Concurso não encontrado.
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-xs text-red-400 uppercase tracking-widest font-semibold">Ao Vivo</span>
            </div>
            <h1 className="text-xl font-bold text-white">{contest.name}</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-0.5">
                Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calcRanking(selectedCat)}
            className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCat === cat.id
                    ? "bg-yellow-400 text-gray-900"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Ranking list */}
        {ranking.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma nota registrada ainda.</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {ranking.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border bg-gradient-to-r ${
                    i < 3 ? podiumBg[i] : "from-gray-800/50 to-gray-800/30 border-gray-700/40"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center flex-shrink-0">
                      {i < 3
                        ? <Medal className={`w-7 h-7 mx-auto ${medalColors[i]}`} />
                        : <span className="text-gray-500 font-bold text-lg">{i + 1}</span>
                      }
                    </div>
                    <div>
                      <p className={`font-semibold ${i === 0 ? "text-yellow-300 text-lg" : "text-white"}`}>{p.name}</p>
                      {p.code && <p className="text-xs text-gray-500">#{p.code}</p>}
                      <p className="text-xs text-gray-500">
                        {p.total_judges} jurado(s)
                        {Number(contest?.public_vote_weight || 0) > 0 ? ` + ${p.total_public_votes} voto(s) popular(es)` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {p.avg_score !== null ? (
                      <span className={`font-black tabular-nums ${
                        i === 0 ? "text-3xl text-yellow-400" :
                        i === 1 ? "text-2xl text-slate-300" :
                        i === 2 ? "text-2xl text-amber-500" :
                        "text-xl text-gray-300"
                      }`}>
                        {p.avg_score.toFixed(1)}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-700 text-gray-400 border-0">Sem nota</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        <p className="text-center text-xs text-gray-700 mt-8">Atualização automática a cada 30 segundos</p>
      </div>
    </div>
  );
}
