import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { STAGES, STAGE_LABELS, STAGE_COLORS, estimatedHours, isAdmin } from "@/lib/acura";
import TaskCard from "@/components/projects/TaskCard";
import TaskForm from "@/components/projects/TaskForm";
import { EmptyState } from "@/components/ui/acura";

export default function ProjectKanban({ project, tasks, users, members, currentUser, onTasksChange }) {
  const [filter, setFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [creatingStage, setCreatingStage] = useState("BACKLOG");

  const canManage = isAdmin(currentUser) || project.project_leader_id === currentUser.id;
  const memberIds = new Set(members.filter((m) => !m.removed_at).map((m) => m.user_id));
  const canMoveAny = canManage;

  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (assigneeFilter !== "ALL" && t.assigned_to !== assigneeFilter) return false;
      if (filter && !t.title.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filter, assigneeFilter]);

  const byStage = (stage) => visibleTasks.filter((t) => t.stage === stage).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;
    const fromStage = source.droppableId;
    const toStage = destination.droppableId;
    const isOwn = task.assigned_to === currentUser.id;
    if (!canMoveAny && !isOwn) return;

    // RN-02: exigir WorkLog ao entrar em DONE
    if (toStage === "DONE" && fromStage !== "DONE") {
      const hasLog = await base44.entities.WorkLog.filter({ task_id: task.id }, null, 1);
      if (!hasLog.length) {
        alert("Registe pelo menos um relatório de trabalho antes de concluir.");
        return;
      }
    }

    const updates = { stage: toStage, order_index: destination.index };
    if (toStage === "IN_PROGRESS" && !task.start_date) updates.start_date = new Date().toISOString().slice(0, 10);
    if (toStage === "DONE" && fromStage !== "DONE") updates.completed_at = new Date().toISOString();
    if (toStage !== "DONE" && fromStage === "DONE") updates.completed_at = null;

    // reorder within destination
    const destList = byStage(toStage);
    const reordered = [...destList];
    const moved = { ...task, ...updates };
    reordered.splice(destination.index, 0, moved);
    try {
      await base44.entities.Task.update(task.id, updates);
      // persist order for siblings
      reordered.forEach((t, i) => {
        if (t.id !== task.id && (t.order_index || 0) !== i) {
          base44.entities.Task.update(t.id, { order_index: i });
        }
      });
      onTasksChange?.();
    } catch (e) { console.error(e); alert("Não foi possível mover a tarefa."); }
  };

  const openCreate = (stage) => { setCreatingStage(stage); setShowCreate(true); };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar tarefas…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </div>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os responsáveis</option>
          {members.filter((m) => !m.removed_at).map((m) => {
            const u = users.find((x) => x.id === m.user_id);
            return <option key={m.id} value={m.user_id}>{u?.full_name}</option>;
          })}
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
                              draggableProps={p}
                              dragHandleProps={p.dragHandleProps}
                              onClick={() => onTasksChange?.("open:" + task.id)}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!list.length && <div className="text-center text-xs text-muted-foreground py-6">Sem tarefas</div>}
                    </div>
                  )}
                </Droppable>
                {canManage && (
                  <button onClick={() => openCreate(stage)} className="m-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Nova Tarefa</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <TaskForm projectId={project.id} members={members} users={users} currentUser={currentUser} initial={{ stage: creatingStage }} onCancel={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); onTasksChange?.(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}