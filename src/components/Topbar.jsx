import React, { useState, useRef, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { Menu, Bell, Search, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { initials, ROLE_LABELS } from "@/lib/acura";

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-6 bg-background/80 backdrop-blur border-b border-border">
      <button className="lg:hidden text-foreground/70" onClick={onMenu} aria-label="Abrir menu">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Pesquisar projetos, tarefas, pessoas…"
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <NavLink to="/notifications" className="relative p-2 rounded-lg hover:bg-muted/60 text-foreground/70 ml-auto" aria-label="Notificações">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
      </NavLink>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-muted/60"
        >
          <div className="w-9 h-9 rounded-full acura-gradient flex items-center justify-center text-white font-semibold text-sm">
            {initials(user?.full_name)}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 acura-card shadow-xl py-1.5 text-sm">
            <div className="px-3 py-2.5 border-b border-border">
              <div className="font-medium truncate">{user?.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              <div className="text-xs text-accent mt-1">{ROLE_LABELS[user?.role]}</div>
            </div>
            <button onClick={() => { setMenuOpen(false); navigate("/profile"); }} className="w-full text-left px-3 py-2 hover:bg-muted/60">Perfil e preferências</button>
            <button onClick={() => { setMenuOpen(false); navigate("/notifications"); }} className="w-full text-left px-3 py-2 hover:bg-muted/60">Notificações</button>
          </div>
        )}
      </div>
    </header>
  );
}