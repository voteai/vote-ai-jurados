import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Plus, Trash2, Mail, UserPlus, User, XCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";
import EmptyStateActionable from "@/components/contest/EmptyStateActionable";
import PhotoUploadField from "@/components/contest/PhotoUploadField";
import { logAudit } from "@/lib/audit-log";

const emptyForm = { name: "", email: "", phone: "", specialty: "", bio: "", photo_url: "", invitation_status: "accepted" };

export default function JudgesList({ contest, isAdmin, onChanged }) {
  const [judges, setJudges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentSaving, setAssignmentSaving] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [statusSaving, setStatusSaving] = useState({});

  useEffect(() => {
    if (contest?.id) load();
  }, [contest?.id]);

  const load = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [j, c, a] = await Promise.all([
        base44.entities.Judge.filter({ contest_id: contest.id }),
        base44.entities.Category.filter({ contest_id: contest.id }),
        base44.entities.JudgeAssignment.filter({ contest_id: contest.id }),
      ]);
      setJudges(asArray(j).filter(hasValidId));
      setCategories(asArray(c).filter(hasValidId).sort(byDisplayOrder));
      setAssignments(asArray(a).filter(hasValidId));
    } catch (error) {
      console.error("Erro ao carregar jurados:", error);
      setLoadError("Nao foi possivel carregar jurados.");
      setJudges([]);
      setCategories([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (photoUploading) {
      toast.error("Aguarde o envio da foto terminar.");
      return;
    }

    if (!form.name || !form.email || !contest?.id) {
      toast.error("Nome e email sao obrigatorios");
      return;
    }

    const createdJudge = await base44.entities.Judge.create({
      ...form,
      contest_id: contest.id,
      active: true,
      ...(form.invitation_status === "accepted" ? { approved_at: new Date().toISOString() } : {}),
    });
    await logAudit({
      action: "judge.create",
      entityType: "Judge",
      entityId: createdJudge?.id,
      contestId: contest.id,
      newValue: createdJudge || form,
    });

    try {
      await base44.users.inviteUser(form.email, "user");
    } catch (error) {
      console.warn("Convite Base44 nao enviado:", error);
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: form.email,
        subject: `Voce foi convidado como jurado: ${contest.name || "Concurso"}`,
        body: `Ola, ${form.name}!\n\nVoce foi convidado para ser jurado no concurso "${contest.name || "Concurso"}".\n\nAcesse sua conta para avaliar os participantes:\n${window.location.origin}/judge\n\nAtt,\nEquipe Vote Ai Jurados`,
      });
    } catch (error) {
      console.warn("Email de jurado nao enviado:", error);
    }

    toast.success(form.invitation_status === "accepted" ? "Jurado cadastrado e liberado!" : "Jurado adicionado! Convite enviado por email.");
    setOpen(false);
    setForm(emptyForm);
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover jurado?")) return;
    const judgeAssignments = assignments.filter((assignment) => idValue(assignment.judge_id) === idValue(id));
    await Promise.all(judgeAssignments.map((assignment) => base44.entities.JudgeAssignment.delete(assignment.id)));
    await base44.entities.Judge.delete(id);
    await logAudit({ action: "judge.delete", entityType: "Judge", entityId: id, contestId: contest.id });
    await load();
    onChanged?.();
  };

  const handleStatusChange = async (judgeId, status) => {
    const key = idValue(judgeId);
    setStatusSaving((prev) => ({ ...prev, [key]: true }));

    try {
      const data = {
        invitation_status: status,
        ...(status === "accepted" ? { approved_at: new Date().toISOString() } : {}),
        ...(status === "declined" ? { declined_at: new Date().toISOString() } : {}),
      };
      const updated = await base44.entities.Judge.update(judgeId, data);
      await logAudit({
        action: status === "accepted" ? "judge.approve" : "judge.decline",
        entityType: "Judge",
        entityId: judgeId,
        contestId: contest.id,
        newValue: data,
      });
      setJudges((prev) => prev.map((judge) => idValue(judge.id) === key ? { ...judge, ...(updated || data) } : judge));
      toast.success(status === "accepted" ? "Jurado aprovado." : "Jurado recusado.");
      onChanged?.();
    } catch (error) {
      console.error("Erro ao atualizar status do jurado:", error);
      toast.error("Nao foi possivel atualizar o status do jurado.");
    } finally {
      setStatusSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const isCategoryAssigned = (judgeId, categoryId) =>
    assignments.some((assignment) =>
      idValue(assignment.judge_id) === idValue(judgeId) &&
      idValue(assignment.category_id) === idValue(categoryId) &&
      assignment.status === "active"
    );

  const assignedCategoriesFor = (judgeId) =>
    categories.filter((category) => isCategoryAssigned(judgeId, category.id));

  const handleToggleAssignment = async (judgeId, categoryId, checked) => {
    if (!contest?.id || !judgeId || !categoryId) return;

    const key = `${idValue(judgeId)}:${idValue(categoryId)}`;
    setAssignmentSaving((prev) => ({ ...prev, [key]: true }));

    try {
      const existing = assignments.find((assignment) =>
        idValue(assignment.judge_id) === idValue(judgeId) &&
        idValue(assignment.category_id) === idValue(categoryId)
      );

      if (checked) {
        if (existing) {
          const updated = await base44.entities.JudgeAssignment.update(existing.id, {
            contest_id: contest.id,
            category_id: categoryId,
            judge_id: judgeId,
            status: "active",
          });
          await logAudit({
            action: "judge_assignment.activate",
            entityType: "JudgeAssignment",
            entityId: existing.id,
            contestId: contest.id,
            newValue: { judge_id: judgeId, category_id: categoryId, status: "active" },
          });
          setAssignments((prev) => prev.map((assignment) => assignment.id === existing.id ? (updated || { ...existing, status: "active" }) : assignment));
        } else {
          const created = await base44.entities.JudgeAssignment.create({
            contest_id: contest.id,
            category_id: categoryId,
            judge_id: judgeId,
            status: "active",
          });
          await logAudit({
            action: "judge_assignment.create",
            entityType: "JudgeAssignment",
            entityId: created?.id,
            contestId: contest.id,
            newValue: created || { judge_id: judgeId, category_id: categoryId, status: "active" },
          });
          if (created) setAssignments((prev) => [...prev, created]);
          else load();
        }
        toast.success("Categoria atribuida ao jurado.");
      } else if (existing) {
        await base44.entities.JudgeAssignment.delete(existing.id);
        await logAudit({
          action: "judge_assignment.delete",
          entityType: "JudgeAssignment",
          entityId: existing.id,
          contestId: contest.id,
          oldValue: existing,
        });
        setAssignments((prev) => prev.filter((assignment) => assignment.id !== existing.id));
        toast.success("Atribuicao removida.");
      }
    } catch (error) {
      console.error("Erro ao atualizar atribuicao:", error);
      toast.error("Nao foi possivel atualizar a atribuicao.");
    } finally {
      setAssignmentSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const statusColor = { pending: "secondary", accepted: "default", declined: "destructive" };
  const statusLabel = { pending: "Pendente", accepted: "Aceito", declined: "Recusado" };

  const getJudgeVoteUrl = (judgeId) => `${window.location.origin}/judge-vote/${contest.id}/${judgeId}`;

  const copyJudgeVoteLink = async (judge) => {
    try {
      await navigator.clipboard.writeText(getJudgeVoteUrl(judge.id));
      toast.success("Link individual do jurado copiado.");
    } catch (error) {
      console.error("Erro ao copiar link do jurado:", error);
      toast.error("Nao foi possivel copiar o link.");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (loadError) {
    return <Card><CardContent className="py-8 text-center text-red-600">{loadError}</CardContent></Card>;
  }

  const renderInviteTrigger = () => (
    <DialogTrigger asChild>
      <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700">
        <Plus className="w-4 h-4" /> Convidar Jurado
      </Button>
    </DialogTrigger>
  );

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Convidar Jurado</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <PhotoUploadField
          label="Foto do jurado"
          value={form.photo_url}
          onChange={(photoUrl) => setForm((prev) => ({ ...prev, photo_url: photoUrl }))}
          onUploadingChange={setPhotoUploading}
        />
        <div><Label>Nome *</Label><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
        <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} /></div>
        <div><Label>Especialidade</Label><Input value={form.specialty} onChange={(event) => setForm((prev) => ({ ...prev, specialty: event.target.value }))} /></div>
        <div><Label>Telefone</Label><Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} /></div>
        <label className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <Checkbox
            checked={form.invitation_status === "accepted"}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, invitation_status: checked ? "accepted" : "pending" }))}
          />
          <span>Liberar para votar sem confirmacao por e-mail</span>
        </label>
        <Button className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700" onClick={handleSave} disabled={photoUploading}>
          <Mail className="w-4 h-4" /> {photoUploading ? "Enviando foto..." : form.invitation_status === "accepted" ? "Cadastrar e liberar" : "Convidar"}
        </Button>
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{judges.length} jurado(s)</p>
        {isAdmin && renderInviteTrigger()}
      </div>

      {isAdmin && categories.length === 0 && (
        <Card className="mb-3">
          <CardContent className="py-4 text-sm text-amber-700 bg-amber-50">
            Cadastre ao menos uma categoria para atribuir jurados.
          </CardContent>
        </Card>
      )}

      {judges.length === 0 ? (
        <EmptyStateActionable
          icon={UserPlus}
          title="Convide o primeiro jurado"
          description="Adicione quem vai avaliar os participantes e depois atribua as categorias correspondentes."
          action={isAdmin ? renderInviteTrigger() : null}
        />
      ) : (
        <div className="space-y-3">
          {judges.map((judge) => (
            <div key={idValue(judge.id)} className="p-4 bg-card text-card-foreground rounded-lg border border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {judge.photo_url ? (
                    <img src={judge.photo_url} alt={safeText(judge.name, "Jurado")} className="h-11 w-11 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{safeText(judge.name, "Sem nome")}</p>
                    <p className="text-sm text-muted-foreground">{safeText(judge.email)} {judge.specialty && ` - ${judge.specialty}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant={statusColor[judge.invitation_status] || "secondary"}>{statusLabel[judge.invitation_status] || "Pendente"}</Badge>
                  {isAdmin && (
                    <>
                      {judge.invitation_status !== "accepted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-green-500/30 text-green-600 hover:bg-green-500/10 dark:text-green-300"
                          disabled={!!statusSaving[idValue(judge.id)]}
                          onClick={() => handleStatusChange(judge.id, "accepted")}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprovar
                        </Button>
                      )}
                      {judge.invitation_status !== "declined" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10"
                          disabled={!!statusSaving[idValue(judge.id)]}
                          onClick={() => handleStatusChange(judge.id, "declined")}
                        >
                          <XCircle className="w-4 h-4" /> Recusar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-300"
                        onClick={() => copyJudgeVoteLink(judge)}
                        title="Copiar link individual de votacao"
                      >
                        <Copy className="w-4 h-4" /> Copiar link
                      </Button>
                      <a href={getJudgeVoteUrl(judge.id)} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 dark:text-violet-300"
                          title="Abrir votacao individual do jurado"
                        >
                          <ExternalLink className="w-4 h-4" /> Abrir
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(judge.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Categorias atribuidas</p>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
                ) : isAdmin ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => {
                      const key = `${idValue(judge.id)}:${idValue(category.id)}`;
                      return (
                        <label key={idValue(category.id)} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted">
                          <Checkbox
                            checked={isCategoryAssigned(judge.id, category.id)}
                            disabled={!!assignmentSaving[key]}
                            onCheckedChange={(checked) => handleToggleAssignment(judge.id, category.id, checked === true)}
                          />
                          <span className="truncate">{safeText(category.name, "Sem nome")}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : assignedCategoriesFor(judge.id).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {assignedCategoriesFor(judge.id).map((category) => (
                      <Badge key={idValue(category.id)} variant="outline">{safeText(category.name, "Sem nome")}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria atribuida.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {isAdmin && dialogContent}
      </div>
    </Dialog>
  );
}
