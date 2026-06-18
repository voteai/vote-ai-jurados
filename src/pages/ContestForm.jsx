import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ClipboardList, Save, Settings, UserPlus, Users } from "lucide-react";
import { logAudit } from "@/lib/audit-log";

export default function ContestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    location: "",
    status: "draft",
    rules: "",
    allow_public_vote: false,
    public_vote_weight: 0,
    show_partial_ranking: false,
    show_individual_scores: false,
    show_comments: true,
    participant_add_by_link: true,
    participant_add_by_email: true,
    participant_add_manual: true,
    participant_name_field: "artist_name",
    judge_add_by_link: true,
    judge_add_by_qrcode: true,
    default_voting_control: "ruler",
  });

  useEffect(() => {
    if (isEdit) loadContest();
  }, [id]);

  const loadContest = async () => {
    const results = await base44.entities.Contest.filter({ id });
    if (results[0]) setForm((prev) => ({ ...prev, ...results[0] }));
  };

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await base44.entities.Contest.update(id, form);
        await logAudit({ action: "contest.update", entityType: "Contest", entityId: id, contestId: id, newValue: form });
      } else {
        const user = await base44.auth.me();
        const created = await base44.entities.Contest.create({
          ...form,
          owner_id: user.id,
          organizer_id: user.id,
          organizer_email: user.email,
          organizer_name: user.full_name,
        });
        await logAudit({ action: "contest.create", entityType: "Contest", entityId: created?.id, contestId: created?.id, newValue: created || form });
      }
      navigate(isEdit ? `/contests/${id}` : "/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to={isEdit ? `/contests/${id}` : "/dashboard"}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "Configuracoes do Concurso" : "Criar Concurso"}</h1>
            <p className="text-sm text-muted-foreground">Configure o fluxo de participantes, jurados, criterios e categorias.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Informacoes Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do Concurso *</Label>
                <Input value={form.name} onChange={(event) => handleChange("name", event.target.value)} required />
              </div>
              <div>
                <Label>Descricao</Label>
                <Textarea value={form.description} onChange={(event) => handleChange("description", event.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Inicio</Label>
                  <Input type="date" value={form.start_date} onChange={(event) => handleChange("start_date", event.target.value)} />
                </div>
                <div>
                  <Label>Data de Fim</Label>
                  <Input type="date" value={form.end_date} onChange={(event) => handleChange("end_date", event.target.value)} />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={(event) => handleChange("location", event.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="evaluating">Avaliando</SelectItem>
                    <SelectItem value="closed">Encerrado</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Regras</Label>
                <Textarea value={form.rules} onChange={(event) => handleChange("rules", event.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-cyan-500" /> Adicionar Participante</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <SwitchRow label="Por link" checked={!!form.participant_add_by_link} onChange={(value) => handleChange("participant_add_by_link", value)} />
                <SwitchRow label="Por email" checked={!!form.participant_add_by_email} onChange={(value) => handleChange("participant_add_by_email", value)} />
                <SwitchRow label="Cadastrar" checked={!!form.participant_add_manual} onChange={(value) => handleChange("participant_add_manual", value)} />
              </div>
              <div>
                <Label>Dados obrigatorios</Label>
                <Input value="Nome Artistico" readOnly className="mt-1 bg-muted/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-violet-500" /> Adicionar Jurado</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SwitchRow label="Por link" checked={!!form.judge_add_by_link} onChange={(value) => handleChange("judge_add_by_link", value)} />
              <SwitchRow label="Leitura do QR Code" checked={!!form.judge_add_by_qrcode} onChange={(value) => handleChange("judge_add_by_qrcode", value)} />
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-cyan-500" /> Criterios e Categorias</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Forma padrao para votar</Label>
                <Select value={form.default_voting_control} onValueChange={(value) => handleChange("default_voting_control", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ruler">Regua</SelectItem>
                    <SelectItem value="thermometer">Termometro</SelectItem>
                    <SelectItem value="speedometer">Velocimetro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                As categorias do concurso sao adicionadas na aba Categorias. Os criterios sao adicionados na aba Criterios usando a forma de voto definida aqui como padrao.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Configuracoes de Visibilidade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { field: "allow_public_vote", label: "Permitir votacao popular" },
                { field: "show_partial_ranking", label: "Mostrar ranking parcial para jurados" },
                { field: "show_individual_scores", label: "Mostrar notas individuais" },
                { field: "show_comments", label: "Mostrar comentarios" },
              ].map(({ field, label }) => (
                <SwitchRow key={field} label={label} checked={!!form[field]} onChange={(value) => handleChange(field, value)} />
              ))}
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving} className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-600 hover:to-violet-700">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Concurso"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function SwitchRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
