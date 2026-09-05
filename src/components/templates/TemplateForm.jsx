import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { TASK_TYPE_META } from "@/lib/acura";

const PRESET_COLORS = ["#0033A0", "#0BB4F5", "#00A65A", "#F5A623", "#E5383B", "#7C3AED", "#0EA5E9"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TYPES = ["DEV", "DESIGN", "TRAINING", "BUGFIX"];
const STAGES = ["BACKLOG", "TO_DO", "IN_PROGRESS", "CODE_REVIEW", "DONE"];

const emptyBoard = { name: "", description: "", color: "#0033A0" };
const emptyTask = { title: "", description: "", task_type: "DEV", priority: "MEDIUM", duration_days: 1, stage: "BACKLOG" };

export default function TemplateForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    methodology: "BOTH",
    color: PRESET_COLORS[0],
    boards: [],
    tasks: [],
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addBoard = () => set("boards", [...form.boards, { ...emptyBoard }]);
  const updateBoard = (i, k, v) => set("boards", form.boards.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));
  const removeBoard = (i) => set("boards", form.boards.filter((_, idx) => idx !== i));
  const addTask = () => set("tasks", [...form.tasks, { ...emptyTask }]);
  const updateTask = (i, k, v) => set("tasks", form.tasks.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const removeTask = (i) => set("tasks", form.tasks.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("O nome do template é obrigatório."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        methodology: form.methodology,
        color: form.color,
        boards: form.boards.filter((b) => b.name.trim()),
        tasks: form.tasks.filter((t) => t.title.trim()),
      };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.ProjectTemplate.update(initial.id, payload);
      } else {
        saved = await base44.entities.ProjectTemplate.create(payload);
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "Erro ao guardar template.");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nome do template *</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required className={field} placeholder="Ex. Setup de projeto web" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Metodologia</label>
          <select value={form.methodology} onChange={(e) => set("methodology", e.target.value)} className={field}>
            <option value="KANBAN">Kanban</option>
            <option value="SCRUM">Scrum</option>
            <option value="BOTH">Ambos</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={`${field} h-auto py-2 resize-none`} placeholder="Para que serve este template…" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cor</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => set("color", c)} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-card ring-accent scale-110" : "hover:scale-105"}`} style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Quadros padrão */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Quadros padrão ({form.boards.length})</label>
          <button type="button" onClick={addBoard} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20">
            <Plus className="w-3.5 h-3.5" /> Adicionar quadro
          </button>
        </div>
        {form.boards.map((b, i) => (
          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex gap-2">
                <input value={b.name} onChange={(e) => updateBoard(i, "name", e.target.value)} placeholder="Nome do quadro" className={field} />
                <div className="flex gap-1 shrink-0">
                  {PRESET_COLORS.slice(0, 5).map((c) => (
                    <button key={c} type="button" onClick={() => updateBoard(i, "color", c)} className={`w-7 h-7 rounded-full ${b.color === c ? "ring-2 ring-accent" : ""}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <input value={b.description} onChange={(e) => updateBoard(i, "description", e.target.value)} placeholder="Descrição (opcional)" className={field} />
            </div>
            <button type="button" onClick={() => removeBoard(i)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {!form.boards.length && <p className="text-xs text-muted-foreground">Sem quadros. Adicione quadros que serão criados automaticamente.</p>}
      </div>

      {/* Tarefas padrão */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Tarefas padrão ({form.tasks.length})</label>
          <button type="button" onClick={addTask} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20">
            <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
          </button>
        </div>
        {form.tasks.map((t, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
            <div className="flex items-start gap-2">
              <input value={t.title} onChange={(e) => updateTask(i, "title", e.target.value)} placeholder="Título da tarefa" className={`${field} flex-1`} />
              <button type="button" onClick={() => removeTask(i)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
            <input value={t.description} onChange={(e) => updateTask(i, "description", e.target.value)} placeholder="Descrição / critérios (opcional)" className={field} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={t.task_type} onChange={(e) => updateTask(i, "task_type", e.target.value)} className={field}>
                {TYPES.map((tp) => <option key={tp} value={tp}>{TASK_TYPE_META[tp].label}</option>)}
              </select>
              <select value={t.priority} onChange={(e) => updateTask(i, "priority", e.target.value)} className={field}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={t.stage} onChange={(e) => updateTask(i, "stage", e.target.value)} className={field}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" min="1" value={t.duration_days} onChange={(e) => updateTask(i, "duration_days", Number(e.target.value))} placeholder="Dias" className={field} />
            </div>
          </div>
        ))}
        {!form.tasks.length && <p className="text-xs text-muted-foreground">Sem tarefas. Adicione tarefas que serão criadas no backlog.</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button>}
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? "A guardar…" : initial?.id ? "Guardar template" : "Criar template"}
        </button>
      </div>
    </form>
  );
}