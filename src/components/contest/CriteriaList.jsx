import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ClipboardList, Save, BookTemplate, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import CriterionPreview from "@/components/evaluation/CriterionPreview";
import { SaveTemplateDialog, LoadTemplateDialog } from "@/components/contest/CriteriaTemplateManager";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";
import EmptyStateActionable from "@/components/contest/EmptyStateActionable";
import { logAudit } from "@/lib/audit-log";

const initialForm = {
  name: "",
  description: "",
  weight: 25,
  control_type: "numeric_bar",
  min_value: 0,
  max_value: 10,
  allow_decimal: true,
  allow_comment: true,
  category_id: "",
  display_order: 0,
};

export default function CriteriaList({ contest, isAdmin, onChanged }) {
  const [criteria, setCriteria] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (contest?.id) load();
  }, [contest?.id]);

  const load = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [c, cats] = await Promise.all([
        base44.entities.EvaluationCriterion.filter({ contest_id: contest.id }),
        base44.entities.Category.filter({ contest_id: contest.id }),
      ]);
      setCriteria(asArray(c).filter(hasValidId).sort(byDisplayOrder));
      setCategories(asArray(cats).filter(hasValidId).sort(byDisplayOrder));
    } catch (error) {
      console.error("Erro ao carregar criterios:", error);
      setLoadError("Nao foi possivel carregar criterios.");
      setCriteria([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (criterion) => {
    setEditing(criterion);
    setForm({ ...initialForm, ...criterion, category_id: idValue(criterion?.category_id) });
    setOpen(true);
  };

  const openNew = () => {
    if (categories.length === 0) {
      toast.error("Cadastre uma categoria antes de criar criterios.");
      return;
    }
    setEditing(null);
    setForm({
      ...initialForm,
      control_type: contest?.default_voting_control || initialForm.control_type,
      category_id: idValue(categories[0]?.id),
      display_order: criteria.length,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category_id || !contest?.id) {
      toast.error("Nome e categoria sao obrigatorios");
      return;
    }

    if (editing) {
      await base44.entities.EvaluationCriterion.update(editing.id, form);
      await logAudit({ action: "criterion.update", entityType: "EvaluationCriterion", entityId: editing.id, contestId: contest.id, oldValue: editing, newValue: form });
    } else {
      const created = await base44.entities.EvaluationCriterion.create({ ...form, contest_id: contest.id, active: true, required: true });
      await logAudit({ action: "criterion.create", entityType: "EvaluationCriterion", entityId: created?.id, contestId: contest.id, newValue: created || form });
    }

    toast.success("Criterio salvo!");
    setOpen(false);
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover criterio?")) return;
    await base44.entities.EvaluationCriterion.delete(id);
    await logAudit({ action: "criterion.delete", entityType: "EvaluationCriterion", entityId: id, contestId: contest.id });
    await load();
    onChanged?.();
  };

  const controlLabel = { numeric_bar: "Barra Numerica", thermometer: "Termometro", speedometer: "Velocimetro", ruler: "Regua" };
  const weightByCat = {};
  criteria.filter((criterion) => criterion.active !== false).forEach((criterion) => {
    const key = idValue(criterion.category_id);
    weightByCat[key] = (weightByCat[key] || 0) + Number(criterion.weight || 0);
  });

  const catWithInvalidWeight = categories.filter((category) => {
    const key = idValue(category.id);
    const sum = weightByCat[key] || 0;
    return sum !== 100 && criteria.some((criterion) => idValue(criterion.category_id) === key);
  });

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (loadError) {
    return <Card><CardContent className="py-8 text-center text-red-600">{loadError}</CardContent></Card>;
  }

  const renderAddCriterionTrigger = () => (
    <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700" onClick={openNew}>
      <Plus className="w-4 h-4" /> Novo Criterio
    </Button>
  );

  const criterionDialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Criterio</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
          <div><Label>Descricao</Label><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={2} /></div>
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
          <div><Label>Peso (%) *</Label><Input type="number" min={0} max={100} value={form.weight} onChange={(event) => setForm((prev) => ({ ...prev, weight: Number(event.target.value) }))} /></div>
          <div><Label>Tipo de Controle</Label>
            <Select value={form.control_type} onValueChange={(value) => setForm((prev) => ({ ...prev, control_type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric_bar">Barra Numerica</SelectItem>
                <SelectItem value="thermometer">Termometro</SelectItem>
                <SelectItem value="speedometer">Velocimetro</SelectItem>
                <SelectItem value="ruler">Regua</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor Minimo</Label><Input type="number" value={form.min_value} onChange={(event) => setForm((prev) => ({ ...prev, min_value: Number(event.target.value) }))} /></div>
            <div><Label>Valor Maximo</Label><Input type="number" value={form.max_value} onChange={(event) => setForm((prev) => ({ ...prev, max_value: Number(event.target.value) }))} /></div>
          </div>
          <div><Label className="mb-1 block">Rotulos (separados por virgula)</Label>
            <Input placeholder="Ex: Fraco, Regular, Bom, Excelente" value={form.labels || ""} onChange={(event) => setForm((prev) => ({ ...prev, labels: event.target.value }))} />
          </div>
          <div className="flex items-center justify-between"><Label>Permitir Decimal</Label><Switch checked={!!form.allow_decimal} onCheckedChange={(value) => setForm((prev) => ({ ...prev, allow_decimal: value }))} /></div>
          <div className="flex items-center justify-between"><Label>Permitir Comentario</Label><Switch checked={!!form.allow_comment} onCheckedChange={(value) => setForm((prev) => ({ ...prev, allow_comment: value }))} /></div>
          <Button className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700" onClick={handleSave}>Salvar</Button>
        </div>
        <div>
          <CriterionPreview criterion={form} />
        </div>
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
      {catWithInvalidWeight.length > 0 && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">Atencao: soma dos pesos deve ser 100%</p>
            {catWithInvalidWeight.map((category) => {
              const sum = weightByCat[idValue(category.id)] || 0;
              return (
                <p key={idValue(category.id)} className="text-xs mt-0.5">
                  Categoria <strong>{safeText(category.name, "Sem nome")}</strong>: {sum}% (faltam {100 - sum}%)
                </p>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{criteria.length} criterio(s)</p>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setLoadTemplateOpen(true)}>
              <BookTemplate className="w-4 h-4" /> Importar Template
            </Button>
            {criteria.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setSaveTemplateOpen(true)}>
                <Save className="w-4 h-4" /> Salvar como Template
              </Button>
            )}
            {renderAddCriterionTrigger()}
          </div>
        )}
      </div>

      {criteria.length === 0 ? (
        <EmptyStateActionable
          icon={ClipboardList}
          title="Crie o primeiro criterio"
          description={categories.length === 0 ? "Cadastre uma categoria antes de criar criterios." : "Defina o que sera avaliado e a forma de voto."}
          action={isAdmin ? (
            renderAddCriterionTrigger()
          ) : null}
        />
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const catCriteria = criteria.filter((criterion) => idValue(criterion.category_id) === idValue(category.id));
            if (catCriteria.length === 0) return null;
            const sum = catCriteria.reduce((acc, criterion) => acc + Number(criterion.weight || 0), 0);
            return (
              <div key={idValue(category.id)}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{safeText(category.name, "Sem nome")}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sum === 100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {sum}% {sum === 100 ? "OK" : `(faltam ${100 - sum}%)`}
                  </span>
                </div>
                <div className="space-y-2">
                  {catCriteria.map((criterion) => (
                    <div key={idValue(criterion.id)} className="flex items-center justify-between gap-3 p-3 bg-card text-card-foreground rounded-lg border border-border">
                      <div>
                        <p className="font-medium">{safeText(criterion.name, "Sem nome")}</p>
                        <p className="text-sm text-muted-foreground">{controlLabel[criterion.control_type] || "Controle"} - {criterion.min_value}-{criterion.max_value}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border bg-background text-foreground">{Number(criterion.weight || 0)}%</Badge>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(criterion)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(criterion.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SaveTemplateDialog open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} criteria={criteria} />
      <LoadTemplateDialog open={loadTemplateOpen} onClose={() => setLoadTemplateOpen(false)} contest={contest} categories={categories} onLoaded={async () => { await load(); onChanged?.(); }} />
      {criterionDialogContent}
      </div>
    </Dialog>
  );
}
