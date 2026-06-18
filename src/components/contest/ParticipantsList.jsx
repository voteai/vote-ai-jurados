import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, X, UserPlus, User } from "lucide-react";
import { toast } from "sonner";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";
import EmptyStateActionable from "@/components/contest/EmptyStateActionable";
import PhotoUploadField from "@/components/contest/PhotoUploadField";
import { logAudit } from "@/lib/audit-log";

const emptyForm = {
  name: "",
  code: "",
  email: "",
  phone: "",
  description: "",
  photo_url: "",
  category_id: "",
  status: "registered",
};

export default function ParticipantsList({ contest, isAdmin, onChanged }) {
  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (contest?.id) load();
  }, [contest?.id]);

  const load = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [p, c] = await Promise.all([
        base44.entities.Participant.filter({ contest_id: contest.id }),
        base44.entities.Category.filter({ contest_id: contest.id }),
      ]);
      setParticipants(asArray(p).filter(hasValidId));
      setCategories(asArray(c).filter(hasValidId).sort(byDisplayOrder));
    } catch (error) {
      console.error("Erro ao carregar participantes:", error);
      setLoadError("Nao foi possivel carregar participantes.");
      setParticipants([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (participant) => {
    setEditing(participant);
    setForm({ ...emptyForm, ...participant, category_id: idValue(participant?.category_id) });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, category_id: idValue(categories[0]?.id) });
    setOpen(true);
  };

  const handleSave = async () => {
    if (photoUploading) {
      toast.error("Aguarde o envio da foto terminar.");
      return;
    }

    if (!form.name || !form.category_id || !contest?.id) {
      toast.error("Nome artistico e categoria sao obrigatorios");
      return;
    }

    if (editing) {
      await base44.entities.Participant.update(editing.id, form);
      await logAudit({
        action: "participant.update",
        entityType: "Participant",
        entityId: editing.id,
        contestId: contest.id,
        oldValue: editing,
        newValue: form,
      });
    } else {
      const created = await base44.entities.Participant.create({ ...form, contest_id: contest.id });
      await logAudit({
        action: "participant.create",
        entityType: "Participant",
        entityId: created?.id,
        contestId: contest.id,
        newValue: created || form,
      });
    }

    toast.success("Participante salvo!");
    setOpen(false);
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover participante?")) return;
    await base44.entities.Participant.delete(id);
    await logAudit({ action: "participant.delete", entityType: "Participant", entityId: id, contestId: contest.id });
    await load();
    onChanged?.();
  };

  const normalizedSearch = search.toLowerCase();
  const filteredParticipants = participants.filter((participant) => {
    const matchName = safeText(participant?.name).toLowerCase().includes(normalizedSearch) ||
      safeText(participant?.code).toLowerCase().includes(normalizedSearch);
    const matchCat = filterCat === "all" || idValue(participant?.category_id) === filterCat;
    const matchStatus = filterStatus === "all" || safeText(participant?.status) === filterStatus;
    return matchName && matchCat && matchStatus;
  });

  const hasFilters = search || filterCat !== "all" || filterStatus !== "all";
  const statusColor = { registered: "secondary", approved: "default", evaluating: "default", disqualified: "destructive", classified: "default" };
  const statusLabel = { registered: "Inscrito", approved: "Aprovado", evaluating: "Avaliando", disqualified: "Desclassificado", classified: "Classificado" };
  const getCatName = (id) => safeText(categories.find((category) => idValue(category.id) === idValue(id))?.name, "-");
  const canAddManually = isAdmin;

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (loadError) {
    return <Card><CardContent className="py-8 text-center text-red-600">{loadError}</CardContent></Card>;
  }

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Participante</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <PhotoUploadField
          label="Foto do participante"
          value={form.photo_url}
          onChange={(photoUrl) => setForm((prev) => ({ ...prev, photo_url: photoUrl }))}
          onUploadingChange={setPhotoUploading}
        />
        <div><Label>Nome Artistico *</Label><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
        <div><Label>Codigo</Label><Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} /></div>
        <div><Label>Categoria *</Label>
          <Select value={idValue(form.category_id)} onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={idValue(category.id)} value={idValue(category.id)}>
                  {safeText(category.name, "Sem nome")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Email</Label><Input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="registered">Inscrito</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="evaluating">Avaliando</SelectItem>
              <SelectItem value="disqualified">Desclassificado</SelectItem>
              <SelectItem value="classified">Classificado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700" onClick={handleSave} disabled={photoUploading}>
          {photoUploading ? "Enviando foto..." : "Salvar"}
        </Button>
      </div>
    </DialogContent>
  );

  const renderAddParticipantTrigger = () => (
    <DialogTrigger asChild>
      <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700" onClick={openNew}>
        <Plus className="w-4 h-4" /> Adicionar
      </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou codigo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={idValue(category.id)} value={idValue(category.id)}>
                {safeText(category.name, "Sem nome")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="registered">Inscrito</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="evaluating">Avaliando</SelectItem>
            <SelectItem value="disqualified">Desclassificado</SelectItem>
            <SelectItem value="classified">Classificado</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterCat("all"); setFilterStatus("all"); }} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{filteredParticipants.length}/{participants.length} participante(s)</p>
        {canAddManually && renderAddParticipantTrigger()}
      </div>

      {participants.length === 0 ? (
        <EmptyStateActionable
          icon={UserPlus}
          title="Adicione o primeiro participante"
          description="Cadastre quem sera avaliado neste concurso para liberar o fluxo de avaliacao."
          action={canAddManually ? renderAddParticipantTrigger() : null}
        />
      ) : filteredParticipants.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Search className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum participante encontrado com esses filtros.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredParticipants.map((participant) => (
            <div key={idValue(participant.id)} className="flex items-center justify-between gap-3 p-3 bg-card text-card-foreground rounded-lg border border-border">
              <div className="flex items-center gap-3 min-w-0">
                {participant.photo_url ? (
                  <img src={participant.photo_url} alt={safeText(participant.name, "Participante")} className="h-11 w-11 rounded-full border border-border object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                <p className="font-medium">{safeText(participant.name, "Sem nome")} {participant.code && <span className="text-xs text-muted-foreground">({participant.code})</span>}</p>
                <p className="text-sm text-muted-foreground">{getCatName(participant.category_id)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusColor[participant.status] || "secondary"}>{statusLabel[participant.status] || "Inscrito"}</Badge>
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(participant)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(participant.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {canAddManually && dialogContent}
      </div>
    </Dialog>
  );
}
