import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Settings, Trash2, Save } from "lucide-react";
import { SectionCard } from "@/components/ui/acura";
import { deleteProject, logActivity } from "@/lib/data";

const STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const METHODOLOGIES = [
  { value: "KANBAN", label: "Kanban", desc: "Fluxo contínuo com colunas To-Do / Em Curso / Done." },
  { value: "SCRUM", label: "Scrum", desc: "Trabalho organizado em sprints com backlog do produto." },
  { value: "BOTH", label: "Ambos", desc: "Disponibiliza Kanban e Scrum no mesmo projeto." },
];
const COLORS = ["#0033A0", "#0057D9", "#0BB4F5", "#00A65A", "#A855F7", "#E5383B", "#F5A623"];

export default function ProjectSettings({ project, currentUser, onChanged }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...project });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) { setError("O nome é obrigatório."); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { setError("A data de fim não pode ser anterior à de início."); return; }
    setSaving(true); setError("");
    try {
      await base44.entities.Project.update(project.id, {
        name: form.name,
        description: form.description,
        client_name: form.client_name,
        status: form.status,
        priority: form.priority,
        methodology: form.methodology,
        start_date: form.start_date,
        end_date: form.end_date,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        color: form.color,
      });
      onChanged?.();
    } catch (err) { setError(err.message || "Erro ao guardar."); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Eliminar o projeto "${project.name}" e todos os seus dados?`)) return;
    try {
      await deleteProject(project.id);
      await logActivity({ entity_type: "PROJECT", entity_id: project.id, action: "DELETED", changes: { name: project.name } });
      navigate("/projects");
    } catch (e) { alert(e.message || "Erro ao eliminar projeto."); }
  };

  const field = "h-11 bg-muted/40 border-border";

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionCard title="Definições do projeto">
        <form onSubmit={save} className="p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Nome *</label>
              <input className={`${field} w-full rounded-lg px-3 text-sm`} value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Cliente</label>
              <input className={`${field} w-full rounded-lg px-3 text-sm`} value={form.client_name || ""} onChange={(e) => set("client_name", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <textarea className="w-full bg-muted/40 border-border rounded-lg px-3 py-2.5 text-sm resize-none" rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Metodologia *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METHODOLOGIES.map((m) => (
                <button key={m.value} type="button" onClick={() => set("methodology", m.value)} className={`text-left p-3 rounded-xl border transition-colors ${form.methodology === m.value ? "border-accent bg-accent/10" : "border-border hover:bg-muted/40"}`}>
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Estado</label>
              <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prioridade</label>
              <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Início</label>
              <input type="date" className={`${field} w-full rounded-lg px-3 text-sm`} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fim</label>
              <input type="date" className={`${field} w-full rounded-lg px-3 text-sm`} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Horas estimadas</label>
              <input type="number" className={`${field} w-full rounded-lg px-3 text-sm`} value={form.estimated_hours || ""} onChange={(e) => set("estimated_hours", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-2 h-11 items-center">
                {COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => set("color", c)} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : ""}`} style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "A guardar…" : "Guardar definições"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Zona de perigo">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Eliminar projeto</div>
            <div className="text-xs text-muted-foreground">Remove o projeto, tarefas, equipa, sprints e canal. Ação irreversível.</div>
          </div>
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" /> Eliminar projeto
          </button>
        </div>
      </SectionCard>
    </div>
  );
}