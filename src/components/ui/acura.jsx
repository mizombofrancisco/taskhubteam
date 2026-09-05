import React from "react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABELS, PRIORITY_COLORS, TASK_TYPE_META, SEMAPHORE_META,
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, WORKLOG_STATUS_LABELS, WORKLOG_STATUS_COLORS,
  trafficLight, initials,
} from "@/lib/acura";

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-11 h-11 rounded-xl acura-gradient flex items-center justify-center shrink-0">
            <Icon className="w-5.5 h-5.5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-0.5 text-sm sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "#0BB4F5", hint, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn("acura-card p-5 flex items-center gap-4 transition-shadow", onClick && "cursor-pointer hover:acura-glow")}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1a`, color: accent }}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-display font-bold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, color, className }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold", className)}
      style={{ background: `${color}1f`, color }}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return <Badge color={PRIORITY_COLORS[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function TaskTypeBadge({ type }) {
  const m = TASK_TYPE_META[type];
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: `${m.color}1f`, color: m.color }}>
      <span className="text-[10px] leading-none">{m.icon}</span> {m.label}
    </span>
  );
}

export function StatusBadge({ status, map, labels }) {
  return <Badge color={map[status]}>{labels[status]}</Badge>;
}

export function ProjectStatusBadge({ status }) {
  return <Badge color={PROJECT_STATUS_COLORS[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}

export function WorklogStatusBadge({ status }) {
  return <Badge color={WORKLOG_STATUS_COLORS[status]}>{WORKLOG_STATUS_LABELS[status]}</Badge>;
}

export function Semaphore({ task, size = 14 }) {
  const s = trafficLight(task);
  const m = SEMAPHORE_META[s] || SEMAPHORE_META.unknown;
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: m.color, boxShadow: `0 0 0 3px ${m.color}33` }}
      title={m.label}
      aria-label={m.label}
    />
  );
}

export function ProgressBar({ value, className, color }) {
  return (
    <div className={cn("h-2 rounded-full bg-muted overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || "linear-gradient(90deg,#0033A0,#0BB4F5)" }}
      />
    </div>
  );
}

export function Avatar({ name, size = 36, src, status }) {
  const presenceColors = { ONLINE: "#00A65A", BUSY: "#E5383B", OFFLINE: "#9AA3B5" };
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="rounded-full object-cover w-full h-full" />
      ) : (
        <div className="rounded-full acura-gradient flex items-center justify-center text-white font-semibold w-full h-full" style={{ fontSize: size * 0.38 }}>
          {initials(name)}
        </div>
      )}
      {status && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card"
          style={{ width: size * 0.32, height: size * 0.32, background: presenceColors[status] || "#9AA3B5" }}
        />
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionCard({ title, action, children, className }) {
  return (
    <div className={cn("acura-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Loading({ label = "A carregar…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="w-8 h-8 border-2 border-muted border-t-accent rounded-full animate-spin mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  );
}