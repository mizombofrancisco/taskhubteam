import React, { useEffect, useState, useMemo } from "react";
import { Timer, Plus, Check, X, ChevronLeft, ChevronRight, Clock, CalendarClock, Trash2, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadMyWorklogs, loadMyProjects, loadMyTasks, loadUsers, loadAllWorklogs, loadProjects, logActivity } from "@/lib/data";
import { PageHeader, SectionCard, StatCard, EmptyState, Loading, Avatar, WorklogStatusBadge } from "@/components/ui/acura";
import { useSelection, BulkBar, RowCheckbox } from "@/components/ui/BulkActions";
import { fmtDate, estimatedHours, STAGE_LABELS, WORKLOG_STATUS_LABELS, isManager as isManagerRole } from "@/lib/acura";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function startOfWeek(d) { const date = new Date(d); const day = (date.getDay() + 6) % 7; date.setDate(date.getDate() - day); date.setHours(0, 0, 0, 0); return date; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function iso(d) { return d.toISOString().slice(0, 10); }
function sameWeek(a, b) { return iso(startOfWeek(a)) === iso(startOfWeek(b)); }

export default function RegistoHoras() {
  const { user } = useAuth();
  const isManager = isManagerRole(user);
  const [tab, setTab] = useState("registos");
  const [mine, setMine] = useState(null);
  const [all, setAll] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editWl, setEditWl] = useState(null);
  const [filter, setFilter] = useState({ project: "ALL", user: "ALL", status: "ALL" });
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const sel = useSelection();
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [w, p, t] = await Promise.all([loadMyWorklogs(user.id), loadMyProjects(user.id), loadMyTasks(user.id)]);
    setMine(w); setProjects(p); setTasks(t);
  };
  const reloadAll = async () => {
    const [w, p, u] = await Promise.all([loadAllWorklogs(), loadProjects(), loadUsers()]);
    setAll(w); setProjects(p); setUsers(u);
  };

  useEffect(() => { reload(); if (isManager) reloadAll(); }, [user.id, isManager]); // eslint-disable-line

  const filteredAll = useMemo(() => {
    if (!all) return [];
    return all.filter((w) =>
      (filter.project === "ALL" || w.project_id === filter.project) &&
      (filter.user === "ALL" || w.user_id === filter.user) &&
      (filter.status === "ALL" || w.status === filter.status)
    );
  }, [all, filter]);

  const exportCsv = () => {
    const rows = [["Colaborador", "Projeto", "Data", "Horas", "Descrição", "Estado"]];
    filteredAll.forEach((w) => {
      const u = users.find((x) => x.id === w.user_id);
      const p = projects.find((x) => x.id === w.project_id);
      rows.push([u?.full_name || "", p?.name || "", w.log_date, w.hours_spent, (w.description || "").replace(/"/g, "'"), WORKLOG_STATUS_LABELS[w.status]]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "registo-horas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteWorklog = async (w) => {
    if (!confirm("Eliminar este registo de horas?")) return;
    try {
      await base44.entities.WorkLog.delete(w.id);
      await logActivity({ entity_type: "WORKLOG", entity_id: w.id, action: "DELETED", changes: { hours: w.hours_spent } });
      reload();
    } catch (e) { alert(e.message || "Erro ao eliminar registo."); }
  };

  const approve = async (w, status, note) => {
    await base44.entities.WorkLog.update(w.id, { status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note || null });
    await logActivity({ entity_type: "WORKLOG", entity_id: w.id, action: status === "APPROVED" ? "APPROVED" : "REJECTED", changes: { hours: w.hours_spent } });
    await base44.entities.Notification.create({
      user_id: w.user_id, type: status === "APPROVED" ? "WORKLOG_APPROVED" : "WORKLOG_REJECTED",
      title: status === "APPROVED" ? "Registo aprovado" : "Registo rejeitado",
      body: note ? note : status === "APPROVED" ? "O seu registo foi aprovado." : "O seu registo foi rejeitado.", link: "/registo-horas",
    });
    reloadAll();
  };

  const bulkDeleteMine = async () => {
    const ids = Array.from(sel.selected).filter((id) => {
      const w = (mine || []).find((x) => x.id === id);
      return w && w.status !== "APPROVED";
    });
    if (!ids.length) { alert("Apenas pode eliminar registos não aprovados."); return; }
    if (!confirm(`Eliminar ${ids.length} registo(s)?`)) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.WorkLog.delete(id).catch(() => {})));
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao eliminar registos."); } finally { setBusy(false); }
  };

  const bulkApprove = async (status) => {
    const ids = Array.from(sel.selected).filter((id) => {
      const w = (filteredAll || []).find((x) => x.id === id);
      return w && w.status === "SUBMITTED";
    });
    if (!ids.length) { alert("Selecione apenas registos submetidos."); return; }
    const note = status === "REJECTED" ? prompt("Motivo da rejeição (opcional):") || "" : "";
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.WorkLog.update(id, { status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), review_note: note || null }).catch(() => {})));
      sel.clear();
      await reloadAll();
    } catch (e) { alert(e.message || "Erro ao atualizar registos."); } finally { setBusy(false); }
  };

  // weekly grid
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const weekDays = useMemo(() => DAYS.map((_, i) => addDays(weekStart, i)), [weekStart]);
  const weekLogs = useMemo(() => (mine || []).filter((w) => sameWeek(w.log_date, weekStart)), [mine, weekStart]);
  const rows = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => map.set(t.id, { task: t, hours: Array(7).fill(0), total: 0 }));
    weekLogs.forEach((w) => {
      if (!w.task_id) return;
      if (!map.has(w.task_id)) {
        const t = tasks?.find((x) => x.id === w.task_id) || { id: w.task_id, title: "Tarefa removida", project_id: w.project_id };
        map.set(w.task_id, { task: t, hours: Array(7).fill(0), total: 0 });
      }
      const row = map.get(w.task_id);
      const d = new Date(w.log_date);
      row.hours[(d.getDay() + 6) % 7] += w.hours_spent || 0;
      row.total += w.hours_spent || 0;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tasks, weekLogs]);
  const dayTotals = useMemo(() => {
    const t = Array(7).fill(0);
    weekLogs.forEach((w) => { const d = new Date(w.log_date); t[(d.getDay() + 6) % 7] += w.hours_spent || 0; });
    return t;
  }, [weekLogs]);
  const weekTotal = dayTotals.reduce((s, h) => s + h, 0);

  if (!mine) return <Loading />;

  const weekLabel = `${fmtDate(weekStart, { day: "2-digit", month: "short" })} – ${fmtDate(addDays(weekStart, 6), { day: "2-digit", month: "short", year: "numeric" })}`;

  const tabs = [
    { id: "registos", label: "Os meus registos" },
    { id: "semana", label: "Resumo semanal" },
    ...(isManager ? [{ id: "aprovacoes", label: "Aprovações" }] : []),
  ];

  return (
    <div>
      <PageHeader title="Registo de Horas" subtitle="Lance, acompanhe e audite o tempo dedicado às tarefas" icon={Timer}
        actions={<button onClick={() => { setEditWl(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Registar horas</button>} />

      <div className="flex gap-1 border-b border-border mb-5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "registos" && (
        <>
        <BulkBar count={sel.count} onClear={sel.clear}>
          <button onClick={bulkDeleteMine} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
        </BulkBar>
        <SectionCard title="Os meus registos">
          <div className="divide-y divide-border">
            {mine.map((w) => {
              const p = projects.find((x) => x.id === w.project_id);
              return (
                <div key={w.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RowCheckbox checked={sel.selected.has(w.id)} onChange={() => sel.toggle(w.id)} />
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p?.name || "—"}</span>
                        <span className="text-xs text-muted-foreground">· {fmtDate(w.log_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{w.hours_spent}h</span>
                      <WorklogStatusBadge status={w.status} />
                      {w.status !== "APPROVED" && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditWl(w); setShowForm(true); }} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteWorklog(w)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{w.description}</p>
                  {w.review_note && <p className="text-xs text-destructive mt-1">Nota: {w.review_note}</p>}
                </div>
              );
            })}
            {!mine.length && <EmptyState icon={Timer} title="Sem registos" description="Lance o seu tempo nas tarefas para acompanhar o progresso." />}
          </div>
        </SectionCard>
        </>
      )}

      {tab === "semana" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Horas da semana" value={`${weekTotal}h`} icon={Clock} accent="#0BB4F5" />
            <StatCard label="Tarefas com registo" value={rows.filter((r) => r.total > 0).length} icon={Timer} accent="#0057D9" />
            <StatCard label="Média diária" value={`${(weekTotal / 7).toFixed(1)}h`} icon={Clock} accent="#A855F7" />
          </div>
          <SectionCard title={weekLabel} action={
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 rounded-lg hover:bg-muted/60"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-3 py-1.5 rounded-lg bg-muted/40 text-xs hover:bg-muted/60">Hoje</button>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 rounded-lg hover:bg-muted/60"><ChevronRight className="w-4 h-4" /></button>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-[220px]">Tarefa</th>
                    {weekDays.map((d, i) => <th key={i} className="px-3 py-3 font-medium text-center w-20">{DAYS[i]}<div className="text-[10px] text-muted-foreground/70 font-normal">{d.getDate()}</div></th>)}
                    <th className="px-4 py-3 font-medium text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(({ task, hours, total }) => {
                    const proj = projectMap.get(task.project_id);
                    return (
                      <tr key={task.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            {proj && <span style={{ color: proj.color }}>{proj.code}</span>}
                            <span>{STAGE_LABELS[task.stage] || task.stage}</span>
                          </div>
                        </td>
                        {hours.map((h, i) => (
                          <td key={i} className="px-3 py-3 text-center">
                            {h > 0 ? <span className="inline-flex items-center justify-center min-w-[34px] px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-semibold">{h}h</span> : <span className="text-muted-foreground/30">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold">{total}h</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-border">
                  <tr className="text-muted-foreground">
                    <td className="px-4 py-3 font-medium">Total por dia</td>
                    {dayTotals.map((h, i) => <td key={i} className="px-3 py-3 text-center font-semibold">{h > 0 ? `${h}h` : "—"}</td>)}
                    <td className="px-4 py-3 text-center font-bold text-accent">{weekTotal}h</td>
                  </tr>
                </tfoot>
              </table>
              {!rows.length && <EmptyState icon={Timer} title="Sem registos na semana" description="Lance o seu tempo para ver o resumo semanal." />}
            </div>
          </SectionCard>
        </>
      )}

      {tab === "aprovacoes" && isManager && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select value={filter.project} onChange={(e) => setFilter((f) => ({ ...f, project: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
              <option value="ALL">Todos os projetos</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filter.user} onChange={(e) => setFilter((f) => ({ ...f, user: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
              <option value="ALL">Todos os colaboradores</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
              <option value="ALL">Todos os estados</option>
              {Object.entries(WORKLOG_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={exportCsv} className="ml-auto px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/60">Exportar CSV</button>
          </div>
          <BulkBar count={sel.count} onClear={sel.clear}>
            <button onClick={() => bulkApprove("APPROVED")} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:opacity-80 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Aprovar</button>
            <button onClick={() => bulkApprove("REJECTED")} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:opacity-80 disabled:opacity-50"><X className="w-3.5 h-3.5" /> Rejeitar</button>
          </BulkBar>
          <SectionCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr><th className="px-5 py-3 w-10"><RowCheckbox checked={filteredAll.length && sel.count === filteredAll.length} onChange={() => sel.toggleAll(filteredAll.map((w) => w.id))} /></th><th className="px-5 py-3 font-medium">Colaborador</th><th className="px-5 py-3 font-medium">Projeto</th><th className="px-5 py-3 font-medium">Data</th><th className="px-5 py-3 font-medium">Horas</th><th className="px-5 py-3 font-medium">Estado</th><th className="px-5 py-3 font-medium">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAll.map((w) => {
                    const u = users.find((x) => x.id === w.user_id);
                    const p = projects.find((x) => x.id === w.project_id);
                    return (
                      <tr key={w.id} className="hover:bg-muted/40">
                        <td className="px-5 py-3"><RowCheckbox checked={sel.selected.has(w.id)} onChange={() => sel.toggle(w.id)} /></td>
                        <td className="px-5 py-3"><div className="flex items-center gap-2"><Avatar name={u?.full_name} size={26} /><span className="text-xs">{u?.full_name}</span></div></td>
                        <td className="px-5 py-3 text-xs">{p?.name}</td>
                        <td className="px-5 py-3 text-xs">{fmtDate(w.log_date)}</td>
                        <td className="px-5 py-3 font-medium">{w.hours_spent}h</td>
                        <td className="px-5 py-3"><WorklogStatusBadge status={w.status} /></td>
                        <td className="px-5 py-3">
                          {w.status === "SUBMITTED" && (
                            <div className="flex gap-1.5">
                              <button onClick={() => approve(w, "APPROVED")} className="p-1.5 rounded-lg bg-success/20 text-success hover:opacity-80" title="Aprovar"><Check className="w-4 h-4" /></button>
                              <button onClick={() => { const n = prompt("Motivo da rejeição:"); if (n !== null) approve(w, "REJECTED", n); }} className="p-1.5 rounded-lg bg-destructive/20 text-destructive hover:opacity-80" title="Rejeitar"><X className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-border"><tr><td className="px-5 py-3 font-semibold" colSpan={3}>Total</td><td className="px-5 py-3 font-semibold">{Math.round(filteredAll.filter((w) => w.status !== "REJECTED").reduce((s, w) => s + w.hours_spent, 0))}h</td><td colSpan={2}></td></tr></tfoot>
              </table>
              {!filteredAll.length && <EmptyState title="Sem registos" />}
            </div>
          </SectionCard>
        </div>
      )}

      {showForm && <WorklogForm user={user} projects={projects} tasks={tasks} initial={editWl} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setEditWl(null); reload(); }} />}
    </div>
  );
}

function WorklogForm({ user, projects, tasks, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    project_id: initial?.project_id || projects[0]?.id || "",
    task_id: initial?.task_id || "",
    hours_spent: initial?.hours_spent || "",
    log_date: initial?.log_date || new Date().toISOString().slice(0, 10),
    period_type: initial?.period_type || "DAILY",
    description: initial?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const projectTasks = tasks.filter((t) => t.project_id === form.project_id);

  const submit = async (e) => {
    e.preventDefault();
    const h = Number(form.hours_spent);
    if (!h || h <= 0 || h > 24) { setError("Horas entre 0.25 e 24."); return; }
    if (form.description.trim().length < 10) { setError("Descrição mínima 10 caracteres."); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id, task_id: form.task_id || null, project_id: form.project_id,
        hours_spent: h, log_date: form.log_date, period_type: form.period_type, description: form.description, status: "SUBMITTED",
      };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.WorkLog.update(initial.id, payload);
        await logActivity({ entity_type: "WORKLOG", entity_id: initial.id, action: "UPDATED", changes: { hours: h } });
      } else {
        saved = await base44.entities.WorkLog.create(payload);
        await logActivity({ entity_type: "WORKLOG", entity_id: saved.id, action: "SUBMITTED", changes: { hours: h, project_id: form.project_id } });
      }
      onSaved();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg acura-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="text-lg font-semibold">{initial?.id ? "Editar registo" : "Registar horas"}</h2><button onClick={onClose} className="text-muted-foreground">✕</button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-1.5"><label className="text-sm font-medium">Projeto *</label>
            <select value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value, task_id: "" }))} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Tarefa (opcional)</label>
            <select value={form.task_id} onChange={(e) => setForm((f) => ({ ...f, task_id: e.target.value }))} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm">
              <option value="">—</option>
              {projectTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Horas *</label><input type="number" step="0.25" min="0.25" max="24" value={form.hours_spent} onChange={(e) => setForm((f) => ({ ...f, hours_spent: e.target.value }))} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Data *</label><input type="date" value={form.log_date} onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value }))} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Período</label><select value={form.period_type} onChange={(e) => setForm((f) => ({ ...f, period_type: e.target.value }))} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm"><option value="DAILY">Diário</option><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option></select></div>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Descrição *</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full p-3 rounded-lg bg-muted/40 border border-border text-sm" placeholder="Atividades e entregas (mín 10 caracteres)" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">{saving ? "A guardar…" : initial?.id ? "Guardar" : "Submeter"}</button></div>
        </form>
      </div>
    </div>
  );
}