import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, PlayCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { PageHeader, SectionCard, Loading, EmptyState } from "@/components/ui/acura";
import { isManager, fmtDate, PROJECT_STATUS_COLORS } from "@/lib/acura";
import { loadProjects, loadMyProjects, loadAllTasks, loadMyTasks } from "@/lib/data";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function toKey(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

export default function ProjectCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [projects, setProjects] = useState(null);
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    (async () => {
      const ps = isManager(user) ? await loadProjects() : await loadMyProjects(user.id);
      setProjects(ps);
      const ts = isManager(user) ? await loadAllTasks() : await loadMyTasks(user.id);
      setTasks(ts);
    })();
  }, [user]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    const add = (date, ev) => {
      if (!date) return;
      const k = toKey(new Date(date));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    };
    (projects || []).forEach((p) => {
      if (p.end_date) add(p.end_date, { type: "deadline", color: PROJECT_STATUS_COLORS[p.status] || "#E5383B", label: p.name, sub: p.code, projectId: p.id });
      if (p.start_date) add(p.start_date, { type: "project-start", color: "#0BB4F5", label: p.name, sub: p.code, projectId: p.id });
    });
    (tasks || []).forEach((t) => {
      if (t.start_date) add(t.start_date, { type: "task-start", color: "#0057D9", label: t.title, sub: t.reference, projectId: t.project_id });
      if (t.due_date) add(t.due_date, { type: "task-due", color: "#A855F7", label: t.title, sub: t.reference, projectId: t.project_id });
    });
    return map;
  }, [projects, tasks]);

  const weeks = useMemo(() => {
    const first = startOfMonth(cursor);
    const start = new Date(first);
    const dow = (first.getDay() + 6) % 7; // Monday=0
    start.setDate(first.getDate() - dow);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const all = [];
    eventsByDay.forEach((evs, k) => {
      const [y, m, d] = k.split("-").map(Number);
      const date = new Date(y, m, d);
      if (date >= today) evs.forEach((e) => all.push({ ...e, date }));
    });
    all.sort((a, b) => a.date - b.date);
    return all.slice(0, 8);
  }, [eventsByDay]);

  if (!projects || !tasks) return <Loading />;

  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Calendário de Projetos"
        subtitle="Prazos de projetos e datas de início das tarefas"
        icon={CalendarDays}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(startOfMonth(new Date()))} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/40">Hoje</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <SectionCard className="xl:col-span-3" action={
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-muted/40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium min-w-[140px] text-center">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
            <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-muted/40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        }>
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-2">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.map((d) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = isSameDay(d, today);
                const evs = eventsByDay.get(toKey(d)) || [];
                return (
                  <div
                    key={d.toISOString()}
                    className={`min-h-[92px] rounded-lg border p-1.5 ${inMonth ? "bg-card border-border" : "bg-muted/20 border-transparent"} ${isToday ? "ring-1 ring-accent" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${inMonth ? "text-foreground" : "text-muted-foreground/50"} ${isToday ? "text-accent" : ""}`}>{d.getDate()}</div>
                    <div className="space-y-1">
                      {evs.slice(0, 3).map((e, i) => (
                        <button
                          key={i}
                          onClick={() => navigate(`/projects/${e.projectId}`)}
                          className="w-full text-left flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] truncate hover:opacity-80"
                          style={{ background: `${e.color}22`, color: e.color }}
                          title={`${e.label}${e.sub ? ` · ${e.sub}` : ""}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                          <span className="truncate">{e.label}</span>
                        </button>
                      ))}
                      {evs.length > 3 && <div className="text-[10px] text-muted-foreground px-1.5">+{evs.length - 3} mais</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Legenda">
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "#E5383B" }} /><span>Prazo do projeto</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "#0BB4F5" }} /><span>Início do projeto</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "#0057D9" }} /><span>Início de tarefa</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "#A855F7" }} /><span>Prazo de tarefa</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Próximos eventos">
            {upcoming.length === 0 ? (
              <div className="p-5"><EmptyState icon={AlertCircle} title="Sem eventos" description="Não há prazos próximos." /></div>
            ) : (
              <div className="p-2 space-y-1">
                {upcoming.map((e, i) => (
                  <button key={i} onClick={() => navigate(`/projects/${e.projectId}`)} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${e.color}1a`, color: e.color }}>
                      {e.type === "deadline" ? <Flag className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{e.label}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(e.date)} {e.sub ? `· ${e.sub}` : ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}