import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TASK_TYPE_META } from "@/lib/acura";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TYPES = ["DEV", "DESIGN", "TRAINING", "BUGFIX"];
const STAGES = ["BACKLOG", "TO_DO", "IN_PROGRESS", "CODE_REVIEW", "DONE"];

export default function TaskForm({ projectId, members, users, currentUser, initial, onSaved, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    duration_days: 1,
    estimated_hours: "",
    priority: "MEDIUM",
    task_type: "DEV",
    start_date: today,
    due_date: today,
    stage: "BACKLOG",
    ...initial,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const memberUsers = members
    .filter((m) => !m.removed_at)
    .map((m) => users.find((u) => u.id === m.user_id))
    .filter(Boolean);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.assigned_to || !form.duration_days || !form.start_date || !form.due_date) {
      setError("Título, responsável, duração, início e prazo são obrigatórios.");
      return;
    }
    if (new Date(form.due_date) < new Date(form.start_date)) {
      setError("O prazo não pode ser anterior ao início.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        project_id: projectId,
        duration_days: Number(form.duration_days),
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : Number(form.duration_days) * 8,
      };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.Task.update(initial.id, payload);
      } else {
        const ref = `${projectId.slice(-4).toUpperCase()}-${Math.floor(Math.random() * 90) + 10}`;
        saved = await base44.entities.Task.create({ ...payload, reference: ref, created_by: currentUser.id });
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "Erro ao guardar tarefa");
    } finally {
      setSaving(false);
    }
  };

  const field = "h-11 bg-muted/40 border-border";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição / Critérios de aceitação</Label>
        <Textarea className="bg-muted/40 border-border" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Responsável *</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} required>
            <option value="">Selecionar membro…</option>
            {memberUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de tarefa *</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.task_type} onChange={(e) => set("task_type", e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{TASK_TYPE_META[t].label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label>Duração (dias) *</Label>
          <Input type="number" min="1" className={field} value={form.duration_days} onChange={(e) => set("duration_days", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Horas estim.</Label>
          <Input type="number" className={field} value={form.estimated_hours} onChange={(e) => set("estimated_hours", e.target.value)} placeholder="auto" />
        </div>
        <div className="space-y-1.5">
          <Label>Início *</Label>
          <Input type="date" className={field} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Prazo *</Label>
          <Input type="date" className={field} value={form.due_date} onChange={(e) => set("due_date", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Etapa</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? "A guardar…" : initial?.id ? "Guardar" : "Criar tarefa"}</Button>
      </div>
    </form>
  );
}