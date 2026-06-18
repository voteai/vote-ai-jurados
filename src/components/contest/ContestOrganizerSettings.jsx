import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, Copy, Gauge, QrCode, Save, Tag, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

const defaultSettings = {
  participant_add_by_link: true,
  participant_add_by_email: true,
  participant_add_manual: true,
  participant_name_field: "artist_name",
  judge_add_by_link: true,
  judge_add_by_qrcode: true,
  default_voting_control: "ruler",
};

export default function ContestOrganizerSettings({ contest, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...defaultSettings, ...contest });
  const inviteLink = `${window.location.origin}/contests/${contest.id}`;
  const judgeLink = `${window.location.origin}/judge`;

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Contest.update(contest.id, {
        participant_add_by_link: !!form.participant_add_by_link,
        participant_add_by_email: !!form.participant_add_by_email,
        participant_add_manual: !!form.participant_add_manual,
        participant_name_field: form.participant_name_field || "artist_name",
        judge_add_by_link: !!form.judge_add_by_link,
        judge_add_by_qrcode: !!form.judge_add_by_qrcode,
        default_voting_control: form.default_voting_control || "ruler",
      });
      toast.success("Configuracoes salvas.");
      onChanged?.();
    } catch (error) {
      console.error("Erro ao salvar configuracoes:", error);
      toast.error("Nao foi possivel salvar as configuracoes.");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value, message) => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-5 w-5 text-cyan-500" /> Participantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SettingSwitch label="Por link" checked={!!form.participant_add_by_link} onChange={(value) => handleChange("participant_add_by_link", value)} />
            <SettingSwitch label="Por email" checked={!!form.participant_add_by_email} onChange={(value) => handleChange("participant_add_by_email", value)} />
            <SettingSwitch label="Cadastrar manualmente" checked={!!form.participant_add_manual} onChange={(value) => handleChange("participant_add_manual", value)} />
          </div>
          <div>
            <Label>Campo principal de dados</Label>
            <Input value="Nome Artistico" readOnly className="mt-1 bg-muted/60" />
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(inviteLink, "Link de participantes copiado.")}>
            <Copy className="h-4 w-4" /> Copiar link de cadastro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-violet-500" /> Jurados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingSwitch label="Convite por link" checked={!!form.judge_add_by_link} onChange={(value) => handleChange("judge_add_by_link", value)} />
            <SettingSwitch label="Leitura de QR Code" checked={!!form.judge_add_by_qrcode} onChange={(value) => handleChange("judge_add_by_qrcode", value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{judgeLink}</div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => copy(judgeLink, "Link dos jurados copiado.")}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <QrCode className="h-5 w-5 text-cyan-500" />
            O QR Code deve apontar para o link dos jurados acima. A leitura fica habilitada quando a opcao estiver ativa.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-5 w-5 text-cyan-500" /> Criterios e Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Forma padrao de votacao</Label>
            <Select value={form.default_voting_control} onValueChange={(value) => handleChange("default_voting_control", value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ruler">Regua</SelectItem>
                <SelectItem value="thermometer">Termometro</SelectItem>
                <SelectItem value="speedometer">Velocimetro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            <GuideBox icon={Gauge} title="Adicionar criterios" text="Escolha o criterio e a forma de voto na aba Criterios." />
            <GuideBox icon={Tag} title="Adicionar categorias" text="Cadastre as categorias oficiais na aba Categorias." />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700">
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar configuracoes"}
      </Button>
    </div>
  );
}

function SettingSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function GuideBox({ icon: Icon, title, text }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2 font-medium">
        <Icon className="h-4 w-4 text-violet-500" /> {title}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
