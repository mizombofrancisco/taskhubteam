import React, { useEffect, useState, useMemo } from "react";
import { BarChart3, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { loadAllWorklogs, loadProjects, loadUsers } from "@/lib/data";
import { PageHeader, SectionCard, EmptyState, Loading } from "@/components/ui/acura";
import { TASK_TYPE_META, WORKLOG_STATUS_LABELS, fmtDate } from "@/lib/acura";

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ project: "ALL", status: "ALL", from: "", to: "" });

  useEffect(() => {
    (async () => {
      try {
        const [w, p, u] = await Promise.all([
          loadAllWorklogs().catch(() => []),
          loadProjects().catch(() => []),
          loadUsers().catch(() => []),
        ]);
        setData({ worklogs: w, projects: p, users: u });
      } catch (e) {
        setError(e.message || "Erro ao carregar relatórios.");
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.worklogs.filter((w) =>
      (filter.project === "ALL" || w.project_id === filter.project) &&
      (filter.status === "ALL" || w.status === filter.status) &&
      (!filter.from || w.log_date >= filter.from) &&
      (!filter.to || w.log_date <= filter.to)
    );
  }, [data, filter]);

  const byUser = useMemo(() => {
    if (!data) return [];
    const map = {};
    filtered.filter((w) => w.status !== "REJECTED").forEach((w) => {
      const u = data.users.find((x) => x.id === w.user_id);
      const name = u?.full_name || "—";
      map[name] = (map[name] || 0) + (w.hours_spent || 0);
    });
    return Object.entries(map).map(([name, hours]) => ({ name: name.split(" ")[0], hours: Math.round(hours) }));
  }, [filtered, data]);

  const byProject = useMemo(() => {
    if (!data) return [];
    const map = {};
    filtered.filter((w) => w.status !== "REJECTED").forEach((w) => {
      const p = data.projects.find((x) => x.id === w.project_id);
      const name = p?.code || "—";
      map[name] = (map[name] || 0) + (w.hours_spent || 0);
    });
    return Object.entries(map).map(([name, hours]) => ({ name, hours: Math.round(hours) }));
  }, [filtered, data]);

  const totalHours = filtered.filter((w) => w.status !== "REJECTED").reduce((s, w) => s + w.hours_spent, 0);

  const exportCsv = () => {
    const rows = [["Colaborador", "Projeto", "Data", "Horas", "Descrição", "Estado"]];
    filtered.forEach((w) => {
      const u = data.users.find((x) => x.id === w.user_id);
      const p = data.projects.find((x) => x.id === w.project_id);
      rows.push([u?.full_name || "", p?.name || "", w.log_date, w.hours_spent, (w.description || "").replace(/"/g, "'"), WORKLOG_STATUS_LABELS[w.status]]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "relatorio-horas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!data && !error) return <Loading />;
  if (error && !data) return (
    <div>
      <PageHeader title="Relatórios" subtitle="Auditoria consolidada de horas" icon={BarChart3} />
      <div className="acura-card p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={() => { setError(null); setData(null); setTimeout(() => window.location.reload(), 100); }} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Auditoria consolidada de horas" icon={BarChart3}
        actions={<button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/60"><Download className="w-4 h-4" /> Exportar CSV</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="acura-card p-5"><div className="text-2xl font-display font-bold">{Math.round(totalHours)}h</div><div className="text-xs text-muted-foreground mt-1">Total de horas</div></div>
        <div className="acura-card p-5"><div className="text-2xl font-display font-bold">{filtered.length}</div><div className="text-xs text-muted-foreground mt-1">Registos</div></div>
        <div className="acura-card p-5"><div className="text-2xl font-display font-bold">{new Set(filtered.map((w) => w.user_id)).size}</div><div className="text-xs text-muted-foreground mt-1">Colaboradores</div></div>
        <div className="acura-card p-5"><div className="text-2xl font-display font-bold">{new Set(filtered.map((w) => w.project_id)).size}</div><div className="text-xs text-muted-foreground mt-1">Projetos</div></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select value={filter.project} onChange={(e) => setFilter((f) => ({ ...f, project: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os projetos</option>
          {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os estados</option>
          {Object.entries(WORKLOG_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={filter.from} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm" />
        <input type="date" value={filter.to} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="Horas por colaborador">
          <div className="p-4 h-[280px]">
            {byUser.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byUser} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 22%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9AA3B5", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9AA3B5", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0E1A2C", border: "1px solid #2B3140", borderRadius: 8, color: "#EEF3F9" }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#0057D9" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Sem dados" />}
          </div>
        </SectionCard>
        <SectionCard title="Horas por projeto">
          <div className="p-4 h-[280px]">
            {byProject.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProject} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 26% 22%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#9AA3B5", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9AA3B5", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0E1A2C", border: "1px solid #2B3140", borderRadius: 8, color: "#EEF3F9" }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#0BB4F5" />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Sem dados" />}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Detalhe dos registos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr><th className="px-5 py-3 font-medium">Colaborador</th><th className="px-5 py-3 font-medium">Projeto</th><th className="px-5 py-3 font-medium">Data</th><th className="px-5 py-3 font-medium">Horas</th><th className="px-5 py-3 font-medium">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 50).map((w) => {
                const u = data.users.find((x) => x.id === w.user_id);
                const p = data.projects.find((x) => x.id === w.project_id);
                return (
                  <tr key={w.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-xs">{u?.full_name}</td>
                    <td className="px-5 py-3 text-xs">{p?.name}</td>
                    <td className="px-5 py-3 text-xs">{fmtDate(w.log_date)}</td>
                    <td className="px-5 py-3 font-medium">{w.hours_spent}h</td>
                    <td className="px-5 py-3 text-xs">{WORKLOG_STATUS_LABELS[w.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title="Sem registos" />}
        </div>
      </SectionCard>
    </div>
  );
}