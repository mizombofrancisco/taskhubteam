import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUS = [
  { value: "PRESENT", label: "Presente" },
  { value: "LATE", label: "Atrasado" },
  { value: "HALF_DAY", label: "Meio dia" },
  { value: "REMOTE", label: "Remoto" },
  { value: "ABSENT", label: "Ausente" },
  { value: "HOLIDAY", label: "Feriado" },
  { value: "MISSING", label: "Faltou registo" },
];

function diffHours(a, b) {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  const mins = (bh * 60 + bm) - (ah * 60 + am);
  return Math.max(0, Math.round((mins / 60) * 100) / 100);
}

export default function AttendanceForm({ users, initial, currentUser, onSaved, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    user_id: currentUser?.id || "",
    date: today,
    check_in: "09:00",
    lunch_out: "13:00",
    lunch_in: "14:00",
    check_out: "18:00",
    status: "PRESENT",
    notes: "",
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // total = (lunch_out - check_in) + (check_out - lunch_in)
  const total = diffHours(form.check_in, form.lunch_out) + diffHours(form.lunch_in, form.check_out);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.user_id || !form.date) {
      setError("Colaborador e data são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, total_hours: total };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.AttendanceRecord.update(initial.id, payload);
      } else {
        saved = await base44.entities.AttendanceRecord.create(payload);
        await base44.entities.ActivityLog.create({
          user_id: currentUser.id,
          entity_type: "ATTENDANCE",
          entity_id: saved.id,
          action: "CREATED",
          changes: { user_id: form.user_id, date: form.date },
        });
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "Erro ao guardar registo");
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
          <Label>Data *</Label>
          <Input type="date" className={field} value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label>Entrada</Label>
          <Input type="time" className={field} value={form.check_in} onChange={(e) => set("check_in", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Saída almoço</Label>
          <Input type="time" className={field} value={form.lunch_out} onChange={(e) => set("lunch_out", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Entrada almoço</Label>
          <Input type="time" className={field} value={form.lunch_in} onChange={(e) => set("lunch_in", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Saída</Label>
          <Input type="time" className={field} value={form.check_out} onChange={(e) => set("check_out", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Total horas</Label>
          <div className="h-11 flex items-center px-3 rounded-lg bg-muted/40 border border-border text-sm font-semibold">{total}h</div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea className="bg-muted/40 border-border" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? "A guardar…" : initial?.id ? "Guardar" : "Registar"}</Button>
      </div>
    </form>
  );
}