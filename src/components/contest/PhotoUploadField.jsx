import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function PhotoUploadField({ label = "Foto", value, onChange, onUploadingChange }) {
  const [uploading, setUploading] = useState(false);

  const setUploadState = (state) => {
    setUploading(state);
    onUploadingChange?.(state);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("A foto deve ter no maximo 5MB.");
      return;
    }

    setUploadState(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success("Foto enviada!");
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      toast.error("Nao foi possivel enviar a foto.");
    } finally {
      setUploadState(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        {value ? (
          <img src={value} alt={label} className="h-16 w-16 rounded-full border border-border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-background text-muted-foreground">
            <User className="h-7 w-7" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" disabled={uploading} asChild>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "Enviando..." : "Subir foto"}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" className="gap-2 text-red-500 hover:text-red-600" disabled={uploading} onClick={() => onChange("")}>
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG ou WebP ate 5MB.</p>
        </div>
      </div>
    </div>
  );
}
