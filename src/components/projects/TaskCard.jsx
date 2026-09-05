import React from "react";
import { MessageSquare, Paperclip, CheckSquare } from "lucide-react";
import { Semaphore, PriorityBadge, TaskTypeBadge, Avatar } from "@/components/ui/acura";
import { fmtDate } from "@/lib/acura";

export default function TaskCard({ task, users, onClick, draggableProps, dragHandleProps, projectCode }) {
  const assignee = users.find((u) => u.id === task.assigned_to);
  return (
    <div
      ref={draggableProps?.innerRef}
      {...draggableProps?.draggableProps}
      {...dragHandleProps}
      onClick={onClick}
      className="acura-card p-3 cursor-pointer hover:acura-glow transition-shadow bg-card"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono text-muted-foreground">{task.reference}</span>
          {projectCode && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate">{projectCode}</span>}
        </div>
        <Semaphore task={task} size={12} />
      </div>
      <div className="text-sm font-medium leading-snug mb-2 line-clamp-2">{task.title}</div>
      <div className="flex items-center gap-1.5 mb-2">
        <TaskTypeBadge type={task.task_type} />
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assignee && <Avatar name={assignee.full_name} size={22} />}
          <span className="text-[11px] text-muted-foreground">{fmtDate(task.due_date, { day: "2-digit", month: "short" })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex items-center gap-0.5 text-[11px]"><MessageSquare className="w-3 h-3" /></span>
          <span className="flex items-center gap-0.5 text-[11px]"><Paperclip className="w-3 h-3" /></span>
        </div>
      </div>
    </div>
  );
}