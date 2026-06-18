import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { asArray, byDisplayOrder, hasValidId, idValue, safeText } from "@/lib/safe-data";
import { logAudit } from "@/lib/audit-log";

export default function CategoriesList({ contest, isAdmin, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", display_order: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (contest?.id) load();
  }, [contest?.id]);

  const load = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const c = await base44.entities.Category.filter({ contest_id: contest.id });
      setCategories(asArray(c).filter(hasValidId).sort(byDisplayOrder));
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setLoadError("Nao foi possivel carregar categorias.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({ name: safeText(category?.name), description: safeText(category?.description), display_order: Number(category?.display_order ?? 0) });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", display_order: categories.length });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !contest?.id) {
      toast.error("Nome e obrigatorio");
      return;
    }

    if (editing) {
      await base44.entities.Category.update(editing.id, form);
      await logAudit({ action: "category.update", entityType: "Category", entityId: editing.id, contestId: contest.id, oldValue: editing, newValue: form });
    } else {
      const created = await base44.entities.Category.create({ ...form, contest_id: contest.id, status: "active" });
      await logAudit({ action: "category.create", entityType: "Category", entityId: created?.id, contestId: contest.id, newValue: created || form });
    }

    toast.success("Categoria salva!");
    setOpen(false);
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover categoria?")) return;
    await base44.entities.Category.delete(id);
    await logAudit({ action: "category.delete", entityType: "Category", entityId: id, contestId: contest.id });
    await load();
    onChanged?.();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (loadError) {
    return <Card><CardContent className="py-8 text-center text-red-600">{loadError}</CardContent></Card>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{categories.length} categoria(s)</p>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700" onClick={openNew}><Plus className="w-4 h-4" /> Nova Categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Categoria</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
                <div><Label>Descricao</Label><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={2} /></div>
                <div><Label>Ordem de exibicao</Label><Input type="number" value={form.display_order} onChange={(event) => setForm((prev) => ({ ...prev, display_order: Number(event.target.value) }))} /></div>
                <Button className="w-full" onClick={handleSave}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {categories.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Tag className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma categoria.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={idValue(category.id)} className="flex items-center justify-between gap-3 p-3 bg-card text-card-foreground rounded-lg border border-border">
              <div>
                <p className="font-medium">{safeText(category.name, "Sem nome")}</p>
                {category.description && <p className="text-sm text-muted-foreground">{safeText(category.description)}</p>}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(category)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
