import React, { useState, useMemo } from "react";
import { UserPlus, X, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Avatar, EmptyState, Loading } from "@/components/ui/acura";
import { ROLE_LABELS, fmtDate, isAdmin } from "@/lib/acura";

export default function TeamTab({ project, users, members, tasks, worklogs, currentUser, onChanged }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");
  const [role, setRole] = useState("");
  const [alloc, setAlloc] = useState(100);

  const canManage = isAdmin(currentUser) || project.project_leader_id === currentUser.id;
  const activeMembers = members.filter((m) => !m.removed_at);

  const memberUser = (m) => users.find((u) => u.id === m.user_id);
  const memberIds = new Set(activeMembers.map((m) => m.user_id));

  const candidates = users.filter((u) => u.is_active !== false && !memberIds.has(u.id) && u.id !== project.project_leader_id)
    .filter((u) => !q || u.full_name.toLowerCase().includes(q.toLowerCase()) || (u.job_title || "").toLowerCase().includes(q.toLowerCase()));

  const workload = useMemo(() => {
    const map = {};
    activeMembers.forEach((m) => { map[m.user_id] = { tasks: 0, hours: 0 }; });
    tasks.filter((t) => t.stage !== "DONE" && map[t.assigned_to]).forEach((t) => {
      map[t.assigned_to].tasks += 1;
      map[t.assigned_to].hours += (t.estimated_hours || (t.duration_days || 0) * 8);
    });
    return map;
  }, [activeMembers, tasks]);

  const addMember = async (userId) => {
    try {
      await base44.entities.TeamMember.create({
        project_id: project.id, user_id: userId, project_role: role || "Membro",
        allocation_percent: Number(alloc), joined_at: new Date().toISOString(),
      });
      await base44.entities.Notification.create({
        user_id: userId, type: "TEAM_ADDED", title: "Adicionado a um projeto",
        body: `Foi adicionado ao projeto "${project.name}".`, link: `/projects/${project.id}`,
      });
      await base44.entities.ActivityLog.create({
        user_id: currentUser.id, entity_type: "TEAM_MEMBER", entity_id: project.id, action: "ASSIGNED",
        changes: { user_id: userId, project: project.name },
      });
      setAdding(false); setPicked(""); setRole(""); setAlloc(100);
      onChanged?.();
    } catch (e) { alert(e.message || "Erro ao adicionar membro"); }
  };

  const removeMember = async (m) => {
    const mTasks = tasks.filter((t) => t.assigned_to === m.user_id && t.stage !== "DONE");
    if (!confirm(`Remover ${memberUser(m)?.full_name}? ${mTasks.length} tarefa(s) serão reatribuídas ao líder.`)) return;
    try {
      // reatribuir tarefas ao líder
      await Promise.all(mTasks.map((t) => base44.entities.Task.update(t.id, { assigned_to: project.project_leader_id, stage: "TO_DO" })));
      await base44.entities.TeamMember.update(m.id, { removed_at: new Date().toISOString() });
      await base44.entities.Notification.create({
        user_id: m.user_id, type: "TEAM_ADDED", title: "Removido do projeto",
        body: `Foi removido do projeto "${project.name}".`, link: "/projects",
      });
      onChanged?.();
    } catch (e) { alert(e.message || "Erro ao remover membro"); }
  };

  if (!users) return <Loading />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 acura-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Equipa do projeto ({activeMembers.length})</h3>
          {canManage && (
            <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <UserPlus className="w-4 h-4" /> Adicionar
            </button>
          )}
        </div>
        {adding && (
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar colaborador…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm" />
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {candidates.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                  <Avatar name={u.full_name} size={34} status={u.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]} · {u.job_title || "—"}</div>
                  </div>
                  <button onClick={() => addMember(u.id)} className="px-3 py-1.5 rounded-lg bg-accent text-background text-xs font-medium hover:opacity-90">Adicionar</button>
                </div>
              ))}
              {!candidates.length && <div className="text-center text-sm text-muted-foreground py-4">Sem colaboradores disponíveis</div>}
            </div>
          </div>
        )}
        <div className="divide-y divide-border">
          {activeMembers.map((m) => {
            const u = memberUser(m);
            const wl = workload[m.user_id] || { tasks: 0, hours: 0 };
            const capacity = (u?.daily_capacity_hours || 8) * 5;
            const pct = capacity ? Math.round((wl.hours / capacity) * 100) : 0;
            const barColor = pct > 100 ? "#E5383B" : pct >= 80 ? "#F5A623" : "#00A65A";
            return (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                <Avatar name={u?.full_name} size={40} status={u?.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{u?.full_name}</span>
                    {m.user_id === project.project_leader_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold">LÍDER</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.project_role || ROLE_LABELS[u?.role]} · {m.allocation_percent}% alocação · {wl.tasks} tarefas ativas</div>
                </div>
                <div className="hidden sm:block w-32">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right mt-0.5">{pct}% carga</div>
                </div>
                {canManage && m.user_id !== project.project_leader_id && (
                  <button onClick={() => removeMember(m)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></button>
                )}
              </div>
            );
          })}
          {!activeMembers.length && <EmptyState title="Sem membros" description="Adicione colaboradores à equipa." />}
        </div>
      </div>

      <div className="acura-card p-5">
        <h3 className="font-semibold mb-3">Resumo da equipa</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Membros ativos</span><span className="font-semibold">{activeMembers.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tarefas ativas</span><span className="font-semibold">{tasks.filter((t) => t.stage !== "DONE").length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Horas registadas</span><span className="font-semibold">{Math.round(worklogs.filter((w) => w.status !== "REJECTED").reduce((s, w) => s + w.hours_spent, 0))}h</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Início do projeto</span><span className="font-semibold">{fmtDate(project.start_date)}</span></div>
        </div>
      </div>
    </div>
  );
}