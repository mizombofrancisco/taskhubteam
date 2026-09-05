import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search, FolderKanban, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { PageHeader, SectionCard, StatCard, Loading, EmptyState, ProjectStatusBadge } from "@/components/ui/acura";
import { isManager, fmtDate, PROJECT_STATUS_LABELS } from "@/lib/acura";
import { loadProjects, loadMyProjects } from "@/lib/data";

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [query, setQuery] = useState("");
  const [openClient, setOpenClient] = useState(null);

  useEffect(() => {
    (async () => {
      const ps = isManager(user) ? await loadProjects() : await loadMyProjects(user.id);
      setProjects(ps);
    })();
  }, [user]);

  const clients = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      const name = (p.client_name || "").trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, projects: [], totalHours: 0, active: 0 });
      const c = map.get(name);
      c.projects.push(p);
      c.totalHours += p.estimated_hours || 0;
      if (p.status === "ACTIVE") c.active += 1;
    });
    let list = Array.from(map.values());
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, query]);

  if (!projects) return <Loading />;

  const totalClients = clients.length;
  const totalProjects = clients.reduce((s, c) => s + c.projects.length, 0);
  const totalHours = clients.reduce((s, c) => s + c.totalHours, 0);

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Clientes vinculados aos seus projetos" icon={Building2} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Clientes" value={totalClients} icon={Building2} accent="#0057D9" />
        <StatCard label="Projetos" value={totalProjects} icon={FolderKanban} accent="#0BB4F5" />
        <StatCard label="Horas estimadas" value={totalHours} icon={Clock} accent="#A855F7" />
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar cliente…"
          className="w-full h-11 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm"
        />
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={Building2} title="Sem clientes" description="Ainda não há projetos com cliente associado." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((c) => {
            const open = openClient === c.name;
            return (
              <SectionCard key={c.name} title={c.name} action={
                <span className="text-xs text-muted-foreground">{c.projects.length} projeto{c.projects.length !== 1 ? "s" : ""}</span>
              }>
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl acura-gradient flex items-center justify-center text-white font-semibold text-lg shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Projetos ativos</div>
                        <div className="font-semibold">{c.active}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Horas estimadas</div>
                        <div className="font-semibold">{c.totalHours}h</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenClient(open ? null : c.name)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-sm transition-colors"
                  >
                    <span>{open ? "Ocultar projetos" : "Ver projetos"}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} />
                  </button>
                  {open && (
                    <div className="mt-2 space-y-1.5">
                      {c.projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{p.code} · {fmtDate(p.start_date)} → {fmtDate(p.end_date)}</div>
                          </div>
                          <ProjectStatusBadge status={p.status} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}