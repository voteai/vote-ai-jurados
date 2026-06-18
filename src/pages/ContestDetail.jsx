import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Star, ClipboardList, Trophy, Settings, BarChart2, LineChart, Link2, Radio, Sun, Moon, SlidersHorizontal, QrCode, ExternalLink, Copy, AlertTriangle } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import ParticipantsList from "@/components/contest/ParticipantsList";
import JudgesList from "@/components/contest/JudgesList";
import CriteriaList from "@/components/contest/CriteriaList";
import CategoriesList from "@/components/contest/CategoriesList";
import RankingView from "@/components/contest/RankingView";
import EvaluationStatusPanel from "@/components/contest/EvaluationStatusPanel";
import ChartsPanel from "@/components/contest/ChartsPanel";
import ContestOrganizerSettings from "@/components/contest/ContestOrganizerSettings";
import { canManageContest } from "@/lib/contest-permissions";
import { logAudit } from "@/lib/audit-log";

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Erro ao renderizar aba do concurso:", error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
          Nao foi possivel carregar esta secao agora. Atualize a pagina ou tente novamente.
        </div>
      );
    }

    return this.props.children;
  }
}

function SafeTabsContent({ value, activeTab, children }) {
  return (
    <TabsContent value={value}>
      <TabErrorBoundary resetKey={activeTab}>
        {children}
      </TabErrorBoundary>
    </TabsContent>
  );
}

