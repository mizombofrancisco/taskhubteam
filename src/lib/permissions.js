// Níveis de acesso por perfil — matriz central de permissões
import { normalizeRole, homeRouteForRole } from "@/lib/acura";

// Perfis: ADMIN (Diretor Geral), PROJECT_MANAGER (Líder de Projeto),
// DEVELOPER / DESIGNER / TRAINER (Colaboradores)
const ALL = ["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "DESIGNER", "TRAINER"];
const MANAGERS = ["ADMIN", "PROJECT_MANAGER"];
const COLLABORATORS = ["DEVELOPER", "DESIGNER", "TRAINER"];

// Matriz de funcionalidades: roles com permissão de visualização e ações restritas
export const FEATURES = {
  dashboard:        { view: MANAGERS },
  myWorkspace:      { view: COLLABORATORS },
  projects:         { view: ALL, manage: MANAGERS },
  templates:        { view: MANAGERS, manage: MANAGERS },
  quadros:         { view: ALL, manage: MANAGERS },
  clients:         { view: MANAGERS, manage: MANAGERS },
  projectCalendar:  { view: ALL },
  myTasks:         { view: ALL },
  registoHoras:    { view: ALL, approve: MANAGERS },
  reports:         { view: MANAGERS },
  activityFeed:     { view: ALL },
  teamPerformance:  { view: MANAGERS },
  billingManagement:{ view: MANAGERS, manage: MANAGERS },
  colaboradores:   { view: ["ADMIN"], manage: ["ADMIN"] },
  recursosHumanos: { view: MANAGERS, manage: ["ADMIN"] },
  comunicacao:     { view: ALL },
  propostas:       { view: ALL },
  notifications:   { view: ALL },
  profile:         { view: ALL },
  accountSettings: { view: ALL },
};

// Mapa de rotas → funcionalidade (correspondência por prefixo)
const ROUTE_FEATURE = [
  { path: "/dashboard", feature: "dashboard" },
  { path: "/my-workspace", feature: "myWorkspace" },
  { path: "/projects", feature: "projects" },
  { path: "/templates", feature: "templates" },
  { path: "/quadros", feature: "quadros" },
  { path: "/clients", feature: "clients" },
  { path: "/project-calendar", feature: "projectCalendar" },
  { path: "/my-tasks", feature: "myTasks" },
  { path: "/registo-horas", feature: "registoHoras" },
  { path: "/reports", feature: "reports" },
  { path: "/activity-feed", feature: "activityFeed" },
  { path: "/team-performance", feature: "teamPerformance" },
  { path: "/billing-management", feature: "billingManagement" },
  { path: "/colaboradores", feature: "colaboradores" },
  { path: "/recursos-humanos", feature: "recursosHumanos" },
  { path: "/comunicacao", feature: "comunicacao" },
  { path: "/propostas", feature: "propostas" },
  { path: "/notifications", feature: "notifications" },
  { path: "/profile", feature: "profile" },
  { path: "/account-settings", feature: "accountSettings" },
];

function featureForRoute(pathname) {
  // correspondência por prefixo mais longo
  let best = null;
  for (const r of ROUTE_FEATURE) {
    if (pathname === r.path || pathname.startsWith(r.path + "/")) {
      if (!best || r.path.length > best.path.length) best = r;
    }
  }
  return best?.feature;
}

// Verificador principal: can(user, "projects", "manage")
export function can(user, feature, action = "view") {
  const role = normalizeRole(user?.role);
  const f = FEATURES[feature];
  if (!f) return false;
  const list = f[action];
  if (!list) return false;
  return list.includes(role);
}

// Acesso a uma rota (visualização)
export function canAccessRoute(user, pathname) {
  const feature = featureForRoute(pathname);
  if (!feature) return true; // rotas não mapeadas (ex: "/") são livres
  return can(user, feature, "view");
}

export { homeRouteForRole };