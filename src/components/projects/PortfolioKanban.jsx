import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { STAGES, STAGE_LABELS, STAGE_COLORS, estimatedHours } from "@/lib/acura";
import TaskCard from "@/components/projects/TaskCard";
import { EmptyState } from "@/components/ui/acura";

export default function PortfolioKanban({ tasks, projects, users, currentUser, onTasksChange }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  const scopedTasks = useMemo(() => tasks.filter((t) => projectIds.has(t.project_id)), [tasks, projectIds]);

  const visibleTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      if (assigneeFilter !== "ALL" && t.assigned_to !== assigneeFilter) return false;
      if (filter && !t.title.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [scopedTasks, filter, assigneeFilter]);

  const assignees = useMemo(() => {
    const ids = new Set(scopedTasks.map((t) => t.assigned_to).filter(Boolean));
    return users.filter((u) => ids.has(u.id));
  }, [scopedTasks, users]);

  const byStage = (stage) => visibleTasks.filter((t) => t.stage === stage).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;
    const fromStage = source.droppableId;
    const toStage = destination.droppableId;
    if (fromStage === toStage && source.index === destination.index) return;

    const isOwn = task.assigned_to === currentUser.id;
    const canManage = currentUser?.role === "ADMIN" || projectMap.get(task.project_id)?.project_leader_id === currentUser.id;
    if (!canManage && !isOwn) return;

    // RN-02: exigir WorkLog ao entrar em DONE
    if (toStage === "DONE" && fromStage !== "DONE") {
      try {
        const hasLog = await base44.entities.WorkLog.filter({ task_id: task.id }, null, 1);
        if (!hasLog.length) {
          alert("Registe pelo menos um relatório de trabalho antes de concluir.");
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const updates = { stage: toStage, order_index: destination.index };
    if (toStage === "IN_PROGRESS" && !task.start_date) updates.start_date = new Date().toISOString().slice(0, 10);
    if (toStage === "DONE" && fromStage !== "DONE") updates.completed_at = new Date().toISOString();
    if (toStage !== "DONE" && fromStage === "DONE") updates.completed_at = null;

    try {
      await base44.entities.Task.update(task.id, updates);
      onTasksChange?.();
    } catch (e) {
      console.error(e);
      alert("Não foi possível mover a tarefa.");
    }
  };

  if (!scopedTasks.length) {
    return <EmptyState title="Sem tarefas" description="Os projetos selecionados não têm tarefas associadas." />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar tarefas…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </div>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os responsáveis</option>
          {assignees.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {STAGES.map((stage) => {
            const list = byStage(stage);
            const hours = list.reduce((s, t) => s + estimatedHours(t), 0);
            return (
              <div key={stage} className="flex flex-col rounded-xl bg-muted/30 border border-border min-h-[200px]">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                    <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                    <span className="text-xs text-muted-foreground">{list.length}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{Math.round(hours)}h</span>
                </div>
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? "bg-accent/5" : ""}`}>
                      {list.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(p) => (
                            <TaskCard
                              task={task}
                              users={users}
                              projectCode={projectMap.get(task.project_id)?.code}
                              draggableProps={p}
                              dragHandleProps={p.dragHandleProps}
                              onClick={() => navigate(`/projects/${task.project_id}`)}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!list.length && <div className="text-center text-xs text-muted-foreground py-6">Sem tarefas</div>}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}