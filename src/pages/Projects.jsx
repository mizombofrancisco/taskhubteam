import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FolderKanban, Plus, Search, LayoutGrid, List, KanbanSquare, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { loadProjects, loadUsers, loadAllTasks, loadMyProjects, deleteProject, logActivity } from "@/lib/data";
import {
  PageHeader, StatCard, SectionCard, EmptyState, Loading, Avatar,
  ProjectStatusBadge, ProgressBar,
} from "@/components/ui/acura";
import { useSelection, BulkBar, RowCheckbox } from "@/components/ui/BulkActions";
import { projectProgress, projectAtRisk, fmtDate, PROJECT_STATUS_LABELS, isManager } from "@/lib/acura";
import ProjectForm from "@/components/projects/ProjectForm";
import PortfolioKanban from "@/components/projects/PortfolioKanban";

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("grid");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const sel = useSelection();
  const [bulkStatus, setBulkStatus] = useState("ACTIVE");
  const [busy, setBusy] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const handleDelete = async (p) => {
    if (!confirm(`Eliminar o projeto "${p.name}" e todas as suas tarefas, equipa e canal?`)) return;
    try {
      await deleteProject(p.id);
      await logActivity({ entity_type: "PROJECT", entity_id: p.id, action: "DELETED", changes: { name: p.name } });
      reload();
    } catch (e) { alert(e.message || "Erro ao eliminar projeto."); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(sel.selected);
    if (!ids.length || !confirm(`Eliminar ${ids.length} projeto(s) e todos os seus dados?`)) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => deleteProject(id).catch(() => {})));
      await logActivity({ entity_type: "PROJECT", action: "DELETED", changes: { count: ids.length } });
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao eliminar projetos."); } finally { setBusy(false); }
  };

  const bulkSetStatus = async () => {
    const ids = Array.from(sel.selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.Project.update(id, { status: bulkStatus }).catch(() => {})));
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao atualizar projetos."); } finally { setBusy(false); }
  };

  const reload = async () => {
    const [p, u, t] = await Promise.all([
      isAdmin ? loadProjects() : loadMyProjects(user.id),
      loadUsers(),
      loadAllTasks(),
    ]);
    setProjects(p); setUsers(u); setTasks(t);
  };

  useEffect(() => { reload(); }, [user.id, isAdmin]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (status !== "ALL" && p.status !== status) return false;
      if (q && !(`${p.name} ${p.code} ${p.client_name || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [projects, q, status]);

  const canCreate = isManager(user);

  if (!projects) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle="Portefólio de projetos Acuratech"
        icon={FolderKanban}
        actions={canCreate && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
        )}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome ou código…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os estados</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView("grid")} className={`p-2.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={`p-2.5 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setView("kanban")} className={`p-2.5 ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><KanbanSquare className="w-4 h-4" /></button>
        </div>
      </div>

      {canCreate && view !== "kanban" && (
        <BulkBar count={sel.count} onClear={sel.clear}>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={bulkSetStatus} disabled={busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">Definir estado</button>
          <button onClick={bulkDelete} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
        </BulkBar>
      )}

      {!filtered.length ? (
        <EmptyState icon={FolderKanban} title="Sem projetos" description={canCreate ? "Crie o primeiro projeto do portefólio." : "Ainda não foi adicionado a nenhum projeto."} action={canCreate && <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"><Plus className="w-4 h-4" /> Novo Projeto</button>} />
      ) : view === "kanban" ? (
        <PortfolioKanban tasks={tasks} projects={filtered} users={users} currentUser={user} onTasksChange={reload} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const ptasks = tasks.filter((t) => t.project_id === p.id);
            const progress = projectProgress(ptasks);
            const risk = projectAtRisk(p, ptasks);
            const leader = users.find((u) => u.id === p.project_leader_id);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="acura-card p-5 hover:acura-glow transition-shadow group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {canCreate && <RowCheckbox checked={sel.selected.has(p.id)} onChange={() => sel.toggle(p.id)} />}
                    <div className="w-1.5 h-8 rounded-full" style={{ background: p.color || "#0033A0" }} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate group-hover:text-accent transition-colors">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.code} {p.client_name ? `· ${p.client_name}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {risk && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    {canCreate && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditProject(p); setShowCreate(true); }} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p); }} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <ProjectStatusBadge status={p.status} />
                  <span className="text-xs text-muted-foreground">{ptasks.length} tarefas</span>
                </div>
                <ProgressBar value={progress} />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={leader?.full_name} size={26} />
                    <span className="text-xs text-muted-foreground">{leader?.full_name || "—"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtDate(p.end_date, { day: "2-digit", month: "short" })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <SectionCard>
          <div className="divide-y divide-border">
            {filtered.map((p) => {
              const ptasks = tasks.filter((t) => t.project_id === p.id);
              const progress = projectProgress(ptasks);
              const leader = users.find((u) => u.id === p.project_leader_id);
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40">
                  {canCreate && <RowCheckbox checked={sel.selected.has(p.id)} onChange={() => sel.toggle(p.id)} />}
                  <div className="w-1.5 h-9 rounded-full" style={{ background: p.color || "#0033A0" }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.code} · {leader?.full_name}</div>
                  </div>
                  <div className="hidden sm:block w-40"><ProgressBar value={progress} /></div>
                  <span className="w-10 text-right text-xs text-muted-foreground">{progress}%</span>
                  <ProjectStatusBadge status={p.status} />
                  {canCreate && (
                    <div className="flex gap-0.5">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditProject(p); setShowCreate(true); }} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p); }} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowCreate(false); setEditProject(null); }}>
          <div className="w-full max-w-2xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">{editProject ? "Editar Projeto" : "Novo Projeto"}</h2>
              <button onClick={() => { setShowCreate(false); setEditProject(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <ProjectForm initial={editProject} currentUser={user} onCancel={() => { setShowCreate(false); setEditProject(null); }} onSaved={(p) => { setShowCreate(false); setEditProject(null); if (!editProject) navigate(`/projects/${p.id}`); else reload(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}