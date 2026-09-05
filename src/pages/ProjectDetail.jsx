import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, LayoutGrid, KanbanSquare, ListTodo, Users, BarChart3, Activity as ActivityIcon, Plus, Pencil, Trash2, Target, Settings, LineChart as LineChartIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  loadProject, loadProjectTasks, loadTeamMembers, loadUsers, loadProjectWorklogs, loadActivityForProject, deleteProject, deleteTask, logActivity,
} from "@/lib/data";
import {
  PageHeader, Loading, EmptyState, SectionCard, ProjectStatusBadge, ProgressBar, Avatar, Semaphore,
  PriorityBadge, TaskTypeBadge, WorklogStatusBadge,
} from "@/components/ui/acura";
import { useSelection, BulkBar, RowCheckbox } from "@/components/ui/BulkActions";
import {
  projectProgress, projectAtRisk, trafficLight, estimatedHours, fmtDate, fmtDateTime, relativeTime,
  STAGE_LABELS, STAGES, isAdmin, describeActivity, PRIORITY_LABELS,
} from "@/lib/acura";
import ProjectKanban from "@/components/projects/ProjectKanban";
import ProjectForm from "@/components/projects/ProjectForm";
import TaskForm from "@/components/projects/TaskForm";
import TaskDetail from "@/components/projects/TaskDetail";
import TeamTab from "@/components/projects/TeamTab";
import ScrumTab from "@/components/projects/ScrumTab";
import ProjectSettings from "@/components/projects/ProjectSettings";
import ProjectDashboard from "@/components/projects/ProjectDashboard";

