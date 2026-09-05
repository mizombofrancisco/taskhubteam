import React, { useEffect, useState } from "react";
import { X, FileText, Check, Star, Users, Package, AlertTriangle, TrendingUp, MessageSquare, Gavel, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Avatar, Badge, EmptyState, Loading, SectionCard } from "@/components/ui/acura";
import { fmtDate, fmtDateTime, relativeTime, isAdmin, isManager } from "@/lib/acura";
import EvaluationForm from "@/components/propostas/EvaluationForm";

const STATUS_META = {
  DRAFT: { color: "#9AA3B5", label: "Rascunho" },
  SUBMITTED: { color: "#0BB4F5", label: "Submetida" },
  UNDER_REVIEW: { color: "#F5A623", label: "Em avaliação" },
  APPROVED: { color: "#00A65A", label: "Aprovada" },
  REJECTED: { color: "#E5383B", label: "Rejeitada" },
  REVISION_REQUIRED: { color: "#F5A623", label: "Requer revisão" },
};
const REC_META = {
  APPROVE: { color: "#00A65A", label: "Aprovar" },
  REVISE: { color: "#F5A623", label: "Requer revisão" },
  REJECT: { color: "#E5383B", label: "Rejeitar" },
};
const RISK_LABELS = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto" };

export default function ProposalDetail({ proposal, users, currentUser, onClose, onChanged }) {
  const [evals, setEvals] = useState(null);
  const [showEval, setShowEval] = useState(false);
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const list = await base44.entities.ProposalEvaluation.filter({ proposal_id: proposal.id }, "-created_date", 100);
    setEvals(list);
  };
  useEffect(() => { reload(); }, [proposal.id]); // eslint-disable-line

  if (!evals) return <Loading />;

  const proposer = users.find((u) => u.id === proposal.proposer_id);
  const myEval = evals.find((e) => e.evaluator_id === currentUser.id);
  const admin = isAdmin(currentUser);
  const canEvaluate = !myEval && proposal.status !== "DRAFT" && proposal.proposer_id !== currentUser.id;
  const canDecide = admin && ["SUBMITTED", "UNDER_REVIEW"].includes(proposal.status);
  const avg = (key) => evals.length ? (evals.reduce((s, e) => s + (e[key] || 0), 0) / evals.length).toFixed(1) : "—";
  const recCount = (rec) => evals.filter((e) => e.recommendation === rec).length;

  const submitDecision = async (finalStatus) => {
    if (!confirm(`Confirmar decisão: ${STATUS_META[finalStatus].label}?`)) return;
    setBusy(true);
    try {
      await base44.entities.ProjectProposal.update(proposal.id, {
        status: finalStatus,
        final_decision: finalStatus === "APPROVED" ? "APPROVED" : finalStatus === "REJECTED" ? "REJECTED" : "REVISION_REQUIRED",
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        review_note: note,
      });
      setNote("");
      onChanged();
    } catch (e) { alert(e.message || "Erro ao registar decisão."); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl acura-card max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Badge color={(STATUS_META[proposal.status] || STATUS_META.DRAFT).color}>{(STATUS_META[proposal.status] || STATUS_META.DRAFT).label}</Badge>
            <h2 className="text-lg font-semibold truncate">{proposal.title}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header info */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Avatar name={proposer?.full_name} size={44} status={proposer?.status} />
            <div>
              <div className="text-sm font-medium">{proposer?.full_name}</div>
              <div className="text-xs text-muted-foreground">Proposto em {proposal.submitted_at ? fmtDateTime(proposal.submitted_at) : fmtDateTime(proposal.created_date)}</div>
            </div>
          </div>

          {proposal.summary && <p className="text-sm text-muted-foreground italic">{proposal.summary}</p>}

          {/* Avaliações resumo */}
          {evals.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Metric label="Geral" value={avg("rating")} />
              <Metric label="Viabilidade" value={avg("technical_feasibility")} />
              <Metric label="Valor" value={avg("business_value")} />
              <Metric label="Riscos" value={avg("risk_assessment")} />
              <Metric label="Recursos" value={avg("resource_adequacy")} />
            </div>
          )}

          {/* Recomendações */}
          {evals.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {Object.entries(REC_META).map(([k, m]) => (
                <div key={k} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-sm font-medium">{recCount(k)}</span>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Descrição e detalhes */}
          <SectionCard title="Descrição">
            <div className="p-5 space-y-4 text-sm">
              <Field label="Descrição" value={proposal.description} />
              {proposal.objective && <Field label="Objetivo" value={proposal.objective} />}
              {proposal.background && <Field label="Contexto" value={proposal.background} />}
              {proposal.scope && <Field label="Âmbito" value={proposal.scope} />}
              {proposal.target_audience && <Field label="Público-alvo" value={proposal.target_audience} />}
              {(proposal.areas_involved || []).length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1.5">Áreas envolvidas</div>
                  <div className="flex flex-wrap gap-2">{proposal.areas_involved.map((a, i) => <Badge key={i} color="#0057D9">{a}</Badge>)}</div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div><div className="text-muted-foreground text-xs">Metodologia</div><div className="font-medium">{proposal.methodology}</div></div>
                <div><div className="text-muted-foreground text-xs">Prazo</div><div className="font-medium">{proposal.timeline_weeks} semanas</div></div>
                <div><div className="text-muted-foreground text-xs">Prioridade</div><div className="font-medium">{proposal.priority}</div></div>
              </div>
            </div>
          </SectionCard>

          {/* Equipa */}
          {(proposal.proposed_team || []).length > 0 && (
            <SectionCard title="Equipa proposta" action={<Users className="w-4 h-4 text-muted-foreground" />}>
              <div className="divide-y divide-border">
                {(proposal.proposed_team || []).map((t, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">{t.count}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.role}</div>
                      {t.skills && <div className="text-xs text-muted-foreground">Competências: {t.skills}</div>}
                    </div>
                    {t.notes && <div className="text-xs text-muted-foreground max-w-xs truncate">{t.notes}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Equipamentos */}
          {(proposal.proposed_equipment || []).length > 0 && (
            <SectionCard title="Equipamentos & Recursos" action={<Package className="w-4 h-4 text-muted-foreground" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b border-border">
                    <tr><th className="px-5 py-2 font-medium">Equipamento</th><th className="px-5 py-2 font-medium">Qtd</th><th className="px-5 py-2 font-medium">Custo unit.</th><th className="px-5 py-2 font-medium">Subtotal</th><th className="px-5 py-2 font-medium">Notas</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(proposal.proposed_equipment || []).map((e2, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-5 py-2.5 font-medium">{e2.name}</td>
                        <td className="px-5 py-2.5">{e2.quantity}</td>
                        <td className="px-5 py-2.5">{(e2.estimated_cost || 0).toLocaleString()}</td>
                        <td className="px-5 py-2.5 font-medium">{((e2.estimated_cost || 0) * (e2.quantity || 1)).toLocaleString()}</td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{e2.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Investimento */}
          {(proposal.estimated_investment || proposal.investment_breakdown || proposal.expected_benefits || proposal.success_metrics) && (
            <SectionCard title="Investimento & Benefícios" action={<TrendingUp className="w-4 h-4 text-muted-foreground" />}>
              <div className="p-5 space-y-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <div className="text-2xl font-display font-bold text-primary">{(proposal.estimated_investment || 0).toLocaleString()} AKZ</div>
                  <div className="text-xs text-muted-foreground">Investimento total estimado</div>
                </div>
                {proposal.investment_breakdown && <Field label="Decomposição" value={proposal.investment_breakdown} />}
                {proposal.expected_benefits && <Field label="Benefícios esperados" value={proposal.expected_benefits} />}
                {proposal.success_metrics && <Field label="Métricas de sucesso" value={proposal.success_metrics} />}
              </div>
            </SectionCard>
          )}

          {/* Riscos */}
          {(proposal.risks || []).length > 0 && (
            <SectionCard title="Análise de riscos" action={<AlertTriangle className="w-4 h-4 text-muted-foreground" />}>
              <div className="divide-y divide-border">
                {(proposal.risks || []).map((r, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium flex-1">{r.description}</div>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge color={r.probability === "HIGH" ? "#E5383B" : r.probability === "MEDIUM" ? "#F5A623" : "#00A65A"}>Prob: {RISK_LABELS[r.probability]}</Badge>
                        <Badge color={r.impact === "HIGH" ? "#E5383B" : r.impact === "MEDIUM" ? "#F5A623" : "#00A65A"}>Imp: {RISK_LABELS[r.impact]}</Badge>
                      </div>
                    </div>
                    {r.mitigation && <div className="text-xs text-muted-foreground mt-1.5">Mitigação: {r.mitigation}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Documentação */}
          {(proposal.documentation || []).length > 0 && (
            <SectionCard title="Documentação">
              <div className="divide-y divide-border">
                {(proposal.documentation || []).map((d, i) => {
                  const u = users.find((x) => x.id === proposal.proposer_id);
                  return (
                    <a key={i} href={d.url} target="_blank" rel="noreferrer" className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="text-sm text-accent hover:underline flex-1 truncate">{d.name}</span>
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Avaliações */}
          <SectionCard title={`Avaliações da equipa (${evals.length})`} action={<MessageSquare className="w-4 h-4 text-muted-foreground" />}>
            <div className="p-5">
              {canEvaluate && !showEval && (
                <button onClick={() => setShowEval(true)} className="w-full mb-4 px-4 py-2.5 rounded-lg border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10">+ Avaliar proposta</button>
              )}
              {showEval && (
                <div className="mb-4 p-4 rounded-lg bg-muted/30 border border-border">
                  <EvaluationForm proposalId={proposal.id} currentUser={currentUser} onCancel={() => setShowEval(false)} onSaved={() => { setShowEval(false); reload(); onChanged(); }} />
                </div>
              )}
              {myEval && !showEval && (
                <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-sm flex items-center gap-2"><Check className="w-4 h-4" /> Já submeteu a sua avaliação.</div>
              )}
              <div className="space-y-3">
                {evals.map((e2) => {
                  const u = users.find((x) => x.id === e2.evaluator_id);
                  const m = REC_META[e2.recommendation] || REC_META.APPROVE;
                  return (
                    <div key={e2.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={u?.full_name} size={28} />
                          <span className="text-sm font-medium">{u?.full_name}</span>
                          <span className="text-xs text-muted-foreground">{relativeTime(e2.created_date)}</span>
                        </div>
                        <Badge color={m.color}>{m.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1,2,3,4,5].map((n) => <Star key={n} className={`w-3.5 h-3.5 ${(e2.rating||0) >= n ? "text-warning fill-warning" : "text-muted-foreground/30"}`} />)}
                        <span className="text-xs text-muted-foreground ml-1.5">{e2.rating}/5</span>
                      </div>
                      {e2.comment && <p className="text-sm text-muted-foreground">{e2.comment}</p>}
                    </div>
                  );
                })}
                {!evals.length && !canEvaluate && <EmptyState title="Sem avaliações" description="Esta proposta ainda não foi avaliada pela equipa." />}
              </div>
            </div>
          </SectionCard>

          {/* Decisão final (admin) */}
          {canDecide && (
            <SectionCard title="Decisão final — Diretor Geral" action={<Gavel className="w-4 h-4 text-muted-foreground" />}>
              <div className="p-5 space-y-3">
                <div><label className="text-sm font-medium block mb-1.5">Nota de decisão (opcional)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm min-h-[70px]" placeholder="Justificação da decisão..." /></div>
                <div className="flex gap-2">
                  <button onClick={() => submitDecision("APPROVED")} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg bg-success text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">Aprovar</button>
                  <button onClick={() => submitDecision("REVISION_REQUIRED")} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg bg-warning text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">Requerer revisão</button>
                  <button onClick={() => submitDecision("REJECTED")} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">Rejeitar</button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Nota de decisão (se já decidida) */}
          {proposal.review_note && ["APPROVED","REJECTED","REVISION_REQUIRED"].includes(proposal.status) && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="text-xs text-muted-foreground mb-1">Decisão de {fmtDateTime(proposal.reviewed_at)}</div>
              <p className="text-sm">{proposal.review_note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="p-3 rounded-lg bg-muted/30 border border-border text-center"><div className="text-xl font-display font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
function Field({ label, value }) {
  if (!value) return null;
  return <div><div className="text-muted-foreground text-xs mb-0.5">{label}</div><div className="whitespace-pre-wrap">{value}</div></div>;
}