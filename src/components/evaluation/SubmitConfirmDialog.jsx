import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function SubmitConfirmDialog({ open, onClose, onConfirm, participantName, criteria, scores }) {
  const unanswered = criteria.filter(c => scores[c.id] === undefined || scores[c.id] === null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" /> Confirmar Envio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">Você está enviando a avaliação de <strong>{participantName}</strong>. Após o envio, não será possível editar sem autorização do organizador.</p>

          {unanswered.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800">Critérios não respondidos ({unanswered.length}):</p>
                <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                  {unanswered.map(c => <li key={c.id}>{c.name}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            A nota final sera exibida somente depois que a avaliacao for enviada.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2" onClick={onConfirm}>
              <CheckCircle className="w-4 h-4" /> Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
