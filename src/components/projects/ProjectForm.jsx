import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { slugify, isManager, normalizeRole } from "@/lib/acura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadUsers } from "@/lib/data";

const STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const COLORS = ["#0033A0", "#0057D9", "#0BB4F5", "#00A65A", "#A855F7", "#E5383B", "#F5A623"];

export default function ProjectForm({ initial, onSaved, onCancel, currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    client_name: "",
    project_leader_id: isManager(currentUser) ? currentUser.id : "",
    status: "PLANNING",
    priority: "MEDIUM",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    estimated_hours: "",
    color: COLORS[0],
    methodology: "BOTH",
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");

  useEffect(() => { loadUsers().then(setUsers).catch(() => {}); }, []);
  useEffect(() => {
    base44.entities.ProjectTemplate.list("-created_date", 100)
      .then(setTemplates)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.code && form.name) setForm((f) => ({ ...f, code: "ACT-" + String(Math.floor(Math.random() * 900) + 100) }));
  }, [form.name]); // eslint-disable-line

  const leaders = users.filter((u) => ["PROJECT_MANAGER", "ADMIN"].includes(normalizeRole(u.role)));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.project_leader_id || !form.start_date || !form.end_date) {
      setError("Preencha nome, líder e datas.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError("A data de fim não pode ser anterior à de início.");
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (initial?.id) {
        saved = await base44.entities.Project.update(initial.id, form);
      } else {
        saved = await base44.entities.Project.create({ ...form, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null });
        // RN-07: criar canal automático
        const slug = slugify(form.name);
        try {
          const channel = await base44.entities.Channel.create({
            project_id: saved.id,
            name: form.name,
            slug,
            type: "PROJECT",
          });
          // líder como primeiro membro da equipa + canal
          await base44.entities.TeamMember.create({
            project_id: saved.id,
            user_id: form.project_leader_id,
            project_role: "Líder",
            allocation_percent: 100,
            joined_at: new Date().toISOString(),
          });
          await base44.entities.ActivityLog.create({
            user_id: currentUser.id,
            entity_type: "PROJECT",
            entity_id: saved.id,
            action: "CREATED",
            changes: { name: form.name, channel: slug },
          });
          void channel;

          // Aplicar template: criar quadros e tarefas padrão
          if (templateId) {
            const tpl = templates.find((t) => t.id === templateId);
            if (tpl) {
              try {
                for (const b of (tpl.boards || [])) {
                  if (b.name) await base44.entities.Board.create({
                    name: b.name,
                    description: b.description || "",
                    color: b.color || tpl.color || "#0033A0",
                    project_id: saved.id,
                    owner_id: currentUser.id,
                  });
                }
                const start = new Date(form.start_date);
                for (const t of (tpl.tasks || [])) {
                  if (!t.title) continue;
                  const due = new Date(start);
                  due.setDate(due.getDate() + (t.duration_days || 1));
                  const ref = `${saved.id.slice(-4).toUpperCase()}-${Math.floor(Math.random() * 90) + 10}`;
                  await base44.entities.Task.create({
                    project_id: saved.id,
                    reference: ref,
                    title: t.title,
                    description: t.description || "",
                    assigned_to: form.project_leader_id,
                    duration_days: Number(t.duration_days || 1),
                    estimated_hours: Number(t.duration_days || 1) * 8,
                    priority: t.priority || "MEDIUM",
                    task_type: t.task_type || "DEV",
                    stage: t.stage || "BACKLOG",
                    start_date: form.start_date,
                    due_date: due.toISOString().slice(0, 10),
                    created_by: currentUser.id,
                  });
                }
              } catch (tplErr) { console.error("Template:", tplErr); }
            }
          }
        } catch (chErr) { console.error("Canal:", chErr); }
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "Erro ao guardar projeto");
    } finally {
      setSaving(false);
    }
  };

  const field = "h-11 bg-muted/40 border-border";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Nome do projeto *</Label>
          <Input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Código</Label>
          <Input className={field} value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="ACT-014" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea className="bg-muted/40 border-border" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Metodologia *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: "KANBAN", label: "Kanban", desc: "Fluxo contínuo" },
            { value: "SCRUM", label: "Scrum", desc: "Sprints e backlog" },
            { value: "BOTH", label: "Ambos", desc: "Kanban + Scrum" },
          ].map((m) => (
            <button type="button" key={m.value} onClick={() => set("methodology", m.value)} className={`text-left p-3 rounded-xl border transition-colors ${form.methodology === m.value ? "border-accent bg-accent/10" : "border-border hover:bg-muted/40"}`}>
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {!initial?.id && templates.length > 0 && (
        <div className="space-y-1.5">
          <Label>Aplicar template (opcional)</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={templateId} onChange={(e) => {
            setTemplateId(e.target.value);
            const tpl = templates.find((t) => t.id === e.target.value);
            if (tpl && !form.description) set("description", tpl.description || "");
            if (tpl) set("methodology", tpl.methodology);
          }}>
            <option value="">Começar do zero</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {(t.boards||[]).length} quadros · {(t.tasks||[]).length} tarefas</option>)}
          </select>
          {templateId && <p className="text-xs text-muted-foreground">Serão criados automaticamente os quadros e tarefas do template.</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Input className={field} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Líder *</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.project_leader_id} onChange={(e) => set("project_leader_id", e.target.value)} required>
            <option value="">Selecionar…</option>
            {leaders.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Início *</Label>
          <Input type="date" className={field} value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Fim *</Label>
          <Input type="date" className={field} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Horas estimadas</Label>
          <Input type="number" className={field} value={form.estimated_hours} onChange={(e) => set("estimated_hours", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex gap-2 h-11 items-center">
            {COLORS.map((c) => (
              <button type="button" key={c} onClick={() => set("color", c)} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : ""}`} style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? "A guardar…" : initial?.id ? "Guardar" : "Criar projeto"}</Button>
      </div>
    </form>
  );
}