const ALL_TABS = [
  { key: "overview", label: "Visão Geral", icon: LayoutGrid },
  { key: "dashboard", label: "Dashboard", icon: LineChartIcon },
  { key: "kanban", label: "Kanban", icon: KanbanSquare },
  { key: "scrum", label: "Scrum", icon: Target },
  { key: "tasks", label: "Tarefas", icon: ListTodo },
  { key: "team", label: "Equipa", icon: Users },
  { key: "reports", label: "Relatórios", icon: BarChart3 },
  { key: "activity", label: "Atividade", icon: ActivityIcon },
  { key: "settings", label: "Definições", icon: Settings },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const sel = useSelection();
  const [bulkStage, setBulkStage] = useState("TO_DO");
  const [bulkPriority, setBulkPriority] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const bulkDeleteTasks = async () => {
    const ids = Array.from(sel.selected);
    if (!ids.length || !confirm(`Eliminar ${ids.length} tarefa(s) e os seus comentários e registos?`)) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => deleteTask(id).catch(() => {})));
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao eliminar tarefas."); } finally { setBusy(false); }
  };

  const bulkUpdateTasks = async (field, value) => {
    const ids = Array.from(sel.selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.Task.update(id, { [field]: value }).catch(() => {})));
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao atualizar tarefas."); } finally { setBusy(false); }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Eliminar o projeto "${project.name}" e todos os seus dados?`)) return;
    try {
      await deleteProject(project.id);
      await logActivity({ entity_type: "PROJECT", entity_id: project.id, action: "DELETED", changes: { name: project.name } });
      navigate("/projects");
    } catch (e) { alert(e.message || "Erro ao eliminar projeto."); }
  };

  const reload = async () => {
    const [project, tasks, members, users, worklogs, activity] = await Promise.all([
      loadProject(id), loadProjectTasks(id), loadTeamMembers(id), loadUsers(), loadProjectWorklogs(id), loadActivityForProject(id).catch(() => []),
    ]);
    setData({ project, tasks, members, users, worklogs, activity });
  };

  useEffect(() => { reload(); }, [id]); // eslint-disable-line

  if (!data) return <Loading />;
  const { project, tasks, members, users, worklogs, activity } = data;
  if (!project) return <EmptyState title="Projeto não encontrado" action={<Link to="/projects" className="text-accent">Voltar</Link>} />;

  const progress = projectProgress(tasks);
  const risk = projectAtRisk(project, tasks);
  const canManage = isAdmin(user) || project.project_leader_id === user.id;
  const leader = users.find((u) => u.id === project.project_leader_id);
  const meth = project.methodology || "BOTH";
  const showKanban = meth === "KANBAN" || meth === "BOTH";
  const showScrum = meth === "SCRUM" || meth === "BOTH";
  const tabs = ALL_TABS.filter((t) => {
    if (t.key === "kanban") return showKanban;
    if (t.key === "scrum") return showScrum;
    return true;
  });

  const handleTasksChange = (signal) => {
    if (typeof signal === "string" && signal.startsWith("open:")) {
      const tid = signal.slice(5);
      setOpenTask(tasks.find((t) => t.id === tid));
      return;
    }
    reload();
  };

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> Projetos
      </Link>

      <PageHeader
        title={project.name}
        subtitle={`${project.code} · ${project.client_name || "Sem cliente"}`}
        actions={<div className="flex items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          {risk && <span className="text-xs text-destructive flex items-center gap-1"><ActivityIcon className="w-3.5 h-3.5" /> Em risco</span>}
          {canManage && (
            <div className="flex gap-1 ml-2">
              <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/60"><Pencil className="w-3.5 h-3.5" /> Editar</button>
              <button onClick={handleDeleteProject} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
            </div>
          )}
        </div>}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard title="Progresso" className="lg:col-span-2">
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Conclusão do projeto</span>
                <span className="text-2xl font-display font-bold">{progress}%</span>
              </div>
              <ProgressBar value={progress} className="h-3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <Stat label="Total tarefas" value={tasks.length} />
                <Stat label="Concluídas" value={tasks.filter((t) => t.stage === "DONE").length} />
                <Stat label="Em curso" value={tasks.filter((t) => t.stage === "IN_PROGRESS").length} />
                <Stat label="Atrasadas" value={tasks.filter((t) => trafficLight(t) === "red").length} />
              </div>
              {project.description && <p className="text-sm text-muted-foreground mt-6 whitespace-pre-wrap">{project.description}</p>}
            </div>
          </SectionCard>
          <SectionCard title="Informação">
            <div className="p-5 space-y-3 text-sm">
              <Row label="Líder" value={<div className="flex items-center gap-2"><Avatar name={leader?.full_name} size={28} />{leader?.full_name}</div>} />
              <Row label="Início" value={fmtDate(project.start_date)} />
              <Row label="Fim" value={fmtDate(project.end_date)} />
              <Row label="Horas estim." value={`${project.estimated_hours || "—"}h`} />
              <Row label="Horas registadas" value={`${Math.round(worklogs.filter((w) => w.status !== "REJECTED").reduce((s, w) => s + w.hours_spent, 0))}h`} />
              <Row label="Equipa" value={`${members.filter((m) => !m.removed_at).length} membros`} />
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "dashboard" && (
        <ProjectDashboard project={project} tasks={tasks} />
      )}

      {tab === "kanban" && (
        <ProjectKanban project={project} tasks={tasks} users={users} members={members} currentUser={user} onTasksChange={handleTasksChange} />
      )}

      {tab === "scrum" && (
        <ScrumTab project={project} tasks={tasks} users={users} currentUser={user} onChanged={reload} />
      )}

      {tab === "tasks" && (
        <div>
          {canManage && (
            <>
            <BulkBar count={sel.count} onClear={sel.clear}>
              <select value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
              <button onClick={() => bulkUpdateTasks("stage", bulkStage)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">Definir etapa</button>
              <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
                {Object.keys(PRIORITY_LABELS).map((s) => <option key={s} value={s}>{PRIORITY_LABELS[s]}</option>)}
              </select>
              <button onClick={() => bulkUpdateTasks("priority", bulkPriority)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">Definir prioridade</button>
              <button onClick={bulkDeleteTasks} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
            </BulkBar>
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <Plus className="w-4 h-4" /> Nova Tarefa
              </button>
            </div>
            </>
          )}
          <SectionCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    {canManage && <th className="px-5 py-3 w-10"><RowCheckbox checked={tasks.length && sel.count === tasks.length} onChange={() => sel.toggleAll(tasks.map((t) => t.id))} /></th>}
                    <th className="px-5 py-3 font-medium">Ref</th>
                    <th className="px-5 py-3 font-medium">Título</th>
                    <th className="px-5 py-3 font-medium">Responsável</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Prioridade</th>
                    <th className="px-5 py-3 font-medium">Etapa</th>
                    <th className="px-5 py-3 font-medium">Prazo</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((t) => {
                    const a = users.find((u) => u.id === t.assigned_to);
                    return (
                      <tr key={t.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setOpenTask(t)}>
                        {canManage && <td className="px-5 py-3"><RowCheckbox checked={sel.selected.has(t.id)} onChange={() => sel.toggle(t.id)} /></td>}
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
                        <td className="px-5 py-3 font-medium">{t.title}</td>
                        <td className="px-5 py-3"><div className="flex items-center gap-2"><Avatar name={a?.full_name} size={24} /><span className="text-xs">{a?.full_name || "—"}</span></div></td>
                        <td className="px-5 py-3"><TaskTypeBadge type={t.task_type} /></td>
                        <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                        <td className="px-5 py-3 text-xs">{STAGE_LABELS[t.stage]}</td>
                        <td className="px-5 py-3 text-xs">{fmtDate(t.due_date, { day: "2-digit", month: "short" })}</td>
                        <td className="px-5 py-3"><Semaphore task={t} size={12} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!tasks.length && <EmptyState title="Sem tarefas" />}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "team" && (
        <TeamTab project={project} users={users} members={members} tasks={tasks} worklogs={worklogs} currentUser={user} onChanged={reload} />
      )}

      {tab === "reports" && (
        <SectionCard title="Relatórios de trabalho do projeto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr><th className="px-5 py-3 font-medium">Colaborador</th><th className="px-5 py-3 font-medium">Data</th><th className="px-5 py-3 font-medium">Horas</th><th className="px-5 py-3 font-medium">Descrição</th><th className="px-5 py-3 font-medium">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {worklogs.map((w) => {
                  const u = users.find((x) => x.id === w.user_id);
                  return (
                    <tr key={w.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3"><div className="flex items-center gap-2"><Avatar name={u?.full_name} size={26} /><span className="text-xs">{u?.full_name}</span></div></td>
                      <td className="px-5 py-3 text-xs">{fmtDate(w.log_date)}</td>
                      <td className="px-5 py-3 font-medium">{w.hours_spent}h</td>
                      <td className="px-5 py-3 text-xs max-w-xs truncate">{w.description}</td>
                      <td className="px-5 py-3"><WorklogStatusBadge status={w.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-border"><tr><td className="px-5 py-3 font-semibold" colSpan={2}>Total</td><td className="px-5 py-3 font-semibold">{Math.round(worklogs.filter((w) => w.status !== "REJECTED").reduce((s, w) => s + w.hours_spent, 0))}h</td><td colSpan={2}></td></tr></tfoot>
            </table>
            {!worklogs.length && <EmptyState title="Sem registos" />}
          </div>
        </SectionCard>
      )}

      {tab === "activity" && (
        <SectionCard title="Registo de atividade">
          <div className="divide-y divide-border">
            {activity.map((a) => {
              const u = users.find((x) => x.id === a.user_id);
              return (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <Avatar name={u?.full_name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm"><span className="font-medium">{u?.full_name}</span> <span className="text-muted-foreground">· {describeActivity(a, users)}</span></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{relativeTime(a.created_date)}</span>
                </div>
              );
            })}
            {!activity.length && <EmptyState title="Sem atividade registada" />}
          </div>
        </SectionCard>
      )}

      {tab === "settings" && (
        <ProjectSettings project={project} currentUser={user} onChanged={reload} />
      )}

      {openTask && <TaskDetail task={openTask} users={users} members={members} currentUser={user} onClose={() => setOpenTask(null)} onChanged={reload} />}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Nova Tarefa</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <TaskForm projectId={project.id} members={members} users={users} currentUser={user} onCancel={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); reload(); }} />
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-2xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Editar Projeto</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <ProjectForm initial={project} currentUser={user} onCancel={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); reload(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return <div><div className="text-2xl font-display font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
function Row({ label, value }) {
  return <div className="flex justify-between items-center"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}