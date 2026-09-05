import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send, Clock, MessageSquare, CheckSquare, Pencil, Trash2 } from "lucide-react";
import {
  Semaphore, PriorityBadge, TaskTypeBadge, Avatar, WorklogStatusBadge, EmptyState,
} from "@/components/ui/acura";
import {
  STAGE_LABELS, fmtDate, fmtDateTime, relativeTime, SEMAPHORE_META, trafficLight, WORKLOG_STATUS_LABELS,
} from "@/lib/acura";
import TaskForm from "@/components/projects/TaskForm";
import { deleteTask } from "@/lib/data";

export default function TaskDetail({ task, users, members, currentUser, onClose, onChanged }) {
  const [comments, setComments] = useState([]);
  const [worklogs, setWorklogs] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [wlHours, setWlHours] = useState("");
  const [wlDesc, setWlDesc] = useState("");
  const [tab, setTab] = useState("comments");
  const [showEdit, setShowEdit] = useState(false);

  const canManage = currentUser && (currentUser.role === "ADMIN" || currentUser.role === "PROJECT_MANAGER" || currentUser.id === task?.assigned_to);

  const handleDelete = async () => {
    if (!confirm(`Eliminar a tarefa "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      onChanged?.();
      onClose?.();
    } catch (e) { alert(e.message || "Erro ao eliminar tarefa."); }
  };

  useEffect(() => {
    if (!task) return;
    (async () => {
      try {
        const [c, w] = await Promise.all([
          base44.entities.Comment.filter({ task_id: task.id }, "created_date", 200),
          base44.entities.WorkLog.filter({ task_id: task.id }, "-log_date", 200),
        ]);
        setComments(c); setWorklogs(w);
      } catch {}
    })();
  }, [task?.id]);

  if (!task) return null;
  const assignee = users.find((u) => u.id === task.assigned_to);
  const sem = SEMAPHORE_META[trafficLight(task)];

  const addComment = async () => {
    if (!newComment.trim()) return;
    const c = await base44.entities.Comment.create({ task_id: task.id, user_id: currentUser.id, content: newComment });
    setComments((x) => [...x, c]); setNewComment("");
  };

  const addWorklog = async () => {
    const h = Number(wlHours);
    if (!h || h <= 0 || h > 24) { alert("Horas entre 0.25 e 24."); return; }
    if (wlDesc.trim().length < 10) { alert("Descrição mínima 10 caracteres."); return; }
    const w = await base44.entities.WorkLog.create({
      user_id: currentUser.id, task_id: task.id, project_id: task.project_id,
      hours_spent: h, log_date: new Date().toISOString().slice(0, 10), period_type: "DAILY",
      description: wlDesc, status: "SUBMITTED",
    });
    setWorklogs((x) => [w, ...x]); setWlHours(""); setWlDesc("");
    onChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg h-full bg-card border-l border-border overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{task.reference}</span>
            <Semaphore task={task} />
          </div>
          <div className="flex items-center gap-1">
            {canManage && (
              <>
                <button onClick={() => setShowEdit(true)} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Editar"><Pencil className="w-4 h-4" /></button>
                <button onClick={handleDelete} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h2 className="text-xl font-semibold leading-snug">{task.title}</h2>
            {task.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{task.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Responsável" value={assignee ? <div className="flex items-center gap-2"><Avatar name={assignee.full_name} size={24} />{assignee.full_name}</div> : "—"} />
            <Info label="Etapa" value={<span>{STAGE_LABELS[task.stage]}</span>} />
            <Info label="Prioridade" value={<PriorityBadge priority={task.priority} />} />
            <Info label="Tipo" value={<TaskTypeBadge type={task.task_type} />} />
            <Info label="Prazo" value={fmtDate(task.due_date)} />
            <Info label="Semáforo" value={<span style={{ color: sem.color }}>{sem.label}</span>} />
            <Info label="Duração" value={`${task.duration_days} dias`} />
            <Info label="Horas estim." value={`${task.estimated_hours || task.duration_days * 8}h`} />
          </div>

          <div className="flex gap-2 border-b border-border">
            <TabBtn active={tab === "comments"} onClick={() => setTab("comments")}><MessageSquare className="w-4 h-4" /> Comentários ({comments.length})</TabBtn>
            <TabBtn active={tab === "worklogs"} onClick={() => setTab("worklogs")}><Clock className="w-4 h-4" /> Horas ({worklogs.length})</TabBtn>
          </div>

          {tab === "comments" ? (
            <div className="space-y-3">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((c) => {
                  const u = users.find((x) => x.id === c.user_id);
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar name={u?.full_name} size={30} />
                      <div className="min-w-0">
                        <div className="text-xs"><span className="font-medium">{u?.full_name}</span> <span className="text-muted-foreground">· {relativeTime(c.created_date)}</span></div>
                        <div className="text-sm mt-0.5">{c.content}</div>
                      </div>
                    </div>
                  );
                })}
                {!comments.length && <EmptyState title="Sem comentários" />}
              </div>
              <div className="flex gap-2">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Escrever comentário…" className="flex-1 h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm" />
                <button onClick={addComment} className="px-3 rounded-lg bg-primary text-primary-foreground"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="acura-card p-3 space-y-2">
                <div className="text-sm font-medium">Registar progresso</div>
                <div className="flex gap-2">
                  <input type="number" step="0.25" min="0.25" max="24" value={wlHours} onChange={(e) => setWlHours(e.target.value)} placeholder="Horas" className="w-24 h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm" />
                  <input value={wlDesc} onChange={(e) => setWlDesc(e.target.value)} placeholder="Descrição (min 10 chars)" className="flex-1 h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm" />
                  <button onClick={addWorklog} className="px-3 rounded-lg bg-accent text-background text-sm font-medium">Registar</button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {worklogs.map((w) => {
                  const u = users.find((x) => x.id === w.user_id);
                  return (
                    <div key={w.id} className="acura-card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Avatar name={u?.full_name} size={24} /><span className="text-sm font-medium">{u?.full_name}</span></div>
                        <WorklogStatusBadge status={w.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{w.hours_spent}h · {fmtDate(w.log_date)}</div>
                      <div className="text-sm mt-1">{w.description}</div>
                    </div>
                  );
                })}
                {!worklogs.length && <EmptyState title="Sem horas registadas" />}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Editar Tarefa</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <TaskForm projectId={task.project_id} members={members || []} users={users} currentUser={currentUser} initial={task} onCancel={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onChanged?.(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}