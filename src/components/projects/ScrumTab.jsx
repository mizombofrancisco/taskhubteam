import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Target, Calendar, Flag, Trash2, ArrowRightCircle, ArrowLeftCircle } from "lucide-react";
import { SectionCard, EmptyState, Badge, Avatar, PriorityBadge } from "@/components/ui/acura";
import { fmtDate, STAGE_LABELS, isAdmin } from "@/lib/acura";
import SprintForm from "@/components/projects/SprintForm";

const SPRINT_STATUS = {
  PLANNING: { label: "Planeamento", color: "#F5A623" },
  ACTIVE: { label: "Ativo", color: "#0BB4F5" },
  COMPLETED: { label: "Concluído", color: "#00A65A" },
};
const SPRINT_STAGES = ["TO_DO", "IN_PROGRESS", "DONE"];

export default function ScrumTab({ project, tasks, users, currentUser, onChanged }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSprint, setEditSprint] = useState(null);

  const canManage = isAdmin(currentUser) || project.project_leader_id === currentUser.id;

  const reload = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Sprint.filter({ project_id: project.id }, "-start_date", 100);
      setSprints(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [project.id]); // eslint-disable-line

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const sprintStories = tasks.filter((t) => activeSprint && t.sprint_id === activeSprint.id);
  const backlog = tasks.filter((t) => !t.sprint_id);

  const addToSprint = async (taskId) => {
    if (!activeSprint) { alert("Crie e ative um sprint primeiro."); return; }
    await base44.entities.Task.update(taskId, { sprint_id: activeSprint.id, stage: "TO_DO" });
    onChanged?.();
  };
  const removeFromSprint = async (taskId) => {
    await base44.entities.Task.update(taskId, { sprint_id: null, stage: "BACKLOG" });
    onChanged?.();
  };
  const changeStage = async (taskId, stage) => {
    await base44.entities.Task.update(taskId, { stage });
    onChanged?.();
  };
  const changeSprintStatus = async (sprint, status) => {
    await base44.entities.Sprint.update(sprint.id, { status });
    if (status === "COMPLETED") {
      // move remaining sprint stories to backlog
      const remaining = tasks.filter((t) => t.sprint_id === sprint.id && t.stage !== "DONE");
      await Promise.all(remaining.map((t) => base44.entities.Task.update(t.id, { sprint_id: null, stage: "BACKLOG" }).catch(() => {})));
    }
    reload();
    onChanged?.();
  };
  const deleteSprint = async (sprint) => {
    if (!confirm(`Eliminar o sprint "${sprint.name}"? As histórias regressam ao backlog.`)) return;
    const items = tasks.filter((t) => t.sprint_id === sprint.id);
    await Promise.all(items.map((t) => base44.entities.Task.update(t.id, { sprint_id: null, stage: "BACKLOG" }).catch(() => {})));
    await base44.entities.Sprint.delete(sprint.id);
    reload();
    onChanged?.();
  };

  const points = (list) => list.reduce((s, t) => s + (t.story_points || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="w-4 h-4" /> Metodologia Scrum · Sprints e backlog
        </div>
        {canManage && (
          <button onClick={() => { setEditSprint(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo Sprint
          </button>
        )}
      </div>

      {/* Active sprint board */}
      {activeSprint ? (
        <SectionCard
          title={`Sprint ativo · ${activeSprint.name}`}
          action={<Badge color={SPRINT_STATUS.ACTIVE.color}>{SPRINT_STATUS.ACTIVE.label}</Badge>}
        >
          <div className="px-5 py-3 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-b border-border">
            {activeSprint.goal && <span className="italic">“{activeSprint.goal}”</span>}
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(activeSprint.start_date)} → {fmtDate(activeSprint.end_date)}</span>
            <span>{sprintStories.length} histórias · {points(sprintStories)} pts</span>
            {canManage && <button onClick={() => changeSprintStatus(activeSprint, "COMPLETED")} className="text-success hover:underline ml-auto">Concluir sprint</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
            {SPRINT_STAGES.map((stage) => {
              const items = sprintStories.filter((t) => t.stage === stage);
              return (
                <div key={stage} className="rounded-xl bg-muted/30 border border-border p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((t) => {
                      const a = users.find((u) => u.id === t.assigned_to);
                      return (
                        <div key={t.id} className="rounded-lg bg-card border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">{t.title}</span>
                            {canManage && (
                              <button onClick={() => removeFromSprint(t.id)} className="text-muted-foreground hover:text-destructive" title="Remover do sprint"><ArrowLeftCircle className="w-4 h-4" /></button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <PriorityBadge priority={t.priority} />
                            {t.story_points ? <span className="text-xs text-muted-foreground">{t.story_points} pts</span> : null}
                            <Avatar name={a?.full_name} size={20} />
                          </div>
                          {canManage && (
                            <select value={t.stage} onChange={(e) => changeStage(t.id, e.target.value)} className="mt-2 w-full h-8 px-2 rounded-md bg-muted/40 border border-border text-xs">
                              {SPRINT_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })}
                    {!items.length && <div className="text-xs text-muted-foreground text-center py-3">Vazio</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <EmptyState icon={Target} title="Sem sprint ativo" description={canManage ? "Crie um sprint e ative-o para começar o trabalho." : "Aguardando ativação de sprint pelo líder."} />
        </SectionCard>
      )}

      {/* Product Backlog */}
      <SectionCard title={`Backlog do produto · ${backlog.length} histórias`} action={activeSprint && canManage && <span className="text-xs text-muted-foreground">Clique em → para enviar ao sprint ativo</span>}>
        <div className="divide-y divide-border">
          {backlog.map((t) => {
            const a = users.find((u) => u.id === t.assigned_to);
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{t.reference}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <PriorityBadge priority={t.priority} />
                    {t.story_points ? <span className="text-xs text-muted-foreground">{t.story_points} pts</span> : null}
                    <span className="text-xs text-muted-foreground">{STAGE_LABELS[t.stage]}</span>
                  </div>
                </div>
                <Avatar name={a?.full_name} size={24} />
                {canManage && activeSprint && (
                  <button onClick={() => addToSprint(t.id)} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Adicionar ao sprint ativo"><ArrowRightCircle className="w-4 h-4" /></button>
                )}
              </div>
            );
          })}
          {!backlog.length && <EmptyState title="Backlog vazio" description="As tarefas sem sprint aparecem aqui." />}
        </div>
      </SectionCard>

      {/* All sprints */}
      <SectionCard title="Todos os sprints">
        <div className="divide-y divide-border">
          {sprints.map((s) => {
            const st = SPRINT_STATUS[s.status];
            const count = tasks.filter((t) => t.sprint_id === s.id).length;
            return (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <Flag className="w-4 h-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(s.start_date)} → {fmtDate(s.end_date)} · {count} histórias</div>
                </div>
                <Badge color={st.color}>{st.label}</Badge>
                {canManage && (
                  <div className="flex items-center gap-1">
                    {s.status !== "ACTIVE" && <button onClick={() => changeSprintStatus(s, "ACTIVE")} className="text-xs text-accent hover:underline">Ativar</button>}
                    <button onClick={() => { setEditSprint(s); setShowForm(true); }} className="text-xs text-muted-foreground hover:text-foreground px-2">Editar</button>
                    <button onClick={() => deleteSprint(s)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            );
          })}
          {!sprints.length && <EmptyState title="Sem sprints" />}
        </div>
      </SectionCard>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditSprint(null); }}>
          <div className="w-full max-w-lg acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">{editSprint ? "Editar Sprint" : "Novo Sprint"}</h2>
              <button onClick={() => { setShowForm(false); setEditSprint(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <SprintForm projectId={project.id} initial={editSprint} onCancel={() => { setShowForm(false); setEditSprint(null); }} onSaved={() => { setShowForm(false); setEditSprint(null); reload(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}