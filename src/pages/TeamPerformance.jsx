import React, { useEffect, useMemo, useState } from "react";
import { Gauge, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { PageHeader, SectionCard, StatCard, Loading, EmptyState, Avatar, ProgressBar } from "@/components/ui/acura";
import { loadUsers, loadAllTasks, loadAllWorklogs } from "@/lib/data";
import { ROLE_LABELS, normalizeRole } from "@/lib/acura";

export default function TeamPerformance() {
  const [users, setUsers] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [worklogs, setWorklogs] = useState([]);

  useEffect(() => {
    (async () => {
      const [u, t, w] = await Promise.all([loadUsers(), loadAllTasks(), loadAllWorklogs()]);
      setUsers(u);
      setTasks(t);
      setWorklogs(w);
    })();
  }, []);

  const members = useMemo(() => (users || []).filter((u) => normalizeRole(u.role) !== "ADMIN" || true), [users]);

  const perMember = useMemo(() => {
    return members.map((u) => {
      const myTasks = tasks.filter((t) => t.assigned_to === u.id);
      const done = myTasks.filter((t) => t.stage === "DONE").length;
      const inProgress = myTasks.filter((t) => t.stage === "IN_PROGRESS").length;
      const hours = worklogs.filter((w) => w.user_id === u.id).reduce((s, w) => s + (w.hours_spent || 0), 0);
      return { user: u, tasks: myTasks.length, done, inProgress, hours, progress: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 };
    }).filter((m) => m.tasks > 0 || m.hours > 0);
  }, [members, tasks, worklogs]);

  const chartData = useMemo(() => perMember.map((m) => ({ name: m.user.full_name?.split(" ")[0] || "?", Horas: m.hours, Tarefas: m.tasks })), [perMember]);

  const totals = useMemo(() => {
    const totalHours = perMember.reduce((s, m) => s + m.hours, 0);
    const totalTasks = perMember.reduce((s, m) => s + m.tasks, 0);
    const totalDone = perMember.reduce((s, m) => s + m.done, 0);
    const avgProgress = perMember.length ? Math.round(perMember.reduce((s, m) => s + m.progress, 0) / perMember.length) : 0;
    return { totalHours, totalTasks, totalDone, avgProgress };
  }, [perMember]);

  if (!users) return <Loading />;

  return (
    <div>
      <PageHeader title="Performance da Equipa" subtitle="Distribuição de carga de trabalho e progresso dos membros" icon={Gauge} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Horas registadas" value={`${totals.totalHours}h`} icon={Clock} accent="#0BB4F5" />
        <StatCard label="Tarefas atribuídas" value={totals.totalTasks} icon={TrendingUp} accent="#0057D9" />
        <StatCard label="Tarefas concluídas" value={totals.totalDone} icon={CheckCircle2} accent="#00A65A" />
        <StatCard label="Progresso médio" value={`${totals.avgProgress}%`} icon={Gauge} accent="#A855F7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Carga de trabalho (horas)">
          <div className="p-4 h-72">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 20%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(217 15% 65%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(217 15% 65%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(220 34% 12%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8, color: "#EEF3F9" }} />
                  <Bar dataKey="Horas" fill="#0BB4F5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={Clock} title="Sem dados" />}
          </div>
        </SectionCard>
        <SectionCard title="Tarefas por membro">
          <div className="p-4 h-72">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 20%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(217 15% 65%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(217 15% 65%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(220 34% 12%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8, color: "#EEF3F9" }} />
                  <Bar dataKey="Tarefas" fill="#0057D9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={TrendingUp} title="Sem dados" />}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Progresso individual">
        <div className="p-4 space-y-4">
          {perMember.length === 0 ? <EmptyState icon={Gauge} title="Sem membros com atividade" /> : perMember.map((m) => (
            <div key={m.user.id} className="flex items-center gap-4">
              <Avatar name={m.user.full_name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{m.user.full_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{ROLE_LABELS[normalizeRole(m.user.role)]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span>{m.hours}h</span>
                    <span>{m.done}/{m.tasks} concluídas</span>
                    <span className="font-semibold text-accent">{m.progress}%</span>
                  </div>
                </div>
                <ProgressBar value={m.progress} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}