import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const input = "w-full h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm";
const textarea = "w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm min-h-[80px]";
const label = "text-sm font-medium block mb-1.5";

const RECOMMENDATIONS = [
  { value: "APPROVE", label: "Aprovar", color: "#00A65A" },
  { value: "REVISE", label: "Requer revisão", color: "#F5A623" },
  { value: "REJECT", label: "Rejeitar", color: "#E5383B" },
];

function Stars({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onClick={() => onChange(n)} className={`text-2xl leading-none transition-colors ${(value || 0) >= n ? "text-warning" : "text-muted-foreground/40"} hover:text-warning disabled:cursor-not-allowed`}>★</button>
      ))}
    </div>
  );
}

export default function EvaluationForm({ proposalId, currentUser, onSaved, onCancel }) {
  const [f, setF] = useState({
    rating: 3,
    technical_feasibility: 3,
    business_value: 3,
    risk_assessment: 3,
    resource_adequacy: 3,
    comment: "",
    recommendation: "APPROVE",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr("");
    try {
      await base44.entities.ProposalEvaluation.create({
        ...f,
        proposal_id: proposalId,
        evaluator_id: currentUser.id,
      });
      onSaved();
    } catch (e2) { setErr(e2.message || "Erro ao submeter avaliação."); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>}
      <p className="text-sm text-muted-foreground">Avalie cada critério de 1 (muito fraco) a 5 (excelente).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RatingRow label="Avaliação geral" value={f.rating} onChange={(v) => set("rating", v)} />
        <RatingRow label="Viabilidade técnica" value={f.technical_feasibility} onChange={(v) => set("technical_feasibility", v)} />
        <RatingRow label="Valor de negócio" value={f.business_value} onChange={(v) => set("business_value", v)} />
        <RatingRow label="Avaliação de riscos" value={f.risk_assessment} onChange={(v) => set("risk_assessment", v)} />
        <RatingRow label="Adequação de recursos" value={f.resource_adequacy} onChange={(v) => set("resource_adequacy", v)} />
      </div>
      <div><label className={label}>Comentário / Justificação</label><textarea value={f.comment} onChange={(e) => set("comment", e.target.value)} className={textarea} placeholder="Fundamente a sua avaliação..." /></div>
      <div>
        <label className={label}>Recomendação</label>
        <div className="flex gap-2">
          {RECOMMENDATIONS.map((r) => (
            <button key={r.value} type="button" onClick={() => set("recommendation", r.value)} className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${f.recommendation === r.value ? "border-2" : "border border-border hover:bg-muted/60"}`} style={f.recommendation === r.value ? { borderColor: r.color, background: `${r.color}1a`, color: r.color } : {}}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button>
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving ? "A submeter..." : "Submeter avaliação"}</button>
      </div>
    </form>
  );
}

function RatingRow({ label, value, onChange }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="text-sm font-medium mb-2">{label}</div>
      <Stars value={value} onChange={onChange} />
    </div>
  );
}