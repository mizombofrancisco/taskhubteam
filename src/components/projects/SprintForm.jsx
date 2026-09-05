import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SprintForm({ projectId, initial, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || `Sprint ${new Date().getFullYear()}`,
    goal: initial?.goal || "",
    start_date: initial?.start_date || new Date().toISOString().slice(0, 10),
    end_date: initial?.end_date || new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10),
    status: initial?.status || "PLANNING",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) { setError("Nome e datas são obrigatórios."); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { setError("O fim não pode ser anterior ao início."); return; }
    setSaving(true); setError("");
    try {
      let saved;
      if (initial?.id) {
        saved = await base44.entities.Sprint.update(initial.id, form);
      } else {
        saved = await base44.entities.Sprint.create({ ...form, project_id: projectId });
      }
      onSaved?.(saved);
    } catch (err) { setError(err.message || "Erro ao guardar sprint."); } finally { setSaving(false); }
  };

  const field = "w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome do sprint *</label>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus className={field} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Objetivo do sprint</label>
        <textarea value={form.goal} onChange={(e) => set("goal", e.target.value)} rows={2} className={`${field} h-auto py-2.5 resize-none`} placeholder="O que pretendemos entregar…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Início *</label>
          <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required className={field} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Fim *</label>
          <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required className={field} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Estado</label>
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className={field}>
          <option value="PLANNING">Planeamento</option>
          <option value="ACTIVE">Ativo</option>
          <option value="COMPLETED">Concluído</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "A guardar…" : "Guardar"}</button>
      </div>
    </form>
  );
}