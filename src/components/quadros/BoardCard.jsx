import React from "react";
import { Pencil, Trash2, CalendarClock } from "lucide-react";
import { Avatar, PriorityBadge } from "@/components/ui/acura";
import { fmtDate } from "@/lib/acura";

const PRIORITY_COLORS = { LOW: "#9AA3B5", MEDIUM: "#0BB4F5", HIGH: "#E5383B" };

export default function BoardCard({ item, users, draggableProps, dragHandleProps, onClick, onEdit, onDelete }) {
  const a = users.find((u) => u.id === item.assigned_to);
  const overdue = item.due_date && new Date(item.due_date) < new Date(new Date().toDateString()) && item.stage !== "DONE";
  return (
    <div
      ref={draggableProps?.innerRef}
      {...draggableProps?.draggableProps}
      {...dragHandleProps}
      onClick={onClick}
      className="acura-card p-3 cursor-pointer hover:acura-glow transition-shadow group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="w-1 h-10 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[item.priority] || "#9AA3B5" }} />
        <p className="text-sm font-medium leading-snug flex-1 min-w-0">{item.title}</p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1 rounded text-accent hover:bg-accent/10"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {item.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>}
      <div className="flex items-center justify-between mt-3">
        <PriorityBadge priority={item.priority} />
        <div className="flex items-center gap-2">
          {item.due_date && (
            <span className={`flex items-center gap-1 text-[11px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              <CalendarClock className="w-3 h-3" /> {fmtDate(item.due_date, { day: "2-digit", month: "short" })}
            </span>
          )}
          {a && <Avatar name={a.full_name} size={22} />}
        </div>
      </div>
    </div>
  );
}