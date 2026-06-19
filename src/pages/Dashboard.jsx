import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trophy, Star, ClipboardList, Plus, TrendingUp, Sun, Moon, Settings, SlidersHorizontal, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useDarkMode } from "@/hooks/useDarkMode";
import AppLogo from "@/components/AppLogo";
import { canManageContest } from "@/lib/contest-permissions";
import { logAudit } from "@/lib/audit-log";

const statusLabel = { draft: "Rascunho", active: "Ativo", evaluating: "Avaliando", closed: "Encerrado", published: "Publicado" };
const statusColor = { draft: "secondary", active: "default", evaluating: "default", closed: "secondary", published: "default" };
const DASHBOARD_TIMEOUT_MS = 9000;

const withTimeout = (promise, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), DASHBOARD_TIMEOUT_MS);
    }),
  ]);

export default function Dashboard() {
  const [contests, setContests] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, evaluating: 0, closed: 0 });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dark, setDark] = useDarkMode();
  const [statusDialog, setStatusDialog] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("draft");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [u, c] = await withTimeout(
        Promise.all([
          base44.auth.me(),
          base44.entities.Contest.list("-created_date", 50),
        ]),
        "Tempo esgotado ao carregar o painel. Atualize a pagina ou entre novamente."
      );
      const contestsList = Array.isArray(c) ? c : [];
      setUser(u);
      setContests(contestsList);
      setStats({
        total: contestsList.length,
        active: contestsList.filter((x) => x.status === "active").length,
        evaluating: contestsList.filter((x) => x.status === "evaluating").length,
        closed: contestsList.filter((x) => x.status === "closed").length,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setUser(null);
      setContests([]);
      setStats({ total: 0, active: 0, evaluating: 0, closed: 0 });
      setLoadError(error?.message || "Nao foi possivel carregar o painel.");
    } finally {
      setLoading(false);
    }
  };

  const openStatusDialog = (contest) => {
    setStatusDialog(contest);
    setSelectedStatus(contest.status || "draft");
  };

  const handleStatusSave = async () => {
    if (!statusDialog?.id) return;
    setSavingStatus(true);
    try {
      await base44.entities.Contest.update(statusDialog.id, { status: selectedStatus });
      await logAudit({
        action: "contest.status.update",
        entityType: "Contest",
        entityId: statusDialog.id,
        contestId: statusDialog.id,
        oldValue: { status: statusDialog.status },
        newValue: { status: selectedStatus },
      });
      toast.success("Status do concurso atualizado.");
      setStatusDialog(null);
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Nao foi possivel alterar o status.");
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  if (loadError) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <AppLogo size="md" />
          <h1 className="mt-6 text-xl font-bold">Nao foi possivel carregar o painel</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={loadData}>Tentar novamente</Button>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700">
                Entrar novamente
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const manageableContests = contests.filter((contest) => canManageContest(user, contest));
  const primaryContest = manageableContests[0] || contests[0];
  const canCreateContest = !!user;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <AppLogo size="md" />
            <p className="text-muted-foreground mt-2 text-sm">Ola, {user?.full_name || "Organizador"}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDark((d) => !d)} title="Alternar modo escuro">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {canCreateContest && (
          <div className="grid gap-3 md:grid-cols-3 mb-8">
            <Link to="/contests/new" className="rounded-lg border border-cyan-200 bg-cyan-50/80 p-4 transition hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/30">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-cyan-500 p-2 text-white"><Plus className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Criar concurso</p>
                  <p className="text-sm text-muted-foreground">Abrir assistente de cadastro</p>
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => primaryContest && openStatusDialog(primaryContest)}
              disabled={!primaryContest || !canManageContest(user, primaryContest)}
              className="rounded-lg border border-violet-200 bg-violet-50/80 p-4 text-left transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900/60 dark:bg-violet-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-violet-600 p-2 text-white"><SlidersHorizontal className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Alterar status</p>
                  <p className="text-sm text-muted-foreground">Atualizar o concurso principal</p>
                </div>
              </div>
            </button>
            <Link to={primaryContest ? `/contests/${primaryContest.id}/edit` : "/contests/new"} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-slate-700 p-2 text-white"><UserCog className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Configuracoes do organizador</p>
                  <p className="text-sm text-muted-foreground">Regras, datas e preferencias</p>
                </div>
              </div>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, icon: Trophy, color: "text-blue-600" },
            { label: "Ativos", value: stats.active, icon: TrendingUp, color: "text-green-600" },
            { label: "Avaliando", value: stats.evaluating, icon: Star, color: "text-yellow-600" },
            { label: "Encerrados", value: stats.closed, icon: ClipboardList, color: "text-gray-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" /> Concursos</CardTitle>
          </CardHeader>
          <CardContent>
            {contests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum concurso encontrado.</p>
                {canCreateContest && <Link to="/contests/new"><Button className="mt-4 bg-gradient-to-r from-cyan-500 to-violet-600 text-white">Criar primeiro concurso</Button></Link>}
              </div>
            ) : (
              <div className="space-y-3">
                {contests.map((contest) => (
                  <div key={contest.id} className="flex flex-col gap-3 rounded-lg border bg-slate-50/90 p-4 transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <Link to={`/contests/${contest.id}`} className="min-w-0 flex-1">
                      <p className="font-medium text-slate-950 dark:text-slate-100">{contest.name || "Concurso sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{contest.location || "Local nao informado"} - {contest.start_date || "Data nao informada"}</p>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusColor[contest.status]}>{statusLabel[contest.status] || "Sem status"}</Badge>
                      {canManageContest(user, contest) && (
                        <>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openStatusDialog(contest)}>
                            <SlidersHorizontal className="h-4 w-4" /> Status
                          </Button>
                          <Link to={`/contests/${contest.id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Settings className="h-4 w-4" /> Configurar
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!statusDialog} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status do concurso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Concurso</Label>
              <p className="mt-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">{statusDialog?.name || "Concurso"}</p>
            </div>
            <div>
              <Label>Novo status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="evaluating">Avaliando</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStatusSave} disabled={savingStatus} className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700">
              {savingStatus ? "Salvando..." : "Salvar status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
