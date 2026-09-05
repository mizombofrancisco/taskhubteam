import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, ListTodo, Users, BarChart3,
  MessageSquare, Bell, Settings,
  Menu, X, LogOut, ChevronDown, CalendarDays, Building2, Timer, Activity, Gauge, Receipt, KanbanSquare, LayoutTemplate, BriefcaseBusiness, Lightbulb,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import Brand from "@/components/Brand";
import { ROLE_LABELS, PRESENCE_META, initials, normalizeRole } from "@/lib/acura";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// Navegação unificada — filtrada pelas permissões de cada perfil
const NAV = [
  { section: "Geral", items: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", feature: "dashboard" },
    { to: "/my-workspace", icon: LayoutDashboard, label: "My Workspace", feature: "myWorkspace" },
  ]},
  { section: "Projetos", items: [
    { to: "/projects", icon: FolderKanban, label: "Projetos", feature: "projects" },
    { to: "/propostas", icon: Lightbulb, label: "Propostas", feature: "propostas" },
    { to: "/templates", icon: LayoutTemplate, label: "Templates", feature: "templates" },
    { to: "/quadros", icon: KanbanSquare, label: "Quadros", feature: "quadros" },
    { to: "/clients", icon: Building2, label: "Clientes", feature: "clients" },
    { to: "/project-calendar", icon: CalendarDays, label: "Calendário", feature: "projectCalendar" },
  ]},
  { section: "Trabalho", items: [
    { to: "/my-tasks", icon: ListTodo, label: "Tarefas", feature: "myTasks" },
    { to: "/registo-horas", icon: Timer, label: "Registo de Horas", feature: "registoHoras" },
  ]},
  { section: "Análise", items: [
    { to: "/reports", icon: BarChart3, label: "Relatórios", feature: "reports" },
    { to: "/activity-feed", icon: Activity, label: "Atividade", feature: "activityFeed" },
    { to: "/team-performance", icon: Gauge, label: "Performance", feature: "teamPerformance" },
    { to: "/billing-management", icon: Receipt, label: "Faturação", feature: "billingManagement" },
  ]},
  { section: "Administração", items: [
    { to: "/colaboradores", icon: Users, label: "Colaboradores", feature: "colaboradores" },
    { to: "/recursos-humanos", icon: BriefcaseBusiness, label: "Recursos Humanos", feature: "recursosHumanos" },
    { to: "/comunicacao", icon: MessageSquare, label: "Comunicação", feature: "comunicacao" },
  ]},
  { section: "Conta", items: [
    { to: "/account-settings", icon: Settings, label: "Definições", feature: "accountSettings" },
  ]},
];

function navForRole(user) {
  return NAV
    .map((sec) => ({ ...sec, items: sec.items.filter((i) => can(user, i.feature, "view")) }))
    .filter((sec) => sec.items.length);
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = normalizeRole(user?.role);
  const sections = navForRole(user);
  const presence = PRESENCE_META[user?.status] || PRESENCE_META.OFFLINE;

  const [openSections, setOpenSections] = useState(() => new Set(sections.map((s) => s.section)));
  const toggleSection = (name) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleLogout = async () => {
    try { await base44.auth.logout(); } catch {}
    logout(false);
    window.location.href = "/login";
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed z-40 inset-y-0 left-0 w-[260px] flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <Brand size={30} withWordmark />
          <button className="lg:hidden text-sidebar-foreground/70" onClick={onClose} aria-label="Fechar menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((sec) => {
            const isOpen = openSections.has(sec.section);
            return (
              <div key={sec.section} className="mb-1.5">
                <button
                  onClick={() => toggleSection(sec.section)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-colors"
                >
                  <span>{sec.section}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-1 mt-1">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-primary"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            )
                          }
                        >
                          <Icon className="w-[18px] h-[18px] shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors text-left"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full acura-gradient flex items-center justify-center text-white font-semibold text-sm">
                {initials(user?.full_name)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar-background" style={{ background: presence.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.full_name || "Utilizador"}</div>
              <div className="text-xs text-sidebar-foreground/55 truncate">{ROLE_LABELS[role]}</div>
            </div>
            <Settings className="w-4 h-4 text-sidebar-foreground/40" />
          </button>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/65 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminar sessão
          </button>
        </div>
      </aside>
    </>
  );
}