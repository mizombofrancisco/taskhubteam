import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ListTodo, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { loadMyTasks, loadMyProjects, loadUsers } from "@/lib/data";
import {
  PageHeader, SectionCard, EmptyState, Loading, Avatar, Semaphore, PriorityBadge, TaskTypeBadge,
} from "@/components/ui/acura";
import { trafficLight, semaphoreOrder, priorityOrder, fmtDate, STAGE_LABELS } from "@/lib/acura";
import TaskDetail from "@/components/projects/TaskDetail";

export default function MyTasks() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("ALL");

  useEffect(() => {
    (async () => {
      const [tasks, projects, users] = await Promise.all([loadMyTasks(user.id), loadMyProjects(user.id), loadUsers()]);
      setData({ tasks, projects, users });
    })();
  }, [user.id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.tasks
      .filter((t) => (stage === "ALL" || t.stage === stage) && (!q || t.title.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => semaphoreOrder(a) - semaphoreOrder(b) || priorityOrder(a) - priorityOrder(b) || new Date(a.due_date) - new Date(b.due_date));
  }, [data, q, stage]);

  if (!data) return <Loading />;

  return (
    <div>
      <PageHeader title="As Minhas Tarefas" subtitle="Tarefas atribuídas a si em todos os projetos" icon={ListTodo} />
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm" />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todas as etapas</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3 font-medium"></th>
                <th className="px-5 py-3 font-medium">Tarefa</th>
                <th className="px-5 py-3 font-medium">Projeto</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Prioridade</th>
                <th className="px-5 py-3 font-medium">Etapa</th>
                <th className="px-5 py-3 font-medium">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const p = data.projects.find((x) => x.id === t.project_id);
                return (
                  <tr key={t.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setOpenTask(t)}>
                    <td className="px-5 py-3"><Semaphore task={t} size={12} /></td>
                    <td className="px-5 py-3"><div className="font-medium">{t.title}</div><div className="text-xs text-muted-foreground font-mono">{t.reference}</div></td>
                    <td className="px-5 py-3 text-xs"><Link to={`/projects/${t.project_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-accent">{p?.name}</Link></td>
                    <td className="px-5 py-3"><TaskTypeBadge type={t.task_type} /></td>
                    <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-5 py-3 text-xs">{STAGE_LABELS[t.stage]}</td>
                    <td className="px-5 py-3 text-xs">{fmtDate(t.due_date, { day: "2-digit", month: "short" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <EmptyState icon={ListTodo} title="Sem tarefas" description="Não há tarefas atribuídas a si com estes filtros." />}
        </div>
      </SectionCard>
      {openTask && <TaskDetail task={openTask} users={data.users} currentUser={user} onClose={() => setOpenTask(null)} onChanged={() => {}} />}
    </div>
  );
}