import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Unlock } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit-log";

export default function UnlockEvaluationDialog({ evaluation, participantName, judgeName, open, onClose, onUnlocked }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUnlock = async () => {
    if (!reason.trim()) { toast.error("Informe o motivo do desbloqueio."); return; }
    setSaving(true);
    await base44.entities.Evaluation.update(evaluation.id, {
      status: "unlocked",
      unlocked_by_admin: true,
      unlock_reason: reason.trim(),
    });
    await logAudit({
      action: "evaluation.unlock",
      entityType: "Evaluation",
      entityId: evaluation.id,
      contestId: evaluation.contest_id,
      oldValue: { status: evaluation.status },
      newValue: { status: "unlocked" },
      reason: reason.trim(),
    });
    toast.success(`Avaliação de ${judgeName} desbloqueada para reenvio.`);
    setSaving(false);
    setReason("");
    onUnlocked?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-amber-500" />
            Desbloquear Avaliação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <p><strong>Participante:</strong> {participantName}</p>
            <p><strong>Jurado:</strong> {judgeName}</p>
            <p className="mt-1">O jurado poderá reeditar e reenviar a avaliação após o desbloqueio.</p>
          </div>

          <div>
            <Label className="mb-1.5 block">Motivo do desbloqueio <span className="text-red-500">*</span></Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Erro de digitação no critério X, solicitado pelo jurado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleUnlock} disabled={saving || !reason.trim()} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <Unlock className="w-4 h-4" /> Desbloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
