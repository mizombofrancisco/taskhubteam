import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TYPES = [
  { value: "VACATION", label: "Férias" },
  { value: "SICK", label: "Doença" },
  { value: "PERSONAL", label: "Assuntos pessoais" },
  { value: "MATERNITY", label: "Maternidade" },
  { value: "PATERNITY", label: "Paternidade" },
  { value: "UNPAID", label: "Sem vencimento" },
  { value: "BEREAVEMENT", label: "Falecimento" },
  { value: "STUDY", label: "Estudo" },
  { value: "OTHER", label: "Outro" },
];

function daysBetween(start, end, halfDay) {
  if (!start || !end) return 0;
  const a = new Date(start);
  const b = new Date(end);
  if (b < a) return 0;
  const diff = Math.round((b - a) / 86400000) + 1;
  return halfDay ? diff * 0.5 : diff;
}

export default function LeaveRequestForm({ users, initial, currentUser, onSaved, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    user_id: currentUser?.id || "",
    type: "VACATION",
    start_date: today,
    end_date: today,
    half_day: false,
    reason: "",
    status: "PENDING",
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const days = daysBetween(form.start_date, form.end_date, form.half_day);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.user_id || !form.start_date || !form.end_date) {
      setError("Colaborador e datas são obrigatórios.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError("A data de fim não pode ser anterior à de início.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, days };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.LeaveRequest.update(initial.id, payload);
      } else {
        saved = await base44.entities.LeaveRequest.create(payload);
        await base44.entities.ActivityLog.create({
          user_id: currentUser.id,
          entity_type: "LEAVE_REQUEST",
          entity_id: saved.id,
          action: "CREATED",
          changes: { user_id: form.user_id, type: form.type, days },
        });
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "Erro ao guardar pedido");
    } finally {
      setSaving(false);
    }
  };

  const field = "h-11 bg-muted/40 border-border";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Colaborador *</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.user_id} onChange={(e) => set("user_id", e.target.value)} required disabled={!!initial?.id}>
            <option value="">Selecionar…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de licença *</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Início *</Label>
          <Input type="date" className={field} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Fim *</Label>
          <Input type="date" className={field} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="half_day" checked={form.half_day} onChange={(e) => set("half_day", e.target.checked)} className="w-4 h-4 rounded" />
        <label htmlFor="half_day" className="text-sm">Meio dia</label>
        <span className="ml-auto text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{days} dia(s)</span></span>
      </div>
      <div className="space-y-1.5">
        <Label>Motivo / Observações</Label>
        <Textarea className="bg-muted/40 border-border" rows={3} value={form.reason} onChange={(e) => set("reason", e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? "A guardar…" : initial?.id ? "Guardar" : "Submeter pedido"}</Button>
      </div>
    </form>
  );
}