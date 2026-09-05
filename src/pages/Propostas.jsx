import React, { useEffect, useState } from "react";
import { Lightbulb, Plus, Search, Pencil, Trash2, FileText, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadUsers, logActivity } from "@/lib/data";
import { PageHeader, SectionCard, EmptyState, Loading, Avatar, Badge, StatCard } from "@/components/ui/acura";
import { fmtDate, relativeTime, isAdmin } from "@/lib/acura";
import ProposalForm from "@/components/propostas/ProposalForm";
import ProposalDetail from "@/components/propostas/ProposalDetail";

const STATUS_META = {
  DRAFT: { color: "#9AA3B5", label: "Rascunho" },
  SUBMITTED: { color: "#0BB4F5", label: "Submetida" },
  UNDER_REVIEW: { color: "#F5A623", label: "Em avaliação" },
  APPROVED: { color: "#00A65A", label: "Aprovada" },
  REJECTED: { color: "#E5383B", label: "Rejeitada" },
  REVISION_REQUIRED: { color: "#F5A623", label: "Requer revisão" },
};
const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "DRAFT", label: "Rascunhos" },
  { value: "SUBMITTED", label: "Submetidas" },
  { value: "UNDER_REVIEW", label: "Em avaliação" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "REJECTED", label: "Rejeitadas" },
  { value: "REVISION_REQUIRED", label: "Requer revisão" },
];

export default function Propostas() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState(null);
  const [evals, setEvals] = useState([]);
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editProposal, setEditProposal] = useState(null);
  const [detail, setDetail] = useState(null);

  const reload = async () => {
    const [p, e, u] = await Promise.all([
      base44.entities.ProjectProposal.list("-created_date", 200),
      base44.entities.ProposalEvaluation.list("-created_date", 500),
      loadUsers(),
    ]);
    setProposals(p);
    setEvals(e);
    setUsers(u);
  };
  useEffect(() => { reload(); }, []);

  if (!proposals || !users) return <Loading />;

  const evalsFor = (id) => evals.filter((e) => e.proposal_id === id);
  const userById = (id) => users.find((u) => u.id === id);

  const filtered = proposals.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (q && !(p.title || "").toLowerCase().includes(q.toLowerCase()) && !(p.summary || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: proposals.length,
    submitted: proposals.filter((p) => ["SUBMITTED", "UNDER_REVIEW"].includes(p.status)).length,
    approved: proposals.filter((p) => p.status === "APPROVED").length,
    pending: proposals.filter((p) => p.status === "REVISION_REQUIRED").length,
  };

  const handleDelete = async (p) => {
    if (!confirm(`Eliminar a proposta "${p.title}"?`)) return;
    await base44.entities.ProjectProposal.delete(p.id);
    await logActivity({ entity_type: "PROJECT_PROPOSAL", entity_id: p.id, action: "DELETED" });
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Propostas de Projetos"
        subtitle="Submeta e avalie propostas de novos projetos colaborativamente"
        icon={Lightbulb}
        actions={
          <button onClick={() => { setEditProposal(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Nova Proposta
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total propostas" value={stats.total} icon={Lightbulb} accent="#0057D9" />
        <StatCard label="Em avaliação" value={stats.submitted} icon={FileText} accent="#0BB4F5" />
        <StatCard label="Aprovadas" value={stats.approved} icon={Star} accent="#00A65A" />
        <StatCard label="Requerem revisão" value={stats.pending} icon={FileText} accent="#F5A623" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar propostas..." className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const proposer = userById(p.proposer_id);
          const meta = STATUS_META[p.status] || STATUS_META.DRAFT;
          const pe = evalsFor(p.id);
          const avgRating = pe.length ? (pe.reduce((s, e) => s + (e.rating || 0), 0) / pe.length).toFixed(1) : null;
          const approveCount = pe.filter((e) => e.recommendation === "APPROVE").length;
          const canEdit = p.proposer_id === user.id && p.status === "DRAFT";
          const canDelete = p.proposer_id === user.id || isAdmin(user);
          return (
            <div key={p.id} className="acura-card p-5 flex flex-col cursor-pointer hover:acura-glow transition-shadow" onClick={() => setDetail(p)}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Badge color={meta.color}>{meta.label}</Badge>
                  <Badge color="#0057D9">{p.priority}</Badge>
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" /> {avgRating} ({pe.length})
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-base mb-1 line-clamp-2">{p.title}</h3>
              {p.summary && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.summary}</p>}
              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                <Avatar name={proposer?.full_name} size={28} status={proposer?.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{proposer?.full_name}</div>
                  <div className="text-[11px] text-muted-foreground">{relativeTime(p.created_date)}</div>
                </div>
                {(p.areas_involved || []).slice(0, 2).map((a, i) => <Badge key={i} color="#0BB4F5">{a}</Badge>)}
                {(p.areas_involved || []).length > 2 && <span className="text-xs text-muted-foreground">+{p.areas_involved.length - 2}</span>}
                {canEdit && (
                  <button onClick={(e) => { e.stopPropagation(); setEditProposal(p); setShowForm(true); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                )}
                {canDelete && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              {approveCount > 0 && (
                <div className="mt-2 text-[11px] text-success flex items-center gap-1"><Star className="w-3 h-3" /> {approveCount} recomendação(ões) de aprovação</div>
              )}
            </div>
          );
        })}
      </div>
      {!filtered.length && <EmptyState icon={Lightbulb} title="Sem propostas" description="Crie a primeira proposta de projeto para a equipa avaliar." action={<button onClick={() => { setEditProposal(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Nova Proposta</button>} />}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-3xl acura-card max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">{editProposal ? "Editar Proposta" : "Nova Proposta de Projeto"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <ProposalForm currentUser={user} initial={editProposal} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />
            </div>
          </div>
        </div>
      )}

      {detail && (
        <ProposalDetail proposal={detail} users={users} currentUser={user} onClose={() => setDetail(null)} onChanged={reload} />
      )}
    </div>
  );
}