import React, { useEffect, useMemo, useState } from "react";
import { Activity, Search, Filter } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, Loading, EmptyState, Avatar } from "@/components/ui/acura";
import { describeActivity, fmtDateTime, relativeTime } from "@/lib/acura";
import { loadUsers } from "@/lib/data";

const ENTITY_TYPES = ["PROJECT", "TASK", "TEAM_MEMBER", "WORKLOG", "CHANNEL", "CHANNEL_MESSAGE"];
const ENTITY_LABELS = {
  PROJECT: "Projeto", TASK: "Tarefa", TEAM_MEMBER: "Equipa", WORKLOG: "Horas", CHANNEL: "Canal", CHANNEL_MESSAGE: "Mensagem",
};

export default function ActivityFeed() {
  const [logs, setLogs] = useState(null);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    (async () => {
      const [l, u] = await Promise.all([
        base44.entities.ActivityLog.list("-created_date", 500),
        loadUsers().catch(() => []),
      ]);
      setLogs(l);
      setUsers(u);
    })();
  }, []);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    return (logs || []).filter((a) => {
      if (typeFilter !== "ALL" && a.entity_type !== typeFilter) return false;
      if (q) {
        const u = userMap.get(a.user_id);
        const text = `${describeActivity(a, users)} ${u?.full_name || ""}`.toLowerCase();
        if (!text.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, typeFilter, q, users, userMap]);

  // group by day
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((a) => {
      const key = new Date(a.created_date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  if (!logs) return <Loading />;

  return (
    <div>
      <PageHeader title="Centro de Atividades" subtitle="Histórico cronológico de todas as ações na plataforma" icon={Activity} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar atividade…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
            <option value="ALL">Todos os tipos</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{ENTITY_LABELS[t] || t}</option>)}
          </select>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Activity} title="Sem atividade" description="Ainda não foram registadas ações na plataforma." />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <SectionCard key={day} title={new Date(day).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}>
              <ol className="relative px-6 py-4">
                {items.map((a, i) => {
                  const u = userMap.get(a.user_id);
                  const isLast = i === items.length - 1;
                  return (
                    <li key={a.id} className="relative flex gap-3 pb-5">
                      {!isLast && <span className="absolute left-[17px] top-10 bottom-0 w-px bg-border" />}
                      <Avatar name={u?.full_name || "?"} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-semibold">{u?.full_name || "Sistema"}</span>{" "}
                          <span className="text-muted-foreground">{describeActivity(a, users)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-2">
                          <span>{fmtDateTime(a.created_date)}</span>
                          <span>·</span>
                          <span>{relativeTime(a.created_date)}</span>
                          {a.entity_type && <><span>·</span><span className="text-accent">{ENTITY_LABELS[a.entity_type] || a.entity_type}</span></>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}