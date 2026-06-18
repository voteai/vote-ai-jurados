import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookTemplate, Save, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

// Dialog: Salvar critérios atuais como template
export function SaveTemplateDialog({ open, onClose, criteria }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao template."); return; }
    setSaving(true);
    const stripped = criteria.map(({ id, created_date, updated_date, created_by_id, contest_id, ...rest }) => rest);
    await base44.entities.CriteriaTemplate.create({
      name: name.trim(),
      description: description.trim(),
      criteria: JSON.stringify(stripped),
    });
    toast.success("Template salvo com sucesso!");
    setSaving(false);
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-500" /> Salvar como Template
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-700 dark:text-blue-300">
            {criteria.length} critério(s) serão salvos neste template.
          </div>
          <div>
            <Label className="mb-1 block">Nome do Template *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Avaliação Musical Padrão" autoFocus />
          </div>
          <div>
            <Label className="mb-1 block">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Descreva quando usar este template..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            <Save className="w-4 h-4" /> Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Carregar template em um concurso
export function LoadTemplateDialog({ open, onClose, contest, categories, onLoaded }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      base44.entities.CriteriaTemplate.list("-created_date").then(t => { setTemplates(t); setLoading(false); });
      setTargetCategoryId(categories[0]?.id || "");
    }
  }, [open]);

  const handleImport = async () => {
    if (!selectedTemplate || !targetCategoryId) { toast.error("Selecione um template e uma categoria."); return; }
    setImporting(true);
    const criteriaList = JSON.parse(selectedTemplate.criteria);
    for (const c of criteriaList) {
      await base44.entities.EvaluationCriterion.create({
        ...c,
        contest_id: contest.id,
        category_id: targetCategoryId,
        active: true,
        required: true,
      });
    }
    toast.success(`${criteriaList.length} critério(s) importado(s)!`);
    setImporting(false);
    setSelectedTemplate(null);
    onLoaded();
    onClose();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Remover este template?")) return;
    await base44.entities.CriteriaTemplate.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
    toast.success("Template removido.");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="w-5 h-5 text-purple-500" /> Importar de Template
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
        ) : templates.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum template salvo ainda.</p>
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {templates.map(t => {
                const count = JSON.parse(t.criteria).length;
                const selected = selectedTemplate?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selected ? "border-purple-400 bg-purple-500/10" : "border-border bg-card hover:bg-muted"}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                      <Badge variant="outline" className="mt-1 text-xs">{count} critério(s)</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={(e) => handleDelete(t.id, e)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {selectedTemplate && (
              <div>
                <Label className="mb-1.5 block">Aplicar à categoria *</Label>
                <select
                  value={targetCategoryId}
                  onChange={e => setTargetCategoryId(e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || !selectedTemplate || !targetCategoryId} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
            <Download className="w-4 h-4" /> Importar Critérios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