export default function ContestDetail() {
  const { id } = useParams();
  const [contest, setContest] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dark, setDark] = useDarkMode();
  const [activeTab, setActiveTab] = useState("participants");
  const [publicVoteDialogOpen, setPublicVoteDialogOpen] = useState(false);
  const [openingPublicVote, setOpeningPublicVote] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async ({ preserveTab = false } = {}) => {
    setLoading(true);
    setLoadError("");

    try {
      const [u, c] = await Promise.all([
        base44.auth.me(),
        base44.entities.Contest.filter({ id }),
      ]);
      setUser(u);
      const foundContest = Array.isArray(c) ? c[0] || null : null;
      setContest(foundContest);
      if (!preserveTab) setActiveTab(canManageContest(u, foundContest) ? "status" : "participants");
    } catch (error) {
      console.error("Erro ao carregar concurso:", error);
      setLoadError("Nao foi possivel carregar os dados do concurso.");
      setContest(null);
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = {
    draft: "Rascunho",
    active: "Ativo",
    evaluating: "Avaliando",
    closed: "Encerrado",
    published: "Publicado",
  };

  const publicVoteUrl = `${window.location.origin}/judge-vote/${id}`;
  const publicVoteQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=14&data=${encodeURIComponent(publicVoteUrl)}`;
  const publicVoteIsOpen = ["active", "evaluating"].includes(contest?.status);

  const copyVoteLink = () => {
    const url = publicVoteUrl;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const openPublicVoteNow = async () => {
    if (!contest?.id) return;
    setOpeningPublicVote(true);
    try {
      const nextStatus = ["active", "evaluating"].includes(contest.status) ? contest.status : "active";
      const updated = await base44.entities.Contest.update(contest.id, {
        allow_public_vote: true,
        status: nextStatus,
      });
      await logAudit({
        action: "contest.public_vote.open",
        entityType: "Contest",
        entityId: contest.id,
        contestId: contest.id,
        oldValue: { allow_public_vote: contest.allow_public_vote, status: contest.status },
        newValue: { allow_public_vote: true, status: nextStatus },
      });
      setContest((prev) => ({ ...prev, ...(updated || {}), allow_public_vote: true, status: updated?.status || nextStatus }));
      toast.success("Votacao popular aberta.");
    } catch (error) {
      console.error("Erro ao abrir votacao popular:", error);
      toast.error("Nao foi possivel abrir a votacao popular.");
    } finally {
      setOpeningPublicVote(false);
    }
  };

  const refreshContestData = () => loadData({ preserveTab: true });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) return <div className="p-8 text-center text-red-600">{loadError}</div>;
  if (!contest) return <div className="p-8 text-center text-gray-500">Concurso nao encontrado.</div>;

  const isAdmin = canManageContest(user, contest);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <AppLogo size="sm" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contest.name || "Concurso"}</h1>
              <Badge>{statusLabel[contest.status] || "Sem status"}</Badge>
            </div>
            <p className="text-gray-500 text-sm">
              {contest.location || "Local nao informado"} - {contest.start_date || "Data nao informada"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => setDark((d) => !d)} title="Alternar modo escuro">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <a href={`/ranking/${id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
                <Radio className="w-4 h-4 animate-pulse" /> Tela Ao Vivo
              </Button>
            </a>
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-2 text-pink-600 border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-500/10" onClick={() => setPublicVoteDialogOpen(true)}>
                <QrCode className="w-4 h-4" /> Votacao Jurados
              </Button>
            )}
            {isAdmin && (
              <Link to={`/contests/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2"><Settings className="w-4 h-4" /> Configurar</Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {isAdmin && <TabsTrigger value="status" className="gap-2"><BarChart2 className="w-4 h-4" /> Acompanhamento</TabsTrigger>}
            {isAdmin && <TabsTrigger value="charts" className="gap-2"><LineChart className="w-4 h-4" /> Graficos</TabsTrigger>}
            <TabsTrigger value="participants" className="gap-2"><Users className="w-4 h-4" /> Participantes</TabsTrigger>
            <TabsTrigger value="judges" className="gap-2"><Star className="w-4 h-4" /> Jurados</TabsTrigger>
            <TabsTrigger value="criteria" className="gap-2"><ClipboardList className="w-4 h-4" /> Criterios</TabsTrigger>
            <TabsTrigger value="categories" className="gap-2"><Settings className="w-4 h-4" /> Categorias</TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2"><Trophy className="w-4 h-4" /> Ranking</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings" className="gap-2"><SlidersHorizontal className="w-4 h-4" /> Configuracoes</TabsTrigger>}
          </TabsList>

          {isAdmin && <SafeTabsContent value="status" activeTab={activeTab}><EvaluationStatusPanel contest={contest} isAdmin={isAdmin} /></SafeTabsContent>}
          {isAdmin && <SafeTabsContent value="charts" activeTab={activeTab}><ChartsPanel contest={contest} /></SafeTabsContent>}
          <SafeTabsContent value="participants" activeTab={activeTab}><ParticipantsList contest={contest} isAdmin={isAdmin} onChanged={refreshContestData} /></SafeTabsContent>
          <SafeTabsContent value="judges" activeTab={activeTab}><JudgesList contest={contest} isAdmin={isAdmin} onChanged={refreshContestData} /></SafeTabsContent>
          <SafeTabsContent value="criteria" activeTab={activeTab}><CriteriaList contest={contest} isAdmin={isAdmin} onChanged={refreshContestData} /></SafeTabsContent>
          <SafeTabsContent value="categories" activeTab={activeTab}><CategoriesList contest={contest} isAdmin={isAdmin} onChanged={refreshContestData} /></SafeTabsContent>
          <SafeTabsContent value="ranking" activeTab={activeTab}><RankingView contest={contest} isAdmin={isAdmin} /></SafeTabsContent>
          {isAdmin && <SafeTabsContent value="settings" activeTab={activeTab}><ContestOrganizerSettings contest={contest} onChanged={refreshContestData} /></SafeTabsContent>}
        </Tabs>
      </div>

      <Dialog open={publicVoteDialogOpen} onOpenChange={setPublicVoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-pink-500" /> Link de Votacao dos Jurados
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!publicVoteIsOpen && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Votacao ainda nao esta aberta
                </div>
                <p>O link e o QR Code estao corretos, mas o concurso precisa estar Ativo ou Avaliando para os jurados votarem.</p>
                {isAdmin && (
                  <Button
                    className="mt-3 w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
                    onClick={openPublicVoteNow}
                    disabled={openingPublicVote}
                  >
                    {openingPublicVote ? "Abrindo..." : "Abrir votacao agora"}
                  </Button>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link restrito aos jurados</p>
              <div className="flex gap-2">
                <Input value={publicVoteUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyVoteLink} title="Copiar link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center rounded-lg border border-border bg-card p-4">
              <img src={publicVoteQrUrl} alt={`QR Code da votacao dos jurados de ${contest.name || "Concurso"}`} className="h-64 w-64 rounded-md bg-white p-2" />
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Aponte a camera do celular para abrir a votacao restrita aos jurados cadastrados.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={copyVoteLink}>
                <Link2 className="h-4 w-4" /> Copiar
              </Button>
              <a href={publicVoteUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2 bg-pink-600 text-white hover:bg-pink-700">
                  <ExternalLink className="h-4 w-4" /> Abrir
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
