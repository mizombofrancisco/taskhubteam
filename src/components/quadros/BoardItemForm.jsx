import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export const BOARD_STAGES = ["TO_DO", "IN_PROGRESS", "DONE"];
export const BOARD_STAGE_LABELS = { TO_DO: "To-Do", IN_PROGRESS: "Em Curso", DONE: "Concluído" };
export const BOARD_STAGE_COLORS = { TO_DO: "#9AA3B5", IN_PROGRESS: "#0BB4F5", DONE: "#00A65A" };
const PRIORITY_LABELS = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };

export default function BoardItemForm({ boardId, users, initial, onCancel, onSaved }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [stage, setStage] = useState(initial?.stage || "TO_DO");
  const [priority, setPriority] = useState(initial?.priority || "MEDIUM");
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to || "");
  const [dueDate, setDueDate] = useState(initial?.due_date || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("O título é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const payload = { title, description, stage, priority, assigned_to: assignedTo || null, due_date: dueDate || null };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.BoardItem.update(initial.id, payload);
      } else {
        saved = await base44.entities.BoardItem.create({ ...payload, board_id: boardId, order_index: Date.now() });
      }
      onSaved?.(saved);
    } catch (err) { setError(err.message || "Erro ao guardar cartão."); } finally { setSaving(false); }
  };

  const field = "w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Título *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className={field} placeholder="O que precisa de ser feito?" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${field} h-auto py-2.5 resize-none`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Fase</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
            {BOARD_STAGES.map((s) => <option key={s} value={s}>{BOARD_STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Prioridade</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={field}>
            {Object.keys(PRIORITY_LABELS).map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Responsável</label>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={field}>
            <option value="">— Sem responsável —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Prazo</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "A guardar…" : "Guardar"}</button>
      </div>
    </form>
  );
}