import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, TrendingDown, PieChart as PieIcon } from "lucide-react";
import { SectionCard, EmptyState, Loading } from "@/components/ui/acura";
import { STAGE_LABELS, STAGES, STAGE_COLORS, fmtDate } from "@/lib/acura";

const STAGE_PIE_COLORS = ["#6B7280", "#6366F1", "#0057D9", "#A855F7", "#00A65A"];

export default function ProjectDashboard({ project, tasks }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sprintId, setSprintId] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await base44.entities.Sprint.filter({ project_id: project.id }, "-start_date", 100);
        if (!mounted) return;
        setSprints(list);
        const active = list.find((s) => s.status === "ACTIVE");
        setSprintId(active?.id || list[0]?.id || "");
      } catch (e) { console.error(e); } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [project.id]);

  const meth = project.methodology || "BOTH";
  const showBurndown = meth === "SCRUM" || meth === "BOTH";
  const showDistribution = meth === "KANBAN" || meth === "BOTH";

  // --- Distribuição de tarefas por etapa (Kanban) ---
  const distribution = useMemo(() => {
    return STAGES.map((s) => ({
      stage: STAGE_LABELS[s],
      total: tasks.filter((t) => t.stage === s).length,
      color: STAGE_COLORS[s],
    }));
  }, [tasks]);

  // --- Distribuição por tipo ---
  const byType = useMemo(() => {
    const types = ["DEV", "DESIGN", "TRAINING", "BUGFIX"];
    const labels = { DEV: "Dev", DESIGN: "Design", TRAINING: "Formação", BUGFIX: "Bugfix" };
    const colors = { DEV: "#0057D9", DESIGN: "#A855F7", TRAINING: "#0BB4F5", BUGFIX: "#E5383B" };
    return types.map((t) => ({ name: labels[t], value: tasks.filter((x) => x.task_type === t).length, color: colors[t] })).filter((x) => x.value > 0);
  }, [tasks]);

  // --- Burndown (Scrum) ---
  const burndown = useMemo(() => {
    const sprint = sprints.find((s) => s.id === sprintId);
    if (!sprint) return null;
    const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
    const total = sprintTasks.length;
    if (!total) return { sprint, data: [], total };

    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = end < today ? end : today;
    const days = [];
    for (let d = new Date(start); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    // garante pelo menos início
    if (!days.length) days.push(new Date(start));

    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const data = days.map((d, i) => {
      const completedUpTo = sprintTasks.filter((t) => t.completed_at && new Date(t.completed_at) <= new Date(d.getTime() + 86400000 - 1)).length;
      const remaining = total - completedUpTo;
      const ideal = Math.max(0, Math.round(total * (1 - (i / (totalDays - 1 || 1)))));
      return { date: fmtDate(d, { day: "2-digit", month: "2-digit" }), ideal, remaining };
    });
    return { sprint, data, total };
  }, [sprints, sprintId, tasks]);

  if (loading) return <Loading />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="w-4 h-4" /> Dashboard analítico do projeto
      </div>

      {showDistribution && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Distribuição de tarefas por etapa">
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 26%)" />
                  <XAxis dataKey="stage" stroke="#9AA3B5" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="#9AA3B5" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(220 34% 12.5%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8 }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Distribuição por tipo de tarefa">
            <div className="p-4">
              {byType.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}: ${e.value}`}>
                      {byType.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220 34% 12.5%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={PieIcon} title="Sem tarefas" />}
            </div>
          </SectionCard>
        </div>
      )}

      {showBurndown && (
        <SectionCard
          title="Burndown Chart"
          action={
            <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
              <option value="">Selecionar sprint…</option>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          }
        >
          <div className="p-4">
            {!sprints.length ? (
              <EmptyState icon={TrendingDown} title="Sem sprints" description="Crie sprints no separador Scrum para visualizar o burndown." />
            ) : !sprintId ? (
              <EmptyState icon={TrendingDown} title="Selecione um sprint" />
            ) : !burndown || !burndown.data.length ? (
              <EmptyState icon={TrendingDown} title="Sem dados" description="Atribua tarefas a este sprint para gerar o burndown." />
            ) : (
              <>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>{burndown.sprint.name}</span>
                  <span>{fmtDate(burndown.sprint.start_date)} → {fmtDate(burndown.sprint.end_date)}</span>
                  <span>{burndown.total} tarefas no sprint</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={burndown.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 26%)" />
                    <XAxis dataKey="date" stroke="#9AA3B5" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="#9AA3B5" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(220 34% 12.5%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#9AA3B5" strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="remaining" name="Restante" stroke="#0BB4F5" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}