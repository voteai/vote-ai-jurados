import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Clock, AlertTriangle, ClipboardCheck, User } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function JudgePanel() {
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [contests, setContests] = useState({});
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const authUser = await base44.auth.me();
      setUser(authUser);

      const userEmail = String(authUser?.email || "").trim().toLowerCase();
      if (!userEmail) {
        setJudges([]);
        setAssignments([]);
        setContests({});
        return;
      }

      const judgeRecords = await base44.entities.Judge.filter({ email: userEmail });
      const ownJudges = judgeRecords.filter((judge) =>
        String(judge.email || "").trim().toLowerCase() === userEmail &&
        judge.invitation_status === "accepted"
      );
      setJudges(ownJudges);

      if (ownJudges.length === 0) {
        setAssignments([]);
        setContests({});
        return;
      }

      const contestIds = [...new Set(ownJudges.map((judge) => judge.contest_id).filter(Boolean))];
      const allContests = await base44.entities.Contest.list();
      const contestMap = {};
      allContests.forEach((contest) => {
        if (contestIds.includes(contest.id)) contestMap[contest.id] = contest;
      });
      setContests(contestMap);

      const activeAssignments = [];
      for (const judge of ownJudges) {
        const judgeAssignments = await base44.entities.JudgeAssignment.filter({ judge_id: judge.id, status: "active" });
        activeAssignments.push(...judgeAssignments.map((assignment) => ({ ...assignment, judge })));
      }
      setAssignments(activeAssignments);
    } catch (error) {
      console.error("Erro ao carregar painel do jurado:", error);
      setLoadError("Nao foi possivel carregar seu painel de jurado agora.");
    } finally {
      setLoading(false);
    }
  };

  const activeContestCards = useMemo(() => {
    return judges.flatMap((judge) => {
      const contest = contests[judge.contest_id];
      if (!contest || !["active", "evaluating"].includes(contest.status)) return [];
      const judgeAssignments = assignments.filter((assignment) => assignment.judge_id === judge.id);
      return [{ contest, judge, assignmentCount: judgeAssignments.length }];
    });
  }, [assignments, contests, judges]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <AppLogo size="md" />
          <p className="text-muted-foreground mt-2 text-sm">Ola, {user?.full_name || user?.email}</p>
        </div>

        {loadError ? (
          <Card>
            <CardContent className="py-12 text-center text-red-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-80" />
              <p>{loadError}</p>
              <Button className="mt-4" onClick={loadData}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : judges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Voce ainda nao tem aprovacao ativa como jurado.</p>
              <p className="text-sm mt-2">Aguarde o organizador aprovar seu cadastro e atribuir uma categoria.</p>
            </CardContent>
          </Card>
        ) : activeContestCards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum concurso ativo para avaliar no momento.</p>
              <p className="text-sm mt-2">Quando o organizador ativar o concurso e suas atribuicoes, ele aparecera aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeContestCards.map(({ contest, judge, assignmentCount }) => (
              <Card key={`${contest.id}-${judge.id}`} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      {judge.photo_url ? (
                        <img src={judge.photo_url} alt={judge.name} className="h-10 w-10 rounded-full border border-border object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                          <User className="h-5 w-5" />
                        </span>
                      )}
                      <span className="flex items-center gap-2 min-w-0">
                        <Trophy className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                        <span className="truncate">{contest.name}</span>
                      </span>
                    </span>
                    <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4 space-y-1">
                    <p>{contest.location} - {contest.start_date}</p>
                    <p className="flex items-center gap-1">
                      <ClipboardCheck className="w-4 h-4" />
                      {assignmentCount} atribuicao(oes) ativa(s)
                    </p>
                  </div>
                  <Link to={`/judge/${contest.id}/${judge.id}`}>
                    <Button className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700">
                      <Star className="w-4 h-4" /> Avaliar Participantes
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
