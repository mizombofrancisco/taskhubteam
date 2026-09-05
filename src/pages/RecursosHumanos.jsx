import React, { useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Clock, Plus, Pencil, Trash2, Check, X, Users, Plane, ClipboardCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadUsers, logActivity } from "@/lib/data";
import { PageHeader, SectionCard, EmptyState, Loading, Avatar, Badge, StatCard } from "@/components/ui/acura";
import { useSelection, BulkBar, RowCheckbox } from "@/components/ui/BulkActions";
import { fmtDate, fmtDateTime, relativeTime, isAdmin, isManager } from "@/lib/acura";
import EmployeeHRForm from "@/components/rh/EmployeeHRForm";
import LeaveRequestForm from "@/components/rh/LeaveRequestForm";
import AttendanceForm from "@/components/rh/AttendanceForm";

const HR_STATUS = {
  ACTIVE: { color: "#00A65A", label: "Ativo" },
  PROBATION: { color: "#F5A623", label: "Em experiência" },
  ON_LEAVE: { color: "#0BB4F5", label: "Licença" },
  SUSPENDED: { color: "#E5383B", label: "Suspenso" },
  TERMINATED: { color: "#9AA3B5", label: "Desligado" },
};
const LEAVE_STATUS = {
  PENDING: { color: "#F5A623", label: "Pendente" },
  APPROVED: { color: "#00A65A", label: "Aprovado" },
  REJECTED: { color: "#E5383B", label: "Rejeitado" },
  CANCELLED: { color: "#9AA3B5", label: "Cancelado" },
};
const LEAVE_TYPE = {
  VACATION: "Férias", SICK: "Doença", PERSONAL: "Pessoal", MATERNITY: "Maternidade",
  PATERNITY: "Paternidade", UNPAID: "Sem vencimento", BEREAVEMENT: "Falecimento",
  STUDY: "Estudo", OTHER: "Outro",
};
const ATT_STATUS = {
  PRESENT: { color: "#00A65A", label: "Presente" },
  LATE: { color: "#F5A623", label: "Atrasado" },
  HALF_DAY: { color: "#0BB4F5", label: "Meio dia" },
  REMOTE: { color: "#A855F7", label: "Remoto" },
  ABSENT: { color: "#E5383B", label: "Ausente" },
  HOLIDAY: { color: "#9AA3B5", label: "Feriado" },
  MISSING: { color: "#F5A623", label: "Sem registo" },
};

const TABS = [
  { key: "dashboard", label: "Resumo", icon: BriefcaseBusiness },
  { key: "perfis", label: "Perfis RH", icon: Users },
  { key: "ferias", label: "Férias & Licenças", icon: Plane },
  { key: "presencas", label: "Presenças", icon: Clock },
];

