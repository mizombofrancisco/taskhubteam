import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadMyNotifications } from "@/lib/data";
import { PageHeader, SectionCard, EmptyState, Loading } from "@/components/ui/acura";
import { relativeTime } from "@/lib/acura";

const TYPE_META = {
  TASK_ASSIGNED: { color: "#0057D9", label: "Tarefa" },
  TASK_MOVED: { color: "#A855F7", label: "Movida" },
  TASK_DUE_SOON: { color: "#F5A623", label: "Prazo" },
  TASK_OVERDUE: { color: "#E5383B", label: "Atrasada" },
  WORKLOG_SUBMITTED: { color: "#F5A623", label: "Timesheet" },
  WORKLOG_APPROVED: { color: "#00A65A", label: "Aprovado" },
  WORKLOG_REJECTED: { color: "#E5383B", label: "Rejeitado" },
  TEAM_ADDED: { color: "#0BB4F5", label: "Equipa" },
  PROJECT_STATUS_CHANGED: { color: "#0057D9", label: "Projeto" },
  NEW_DIRECT_MESSAGE: { color: "#0BB4F5", label: "Mensagem" },
  NEW_CHANNEL_MESSAGE: { color: "#0BB4F5", label: "Canal" },
  MENTION: { color: "#F5A623", label: "Menção" },
  THREAD_REPLY: { color: "#A855F7", label: "Thread" },
  SPRINT_DUE_SOON: { color: "#F5A623", label: "Sprint" },
  SPRINT_OVERDUE: { color: "#E5383B", label: "Sprint atrasado" },
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);

  const reload = () => loadMyNotifications(user.id).then(setItems).catch(() => setItems([]));
  useEffect(() => {
    reload();
    const unsub = base44.entities.Notification.subscribe(() => reload());
    return unsub;
  }, [user.id]);

  const markRead = async (id) => { await base44.entities.Notification.update(id, { is_read: true }); reload(); };
  const markAll = async () => {
    await Promise.all((items || []).filter((n) => !n.is_read).map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
    reload();
  };

  if (!items) return <Loading />;
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div>
      <PageHeader title="Notificações" subtitle={`${unread} não lidas`} icon={Bell}
        actions={unread > 0 && <button onClick={markAll} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/60"><CheckCheck className="w-4 h-4" /> Marcar todas lidas</button>} />
      <SectionCard>
        <div className="divide-y divide-border">
          {items.map((n) => {
            const meta = TYPE_META[n.type] || { color: "#9AA3B5", label: n.type };
            return (
              <div key={n.id} className={`px-5 py-3.5 flex items-start gap-3 ${n.is_read ? "" : "bg-accent/5"}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}1f`, color: meta.color }}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium">{n.title}</span><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${meta.color}1f`, color: meta.color }}>{meta.label}</span></div>
                  {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{relativeTime(n.created_date)}</div>
                </div>
                {!n.is_read && <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-muted/60" title="Marcar como lida"><Check className="w-4 h-4" /></button>}
              </div>
            );
          })}
          {!items.length && <EmptyState icon={Bell} title="Sem notificações" description="Está em dia com tudo." />}
        </div>
      </SectionCard>
    </div>
  );
}