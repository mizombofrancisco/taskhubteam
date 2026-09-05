import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderKanban, AlertTriangle, CalendarClock, Clock, CheckCircle2, Users, Activity,
  Plus, ListTodo, UserPlus, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/AuthContext";
import {
  loadProjects, loadAllTasks, loadAllWorklogs, loadUsers, loadMyProjects, loadMyNotifications,
} from "@/lib/data";
import {
  PageHeader, StatCard, SectionCard, EmptyState, Loading, Avatar,
  ProjectStatusBadge, Semaphore, ProgressBar, WorklogStatusBadge,
} from "@/components/ui/acura";
import {
  trafficLight, projectProgress, projectAtRisk, estimatedHours, fmtDate, relativeTime,
  STAGES, STAGE_LABELS, STAGE_COLORS, ROLE_LABELS, normalizeRole,
} from "@/lib/acura";

const STAGE_PIE = STAGES.map((s) => ({ name: STAGE_LABELS[s], key: s, color: STAGE_COLORS[s] }));

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const role = normalizeRole(user?.role);

  useEffect(() => {
    (async () => {
      try {
        const [projects, tasks, worklogs, users] = await Promise.all([
          role === "ADMIN" ? loadProjects() : loadMyProjects(user.id),
          loadAllTasks(),
          loadAllWorklogs(),
          loadUsers(),
        ]);
        let scopedProjects = projects;
        let scopedTasks = tasks;
        if (role !== "ADMIN") {
          const ids = new Set(projects.map((p) => p.id));
          scopedTasks = tasks.filter((t) => ids.has(t.project_id));
        }
        let notifications = [];
        try { notifications = await loadMyNotifications(user.id); } catch {}
        setData({ projects: scopedProjects, tasks: scopedTasks, worklogs, users, notifications });
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user.id, role]);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeProjects = data.projects.filter((p) => p.status === "ACTIVE");
    const atRisk = data.projects.filter((p) => projectAtRisk(p, data.tasks.filter((t) => t.project_id === p.id)));
    const overdue = data.tasks.filter((t) => trafficLight(t) === "red");
    const hoursMonth = data.worklogs
      .filter((w) => new Date(w.log_date) >= monthStart && w.status !== "REJECTED")
      .reduce((s, w) => s + (w.hours_spent || 0), 0);
    const done = data.tasks.filter((t) => t.stage === "DONE").length;
    const completion = data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0;
    const onlineNow = data.users.filter((u) => u.status === "ONLINE").length;
    const pendingApprovals = data.worklogs.filter((w) => w.status === "SUBMITTED");
    return { activeProjects, atRisk, overdue, hoursMonth, completion, onlineNow, pendingApprovals };
  }, [data]);

  const hoursByProject = useMemo(() => {
    if (!data) return [];
    const map = {};
    data.worklogs.filter((w) => w.status !== "REJECTED").forEach((w) => {
      const p = data.projects.find((x) => x.id === w.project_id);
      const name = p ? p.code : "—";
      map[name] = (map[name] || 0) + (w.hours_spent || 0);
    });
    return Object.entries(map).map(([name, hours]) => ({ name, hours: Math.round(hours) })).slice(0, 8);
  }, [data]);

  const stageDist = useMemo(() => {
    if (!data) return [];
    return STAGE_PIE.map((s) => ({ ...s, value: data.tasks.filter((t) => t.stage === s.key).length })).filter((s) => s.value > 0);
  }, [data]);

  if (!data) return <Loading />;
  if (!data.projects.length && role !== "ADMIN") {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Ainda não está em nenhum projeto"
        description="Assim que um líder o adicionar a uma equipa, os seus projetos e tarefas aparecem aqui."
      />
    );
  }

  const isManager = role === "PROJECT_MANAGER" || role === "ADMIN";

  return (
    <div>
      <PageHeader
        title={isManager ? "Painel Executivo" : "Dashboard"}
        subtitle={role === "ADMIN" ? "Visão global do portefólio Acuratech" : "Visão dos seus projetos"}
        icon={BarChart3}
        actions={
          isManager && (
            <>
              <button onClick={() => navigate("/projects/new")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                <Plus className="w-4 h-4" /> Novo Projeto
              </button>
              <button onClick={() => navigate("/my-tasks")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/60">
                <ListTodo className="w-4 h-4" /> Nova Tarefa
              </button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Projetos ativos" value={stats.activeProjects.length} icon={FolderKanban} accent="#0057D9" onClick={() => navigate("/projects")} />
        <StatCard label="Em risco" value={stats.atRisk.length} icon={AlertTriangle} accent="#E5383B" onClick={() => navigate("/projects")} />
        <StatCard label="Tarefas atrasadas" value={stats.overdue.length} icon={CalendarClock} accent="#F5A623" />
        <StatCard label="Horas no mês" value={Math.round(stats.hoursMonth)} icon={Clock} accent="#0BB4F5" hint="horas registadas" />
        <StatCard label="Conclusão global" value={`${stats.completion}%`} icon={CheckCircle2} accent="#00A65A" />
        <StatCard label="Online agora" value={stats.onlineNow} icon={Users} accent="#00A65A" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <SectionCard title="Horas por projeto" className="lg:col-span-2">
          <div className="p-4 h-[280px]">
            {hoursByProject.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursByProject} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 22%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9AA3B5", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9AA3B5", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0E1A2C", border: "1px solid #2B3140", borderRadius: 8, color: "#EEF3F9" }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#0057D9" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Sem dados de horas" />}
          </div>
        </SectionCard>

        <SectionCard title="Tarefas por etapa">
          <div className="p-4 h-[280px] flex items-center justify-center">
            {stageDist.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stageDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {stageDist.map((s) => <Cell key={s.key} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0E1A2C", border: "1px solid #2B3140", borderRadius: 8, color: "#EEF3F9" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Sem tarefas" />}
          </div>
          <div className="px-5 pb-4 flex flex-wrap gap-3">
            {stageDist.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.name} ({s.value})
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Projetos" className="lg:col-span-2" action={<Link to="/projects" className="text-xs text-accent hover:underline">Ver todos</Link>}>
          <div className="divide-y divide-border">
            {data.projects.slice(0, 6).map((p) => {
              const ptasks = data.tasks.filter((t) => t.project_id === p.id);
              const progress = projectProgress(ptasks);
              const risk = projectAtRisk(p, ptasks);
              const leader = data.users.find((u) => u.id === p.project_leader_id);
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40">
                  <div className="w-1.5 h-10 rounded-full" style={{ background: p.color || "#0033A0" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      {risk && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.code} · {leader?.full_name || "—"}</div>
                  </div>
                  <div className="hidden sm:block w-32"><ProgressBar value={progress} /></div>
                  <div className="w-12 text-right text-xs text-muted-foreground">{progress}%</div>
                  <ProjectStatusBadge status={p.status} />
                </Link>
              );
            })}
            {!data.projects.length && <EmptyState title="Sem projetos" />}
          </div>
        </SectionCard>

        <SectionCard title="Aprovações pendentes" action={<Link to="/reports" className="text-xs text-accent hover:underline">Relatórios</Link>}>
          <div className="divide-y divide-border max-h-[340px] overflow-y-auto">
            {stats.pendingApprovals.slice(0, 8).map((w) => {
              const author = data.users.find((u) => u.id === w.user_id);
              return (
                <div key={w.id} className="px-5 py-3 flex items-center gap-3">
                  <Avatar name={author?.full_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{author?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{w.hours_spent}h · {fmtDate(w.log_date)}</div>
                  </div>
                  <WorklogStatusBadge status={w.status} />
                </div>
              );
            })}
            {!stats.pendingApprovals.length && <EmptyState title="Tudo aprovado" description="Sem timesheets pendentes." />}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}