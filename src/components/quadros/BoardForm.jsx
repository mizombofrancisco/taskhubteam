import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const PRESET_COLORS = ["#0033A0", "#0BB4F5", "#00A65A", "#F5A623", "#E5383B", "#7C3AED", "#0EA5E9"];

export default function BoardForm({ initial, currentUser, projects, onCancel, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || "#0033A0");
  const [projectId, setProjectId] = useState(initial?.project_id || (projects?.[0]?.id || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("O nome do quadro é obrigatório."); return; }
    if (!projectId) { setError("Selecione o projeto associado."); return; }
    setSaving(true); setError("");
    try {
      let saved;
      if (initial?.id) {
        saved = await base44.entities.Board.update(initial.id, { name, description, color, project_id: projectId });
      } else {
        saved = await base44.entities.Board.create({ name, description, color, project_id: projectId, owner_id: currentUser.id });
      }
      onSaved?.(saved);
    } catch (err) { setError(err.message || "Erro ao guardar quadro."); } finally { setSaving(false); }
  };

  const field = "w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Projeto associado *</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className={field}>
          <option value="">— Selecione um projeto —</option>
          {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome do quadro *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={field} placeholder="Ex. Roadmap Q4" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${field} h-auto py-2.5 resize-none`} placeholder="Objetivo do quadro…" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cor</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-offset-card ring-accent scale-110" : "hover:scale-105"}`} style={{ background: c }} aria-label={c} />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "A guardar…" : "Guardar"}</button>
      </div>
    </form>
  );
}