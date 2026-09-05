// Acuratech Hub — business logic & presentation helpers

export const STAGES = ["BACKLOG", "TO_DO", "IN_PROGRESS", "CODE_REVIEW", "DONE"];

export const STAGE_LABELS = {
  BACKLOG: "Backlog",
  TO_DO: "A Fazer",
  IN_PROGRESS: "Em Curso",
  CODE_REVIEW: "Revisão",
  DONE: "Concluído",
};

export const STAGE_COLORS = {
  BACKLOG: "#6B7280",
  TO_DO: "#6366F1",
  IN_PROGRESS: "#0057D9",
  CODE_REVIEW: "#A855F7",
  DONE: "#00A65A",
};

export const PRIORITY_LABELS = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const PRIORITY_COLORS = {
  LOW: "#6B7280",
  MEDIUM: "#0057D9",
  HIGH: "#F5A623",
  CRITICAL: "#E5383B",
};

export const TASK_TYPE_META = {
  DEV: { label: "Dev", icon: "</>", color: "#0057D9", role: "DEVELOPER" },
  DESIGN: { label: "Design", icon: "🎨", color: "#A855F7", role: "DESIGNER" },
  TRAINING: { label: "Formação", icon: "🎓", color: "#0BB4F5", role: "TRAINER" },
  BUGFIX: { label: "Bugfix", icon: "🐞", color: "#E5383B", role: "DEVELOPER" },
};

export const PROJECT_STATUS_LABELS = {
  PLANNING: "Planeamento",
  ACTIVE: "Ativo",
  ON_HOLD: "Em Pausa",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const PROJECT_STATUS_COLORS = {
  PLANNING: "#9AA3B5",
  ACTIVE: "#00A65A",
  ON_HOLD: "#F5A623",
  COMPLETED: "#0BB4F5",
  CANCELLED: "#E5383B",
};

export const WORKLOG_STATUS_LABELS = {
  DRAFT: "Rascunho",
  SUBMITTED: "Submetido",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const WORKLOG_STATUS_COLORS = {
  DRAFT: "#9AA3B5",
  SUBMITTED: "#F5A623",
  APPROVED: "#00A65A",
  REJECTED: "#E5383B",
};

export const ROLE_LABELS = {
  ADMIN: "Diretor Geral",
  PROJECT_MANAGER: "Líder de Projeto",
  DEVELOPER: "Desenvolvedor",
  DESIGNER: "Designer",
  TRAINER: "Formador",
};

export const PRESENCE_META = {
  ONLINE: { color: "#00A65A", label: "Online" },
  BUSY: { color: "#E5383B", label: "Ocupado" },
  OFFLINE: { color: "#9AA3B5", label: "Offline" },
};

// Semáforo de prazo (RN-01)
export function trafficLight(task, today = new Date()) {
  if (task.stage === "DONE") return "done";
  if (!task.due_date) return "unknown";
  const due = new Date(task.due_date);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((d - t) / 86400000);
  if (diff < 0) return "red";
  if (diff <= 3) return "yellow";
  return "green";
}

export const SEMAPHORE_META = {
  green: { color: "#00A65A", label: "No prazo" },
  yellow: { color: "#F5A623", label: "A vencer" },
  red: { color: "#E5383B", label: "Atrasada" },
  done: { color: "#9AA3B5", label: "Concluída" },
  unknown: { color: "#6B7280", label: "Sem prazo" },
};

export function semaphoreOrder(task) {
  const order = { red: 0, yellow: 1, unknown: 2, green: 3, done: 4 };
  return order[trafficLight(task)] ?? 5;
}

export function priorityOrder(task) {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return order[task.priority] ?? 4;
}

export function projectProgress(tasks) {
  if (!tasks?.length) return 0;
  const done = tasks.filter((t) => t.stage === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export function projectAtRisk(project, tasks) {
  if (project.status === "COMPLETED" || project.status === "CANCELLED") return false;
  if (project.end_date && new Date(project.end_date) < new Date()) return true;
  return (tasks || []).some((t) => trafficLight(t) === "red");
}

export function estimatedHours(task) {
  if (task.estimated_hours != null) return task.estimated_hours;
  return (task.duration_days || 0) * 8;
}

export function slugify(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function fmtDate(d, opts) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT", opts || { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function fmtTime(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function relativeTime(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `há ${days}d`;
  return fmtDate(d);
}

export function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Hoje";
  if (same(d, yesterday)) return "Ontem";
  return fmtDate(dateStr, { day: "numeric", month: "long", year: "numeric" });
}

export function normalizeRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "USER") return "DEVELOPER";
  if (["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "DESIGNER", "TRAINER"].includes(r)) return r;
  return "DEVELOPER";
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === "ADMIN";
}

export function isManager(user) {
  const r = normalizeRole(user?.role);
  return r === "ADMIN" || r === "PROJECT_MANAGER";
}

export function isCollaborator(user) {
  const r = normalizeRole(user?.role);
  return r === "DEVELOPER" || r === "DESIGNER" || r === "TRAINER";
}

export const ACTIVITY_ACTION_LABELS = {
  CREATED: "criou",
  UPDATED: "atualizou",
  DELETED: "removeu",
  ASSIGNED: "adicionou",
  MOVED: "moveu",
  COMPLETED: "concluiu",
  APPROVED: "aprovou",
  REJECTED: "rejeitou",
  SUBMITTED: "submeteu",
};

export function describeActivity(a, users = []) {
  const c = a.changes || {};
  if (a.action === "CREATED" && a.entity_type === "PROJECT") {
    let s = `Criou o projeto "${c.name || "—"}"`;
    if (c.channel) s += ` · canal #${c.channel}`;
    return s;
  }
  if (a.action === "ASSIGNED" && a.entity_type === "TEAM_MEMBER") {
    const u = users.find((x) => x.id === c.user_id);
    return `Adicionou ${u?.full_name || "um membro"} à equipa`;
  }
  const verb = ACTIVITY_ACTION_LABELS[a.action] || String(a.action || "").toLowerCase();
  const entity = (a.entity_type || "").toLowerCase().replace(/_/g, " ");
  const parts = Object.entries(c).map(([k, v]) => `${k}: ${v}`).join(", ");
  return `${verb} ${entity}${parts ? ` (${parts})` : ""}`;
}

export function homeRouteForRole(role) {
  const r = normalizeRole(role);
  if (r === "ADMIN" || r === "PROJECT_MANAGER") return "/dashboard";
  return "/my-workspace";
}