export default function RecursosHumanos() {
  const { user } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [users, setUsers] = useState(null);
  const [hrRecords, setHrRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState("");
  const sel = useSelection();
  const canManage = isAdmin(user) || isManager(user);

  const reload = async () => {
    const [u, hr, lv, att] = await Promise.all([
      loadUsers(),
      base44.entities.EmployeeHR.list("-created_date", 500).catch(() => []),
      base44.entities.LeaveRequest.list("-created_date", 500).catch(() => []),
      base44.entities.AttendanceRecord.list("-created_date", 500).catch(() => []),
    ]);
    setUsers(u);
    setHrRecords(hr);
    setLeaves(lv);
    setAttendance(att);
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line

  if (!users) return <Loading />;

  const userById = (id) => users.find((u) => u.id === id);
  const today = new Date().toISOString().slice(0, 10);

  // Stats
  const activeEmployees = hrRecords.filter((r) => r.employment_status === "ACTIVE").length;
  const onLeaveToday = leaves.filter((l) => l.status === "APPROVED" && l.start_date <= today && l.end_date >= today).length;
  const pendingLeaves = leaves.filter((l) => l.status === "PENDING").length;
  const absentToday = attendance.filter((a) => a.date === today && (a.status === "ABSENT" || a.status === "MISSING")).length;

  // Resumo semanal: segunda a domingo da semana atual
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const weekAttendance = attendance.filter((a) => a.date >= weekStartStr && a.date <= weekEndStr);
  const weekHoursByUser = users.map((u) => {
    const hrs = weekAttendance.filter((a) => a.user_id === u.id).reduce((s, a) => s + (a.total_hours || 0), 0);
    const days = weekAttendance.filter((a) => a.user_id === u.id).length;
    return { user: u, hours: hrs, days };
  }).filter((x) => x.hours > 0 || x.days > 0).sort((a, b) => b.hours - a.hours);
  const weekTotalHours = weekHoursByUser.reduce((s, x) => s + x.hours, 0);
  const leaveBreakdown = {
    PENDING: leaves.filter((l) => l.status === "PENDING").length,
    APPROVED: leaves.filter((l) => l.status === "APPROVED").length,
    REJECTED: leaves.filter((l) => l.status === "REJECTED").length,
    CANCELLED: leaves.filter((l) => l.status === "CANCELLED").length,
  };

  const filteredHr = hrRecords.filter((r) => {
    const u = userById(r.user_id);
    const name = u?.full_name || "";
    return !q || name.toLowerCase().includes(q.toLowerCase()) || (r.department || "").toLowerCase().includes(q.toLowerCase()) || (r.position || "").toLowerCase().includes(q.toLowerCase());
  });

  const deleteHr = async (rec) => {
    if (!confirm(`Eliminar o perfil RH de ${userById(rec.user_id)?.full_name}?`)) return;
    await base44.entities.EmployeeHR.delete(rec.id);
    await logActivity({ entity_type: "EMPLOYEE_HR", entity_id: rec.id, action: "DELETED" });
    reload();
  };

  const reviewLeave = async (rec, status) => {
    await base44.entities.LeaveRequest.update(rec.id, {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    });
    // se aprovado e férias, incrementar dias gozados no perfil RH
    if (status === "APPROVED" && rec.type === "VACATION") {
      const hr = hrRecords.find((h) => h.user_id === rec.user_id);
      if (hr) {
        await base44.entities.EmployeeHR.update(hr.id, {
          vacation_days_used: (hr.vacation_days_used || 0) + (rec.days || 0),
        });
      }
    }
    await logActivity({ entity_type: "LEAVE_REQUEST", entity_id: rec.id, action: status, changes: { reviewed_by: user.id } });
    reload();
  };

  const deleteLeave = async (rec) => {
    if (!confirm("Eliminar este pedido de licença?")) return;
    await base44.entities.LeaveRequest.delete(rec.id);
    reload();
  };

  const deleteAttendance = async (rec) => {
    if (!confirm("Eliminar este registo de presença?")) return;
    await base44.entities.AttendanceRecord.delete(rec.id);
    reload();
  };

  const bulkDeleteLeaves = async () => {
    const ids = Array.from(sel.selected);
    if (!ids.length || !confirm(`Eliminar ${ids.length} pedido(s)?`)) return;
    await Promise.all(ids.map((id) => base44.entities.LeaveRequest.delete(id).catch(() => {})));
    sel.clear();
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Recursos Humanos"
        subtitle="Gestão de colaboradores: admissão, horários, férias e presenças"
        icon={BriefcaseBusiness}
        actions={canManage && (
          <button onClick={() => setModal({ type: "hr" })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo Perfil RH
          </button>
        )}
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border mb-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Colaboradores ativos" value={activeEmployees} icon={Users} accent="#00A65A" />
            <StatCard label="Presentes hoje" value={attendance.filter((a) => a.date === today && ["PRESENT", "LATE", "HALF_DAY", "REMOTE"].includes(a.status)).length} icon={ClipboardCheck} accent="#00A65A" />
            <StatCard label="Em licença hoje" value={onLeaveToday} icon={Plane} accent="#0BB4F5" />
            <StatCard label="Pedidos pendentes" value={pendingLeaves} icon={Clock} accent="#F5A623" onClick={() => setTab("ferias")} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Presentes hoje */}
            <SectionCard title="Colaboradores presentes hoje" action={<span className="text-xs text-muted-foreground">{fmtDate(today)}</span>}>
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {attendance.filter((a) => a.date === today && ["PRESENT", "LATE", "HALF_DAY", "REMOTE"].includes(a.status)).map((a) => {
                  const u = userById(a.user_id);
                  const meta = ATT_STATUS[a.status] || ATT_STATUS.PRESENT;
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                      <Avatar name={u?.full_name} size={36} status={u?.status} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{u?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.check_in || "—"} → {a.check_out || "—"} · {a.total_hours || 0}h</div>
                      </div>
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </div>
                  );
                })}
                {!attendance.some((a) => a.date === today && ["PRESENT", "LATE", "HALF_DAY", "REMOTE"].includes(a.status)) && <EmptyState title="Ninguém presente hoje" description="Os registos de presença aparecerão aqui." />}
              </div>
            </SectionCard>

            {/* Pedidos pendentes */}
            <SectionCard title="Pedidos de férias pendentes" action={pendingLeaves > 0 && <Badge color="#F5A623">{pendingLeaves} por aprovar</Badge>}>
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {leaves.filter((l) => l.status === "PENDING").sort((a, b) => a.start_date.localeCompare(b.start_date)).map((l) => {
                  const u = userById(l.user_id);
                  return (
                    <div key={l.id} className="px-5 py-3 flex items-center gap-3">
                      <Avatar name={u?.full_name} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{u?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{LEAVE_TYPE[l.type] || l.type} · {fmtDate(l.start_date)} → {fmtDate(l.end_date)} ({l.days}d{l.half_day ? " ½" : ""})</div>
                      </div>
                      {canManage ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => reviewLeave(l, "APPROVED")} className="p-1.5 rounded-lg text-success hover:bg-success/10" title="Aprovar"><Check className="w-4 h-4" /></button>
                          <button onClick={() => reviewLeave(l, "REJECTED")} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Rejeitar"><X className="w-4 h-4" /></button>
                        </div>
                      ) : <Badge color="#F5A623">Pendente</Badge>}
                    </div>
                  );
                })}
                {!leaves.some((l) => l.status === "PENDING") && <EmptyState title="Sem pedidos pendentes" description="Todos os pedidos foram processados." />}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Horas trabalhadas (semana)" className="lg:col-span-2" action={<span className="text-xs text-muted-foreground">{fmtDate(weekStartStr)} → {fmtDate(weekEndStr)}</span>}>
              <div className="px-5 py-4 border-b border-border flex items-center gap-6">
                <div>
                  <div className="text-3xl font-display font-bold">{weekTotalHours.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">Total da equipa</div>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <div className="text-2xl font-display font-bold">{weekHoursByUser.length}</div>
                  <div className="text-xs text-muted-foreground">Colaboradores com registo</div>
                </div>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {weekHoursByUser.map((x) => (
                  <div key={x.user.id} className="px-5 py-2.5 flex items-center gap-3">
                    <Avatar name={x.user.full_name} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{x.user.full_name}</div>
                      <div className="text-xs text-muted-foreground">{x.days} dia(s) registado(s)</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{x.hours.toFixed(1)}h</div>
                  </div>
                ))}
                {!weekHoursByUser.length && <EmptyState title="Sem registos esta semana" />}
              </div>
            </SectionCard>

            <SectionCard title="Estado dos pedidos de férias">
              <div className="p-5 space-y-3">
                {[
                  { key: "PENDING", label: "Pendentes", color: "#F5A623", icon: Clock },
                  { key: "APPROVED", label: "Aprovados", color: "#00A65A", icon: Check },
                  { key: "REJECTED", label: "Rejeitados", color: "#E5383B", icon: X },
                  { key: "CANCELLED", label: "Cancelados", color: "#9AA3B5", icon: Trash2 },
                ].map((row) => {
                  const count = leaveBreakdown[row.key];
                  const pct = leaves.length ? Math.round((count / leaves.length) * 100) : 0;
                  const Icon = row.icon;
                  return (
                    <div key={row.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-2"><Icon className="w-3.5 h-3.5" style={{ color: row.color }} /> {row.label}</span>
                        <span className="text-sm font-semibold tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: row.color }} />
                      </div>
                    </div>
                  );
                })}
                {!leaves.length && <EmptyState title="Sem pedidos de férias" />}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Próximas férias / licenças aprovadas">
            <div className="divide-y divide-border">
              {leaves.filter((l) => l.status === "APPROVED" && l.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 6).map((l) => {
                const u = userById(l.user_id);
                return (
                  <div key={l.id} className="px-5 py-3 flex items-center gap-3">
                    <Avatar name={u?.full_name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{u?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{LEAVE_TYPE[l.type]} · {fmtDate(l.start_date)} → {fmtDate(l.end_date)} ({l.days}d)</div>
                    </div>
                  </div>
                );
              })}
              {!leaves.some((l) => l.status === "APPROVED" && l.end_date >= today) && <EmptyState title="Sem licenças agendadas" />}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "perfis" && (
        <div>
          <div className="relative mb-5 max-w-md">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar colaborador, departamento ou cargo…" className="w-full h-10 px-4 rounded-lg bg-muted/40 border border-border text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHr.map((r) => {
              const u = userById(r.user_id);
              const meta = HR_STATUS[r.employment_status] || HR_STATUS.ACTIVE;
              const vacLeft = (r.vacation_days_entitlement || 0) - (r.vacation_days_used || 0);
              return (
                <div key={r.id} className="acura-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={u?.full_name} size={44} status={u?.status} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{u?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.position || "—"}</div>
                      </div>
                    </div>
                    <Badge color={meta.color}>{meta.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <Info label="Departamento" value={r.department || "—"} />
                    <Info label="Admissão" value={fmtDate(r.admission_date)} />
                    <Info label="Horário" value={`${r.work_start || "—"} - ${r.work_end || "—"}`} />
                    <Info label="Almoço" value={`${r.lunch_start || "—"} - ${r.lunch_end || "—"}`} />
                    <Info label="Férias gozadas" value={`${r.vacation_days_used || 0}/${r.vacation_days_entitlement || 0}d`} />
                    <Info label="Férias restantes" value={`${vacLeft}d`} />
                  </div>
                  {r.contract_type && <div className="mt-3"><Badge color="#0057D9">{r.contract_type}</Badge></div>}
                  {canManage && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                      <button onClick={() => setModal({ type: "hr", initial: r })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted/60"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                      <button onClick={() => deleteHr(r)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                    </div>
                  )}
                </div>
              );
            })}
            {!filteredHr.length && <EmptyState icon={Users} title="Sem perfis RH" description="Crie perfis para gerir admissões, horários e férias." />}
          </div>
        </div>
      )}

      {tab === "ferias" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setModal({ type: "leave" })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Novo Pedido
            </button>
          </div>
          {canManage && (
            <BulkBar count={sel.count} onClear={sel.clear}>
              <button onClick={bulkDeleteLeaves} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
            </BulkBar>
          )}
          <SectionCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    {canManage && <th className="px-5 py-3 w-10"><RowCheckbox checked={leaves.length && sel.count === leaves.length} onChange={() => sel.toggleAll(leaves.map((l) => l.id))} /></th>}
                    <th className="px-5 py-3 font-medium">Colaborador</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Período</th>
                    <th className="px-5 py-3 font-medium">Dias</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaves.map((l) => {
                    const u = userById(l.user_id);
                    const meta = LEAVE_STATUS[l.status] || LEAVE_STATUS.PENDING;
                    return (
                      <tr key={l.id} className="hover:bg-muted/40">
                        {canManage && <td className="px-5 py-3"><RowCheckbox checked={sel.selected.has(l.id)} onChange={() => sel.toggle(l.id)} /></td>}
                        <td className="px-5 py-3"><div className="flex items-center gap-2"><Avatar name={u?.full_name} size={28} /><span className="text-xs font-medium">{u?.full_name}</span></div></td>
                        <td className="px-5 py-3 text-xs">{LEAVE_TYPE[l.type] || l.type}</td>
                        <td className="px-5 py-3 text-xs">{fmtDate(l.start_date)} → {fmtDate(l.end_date)}</td>
                        <td className="px-5 py-3 text-xs">{l.days}{l.half_day ? " (½)" : ""}</td>
                        <td className="px-5 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            {canManage && l.status === "PENDING" && (
                              <>
                                <button onClick={() => reviewLeave(l, "APPROVED")} className="p-1.5 rounded-lg text-success hover:bg-success/10" title="Aprovar"><Check className="w-4 h-4" /></button>
                                <button onClick={() => reviewLeave(l, "REJECTED")} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Rejeitar"><X className="w-4 h-4" /></button>
                              </>
                            )}
                            <button onClick={() => setModal({ type: "leave", initial: l })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteLeave(l)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!leaves.length && <EmptyState title="Sem pedidos de licença" />}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "presencas" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setModal({ type: "attendance" })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Registar Presença
            </button>
          </div>
          <SectionCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-5 py-3 font-medium">Colaborador</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Entrada</th>
                    <th className="px-5 py-3 font-medium">Almoço</th>
                    <th className="px-5 py-3 font-medium">Saída</th>
                    <th className="px-5 py-3 font-medium">Horas</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendance.map((a) => {
                    const u = userById(a.user_id);
                    const meta = ATT_STATUS[a.status] || ATT_STATUS.PRESENT;
                    return (
                      <tr key={a.id} className="hover:bg-muted/40">
                        <td className="px-5 py-3"><div className="flex items-center gap-2"><Avatar name={u?.full_name} size={28} /><span className="text-xs font-medium">{u?.full_name}</span></div></td>
                        <td className="px-5 py-3 text-xs">{fmtDate(a.date)}</td>
                        <td className="px-5 py-3 text-xs">{a.check_in || "—"}</td>
                        <td className="px-5 py-3 text-xs">{a.lunch_out || "—"} - {a.lunch_in || "—"}</td>
                        <td className="px-5 py-3 text-xs">{a.check_out || "—"}</td>
                        <td className="px-5 py-3 text-xs font-medium">{a.total_hours || 0}h</td>
                        <td className="px-5 py-3"><Badge color={meta.color}>{meta.label}</Badge></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModal({ type: "attendance", initial: a })} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteAttendance(a)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!attendance.length && <EmptyState title="Sem registos de presença" />}
            </div>
          </SectionCard>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">
                {modal.type === "hr" && (modal.initial ? "Editar Perfil RH" : "Novo Perfil RH")}
                {modal.type === "leave" && (modal.initial ? "Editar Pedido" : "Novo Pedido de Licença")}
                {modal.type === "attendance" && (modal.initial ? "Editar Presença" : "Registar Presença")}
              </h2>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              {modal.type === "hr" && <EmployeeHRForm users={users} initial={modal.initial} currentUser={user} onCancel={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
              {modal.type === "leave" && <LeaveRequestForm users={users} initial={modal.initial} currentUser={user} onCancel={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
              {modal.type === "attendance" && <AttendanceForm users={users} initial={modal.initial} currentUser={user} onCancel={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return <div><div className="text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}