import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ListTodo, CalendarClock, AlertTriangle, Clock, Plus, FolderKanban, MessageSquare, Bell,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { loadMyProjects, loadMyTasks, loadUsers, loadMyWorklogs, loadMyNotifications } from "@/lib/data";
import {
  PageHeader, StatCard, SectionCard, EmptyState, Loading, Avatar,
  Semaphore, PriorityBadge, TaskTypeBadge, ProgressBar,
} from "@/components/ui/acura";
import {
  trafficLight, semaphoreOrder, priorityOrder, projectProgress, fmtDate, STAGES, STAGE_LABELS,
} from "@/lib/acura";

export default function MyWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [projects, tasks, users, worklogs, notifications] = await Promise.all([
          loadMyProjects(user.id),
          loadMyTasks(user.id),
          loadUsers(),
          loadMyWorklogs(user.id),
          loadMyNotifications(user.id).catch(() => []),
        ]);
        setData({ projects, tasks, users, worklogs, notifications });
      } catch (e) { console.error(e); }
    })();
  }, [user.id]);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inProgress = data.tasks.filter((t) => t.stage === "IN_PROGRESS").length;
    const dueSoon = data.tasks.filter((t) => {
      if (t.stage === "DONE" || !t.due_date) return false;
      const d = new Date(t.due_date);
      return d >= now && d <= weekEnd;
    }).length;
    const overdue = data.tasks.filter((t) => trafficLight(t) === "red").length;
    const hoursMonth = data.worklogs
      .filter((w) => new Date(w.log_date) >= monthStart && w.status !== "REJECTED")
      .reduce((s, w) => s + (w.hours_spent || 0), 0);
    const unread = data.notifications.filter((n) => !n.is_read).length;
    return { inProgress, dueSoon, overdue, hoursMonth, unread };
  }, [data]);

  const sortedTasks = useMemo(() => {
    if (!data) return [];
    return [...data.tasks]
      .filter((t) => t.stage !== "DONE")
      .sort((a, b) => semaphoreOrder(a) - semaphoreOrder(b) || priorityOrder(a) - priorityOrder(b) || new Date(a.due_date) - new Date(b.due_date));
  }, [data]);

  if (!data) return <Loading />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] || "colaborador"}`}
        subtitle="O seu espaço de trabalho — tarefas, progresso e comunicação"
        icon={ListTodo}
        actions={
          <button onClick={() => navigate("/registo-horas")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Registar Progresso
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Em curso" value={stats.inProgress} icon={ListTodo} accent="#0057D9" />
        <StatCard label="A vencer esta semana" value={stats.dueSoon} icon={CalendarClock} accent="#F5A623" />
        <StatCard label="Atrasadas" value={stats.overdue} icon={AlertTriangle} accent="#E5383B" />
        <StatCard label="Horas no mês" value={Math.round(stats.hoursMonth)} icon={Clock} accent="#0BB4F5" hint="horas registadas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="As minhas tarefas" className="lg:col-span-2" action={<Link to="/my-tasks" className="text-xs text-accent hover:underline">Ver todas</Link>}>
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {sortedTasks.slice(0, 10).map((t) => {
              const project = data.projects.find((p) => p.id === t.project_id);
              return (
                <Link key={t.id} to={`/projects/${t.project_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                  <Semaphore task={t} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{t.reference}</span>
                      <span className="font-medium truncate">{t.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{project?.name}</div>
                  </div>
                  <TaskTypeBadge type={t.task_type} />
                  <PriorityBadge priority={t.priority} />
                  <div className="text-xs text-muted-foreground hidden sm:block w-20 text-right">{fmtDate(t.due_date, { day: "2-digit", month: "short" })}</div>
                </Link>
              );
            })}
            {!sortedTasks.length && <EmptyState title="Sem tarefas atribuídas" description="O seu líder ainda não lhe atribuiu tarefas." />}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Os meus projetos">
            <div className="divide-y divide-border">
              {data.projects.slice(0, 5).map((p) => {
                const ptasks = data.tasks.filter((t) => t.project_id === p.id);
                const progress = projectProgress(ptasks);
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block px-5 py-3 hover:bg-muted/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} className="mt-2" />
                  </Link>
                );
              })}
              {!data.projects.length && <EmptyState title="Sem projetos" />}
            </div>
          </SectionCard>

          <SectionCard title="Atalhos">
            <div className="p-3 grid grid-cols-2 gap-2">
              <Link to="/comunicacao" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted text-sm">
                <MessageSquare className="w-4 h-4 text-accent" /> Comunicação
              </Link>
              <Link to="/notifications" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted text-sm">
                <Bell className="w-4 h-4 text-accent" /> Notificações
                {stats.unread > 0 && <span className="ml-auto text-[10px] bg-accent text-background px-1.5 rounded-full">{stats.unread}</span>}
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}