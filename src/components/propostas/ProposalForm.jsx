import React, { useState } from "react";
import { Plus, Trash2, Upload, X, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const METHODOLOGIES = [
  { value: "AGILE", label: "Ágil" },
  { value: "SCRUM", label: "Scrum" },
  { value: "KANBAN", label: "Kanban" },
  { value: "WATERFALL", label: "Cascata (Waterfall)" },
  { value: "OTHER", label: "Outra" },
];
const PRIORITIES = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Crítica" },
];
const RISK_LEVELS = [
  { value: "LOW", label: "Baixo" },
  { value: "MEDIUM", label: "Médio" },
  { value: "HIGH", label: "Alto" },
];

const input = "w-full h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm";
const textarea = "w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm min-h-[80px]";
const label = "text-sm font-medium block mb-1.5";

export default function ProposalForm({ currentUser, initial, onCancel, onSaved }) {
  const [f, setF] = useState(() => ({
    title: "",
    summary: "",
    description: "",
    objective: "",
    background: "",
    scope: "",
    areas_involved: [],
    target_audience: "",
    methodology: "AGILE",
    timeline_weeks: 12,
    priority: "MEDIUM",
    proposed_team: [],
    proposed_equipment: [],
    estimated_investment: 0,
    investment_breakdown: "",
    expected_benefits: "",
    success_metrics: "",
    risks: [],
    documentation: [],
    status: "DRAFT",
    ...initial,
  }));
  const [areaInput, setAreaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const addArea = () => {
    if (!areaInput.trim()) return;
    set("areas_involved", [...(f.areas_involved || []), areaInput.trim()]);
    setAreaInput("");
  };
  const removeArea = (i) => set("areas_involved", f.areas_involved.filter((_, idx) => idx !== i));

  const addTeam = () => set("proposed_team", [...(f.proposed_team || []), { role: "", count: 1, skills: "", notes: "" }]);
  const updTeam = (i, k, v) => set("proposed_team", f.proposed_team.map((t, idx) => idx === i ? { ...t, [k]: v } : t));
  const rmTeam = (i) => set("proposed_team", f.proposed_team.filter((_, idx) => idx !== i));

  const addEquip = () => set("proposed_equipment", [...(f.proposed_equipment || []), { name: "", quantity: 1, estimated_cost: 0, notes: "" }]);
  const updEquip = (i, k, v) => set("proposed_equipment", f.proposed_equipment.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const rmEquip = (i) => set("proposed_equipment", f.proposed_equipment.filter((_, idx) => idx !== i));

  const addRisk = () => set("risks", [...(f.risks || []), { description: "", probability: "MEDIUM", impact: "MEDIUM", mitigation: "" }]);
  const updRisk = (i, k, v) => set("risks", f.risks.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const rmRisk = (i) => set("risks", f.risks.filter((_, idx) => idx !== i));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url, uploaded_at: new Date().toISOString() };
      }));
      set("documentation", [...(f.documentation || []), ...uploaded]);
    } catch (e2) { setErr("Erro ao enviar ficheiro: " + (e2.message || "")); } finally { setUploading(false); }
  };
  const rmDoc = (i) => set("documentation", f.documentation.filter((_, idx) => idx !== i));

  const submit = async (newStatus) => {
    if (!f.title.trim()) { setErr("Título é obrigatório."); return; }
    if (!f.description.trim()) { setErr("Descrição é obrigatória."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        ...f,
        proposer_id: f.proposer_id || currentUser.id,
        status: newStatus,
        submitted_at: newStatus === "SUBMITTED" && !f.submitted_at ? new Date().toISOString() : f.submitted_at,
      };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.ProjectProposal.update(initial.id, payload);
      } else {
        saved = await base44.entities.ProjectProposal.create(payload);
      }
      onSaved(saved);
    } catch (e2) { setErr(e2.message || "Erro ao guardar proposta."); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {err && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>}

      <Section title="1. Informação Geral">
        <div className="space-y-3">
          <div><label className={label}>Título da proposta *</label><input value={f.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Ex: Plataforma de E-commerce para Cliente X" /></div>
          <div><label className={label}>Resumo executivo</label><textarea value={f.summary} onChange={(e) => set("summary", e.target.value)} className={textarea} placeholder="Breve resumo da proposta (máx. 500 caracteres)" /></div>
          <div><label className={label}>Descrição detalhada *</label><textarea value={f.description} onChange={(e) => set("description", e.target.value)} className={textarea + " min-h-[120px]"} placeholder="Descrição completa do projeto proposto" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Objetivo</label><textarea value={f.objective} onChange={(e) => set("objective", e.target.value)} className={textarea} placeholder="Objetivo principal" /></div>
            <div><label className={label}>Contexto / Background</label><textarea value={f.background} onChange={(e) => set("background", e.target.value)} className={textarea} placeholder="Contexto que motiva a proposta" /></div>
          </div>
          <div><label className={label}>Âmbito (Scope)</label><textarea value={f.scope} onChange={(e) => set("scope", e.target.value)} className={textarea} placeholder="O que está incluído e excluído do projeto" /></div>
          <div><label className={label}>Público-alvo</label><input value={f.target_audience} onChange={(e) => set("target_audience", e.target.value)} className={input} placeholder="Ex: Clientes corporativos, utilizadores finais..." /></div>
          <div>
            <label className={label}>Áreas envolvidas</label>
            <div className="flex gap-2 mb-2">
              <input value={areaInput} onChange={(e) => setAreaInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea())} className={input} placeholder="Ex: Marketing, TI, Vendas..." />
              <button type="button" onClick={addArea} className="px-3 rounded-lg bg-muted/60 border border-border text-sm hover:bg-muted"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(f.areas_involved || []).map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-medium">
                  {a}<button type="button" onClick={() => removeArea(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="2. Metodologia & Prazo">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={label}>Metodologia</label><select value={f.methodology} onChange={(e) => set("methodology", e.target.value)} className={input}>{METHODOLOGIES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          <div><label className={label}>Prazo estimado (semanas)</label><input type="number" min="1" value={f.timeline_weeks} onChange={(e) => set("timeline_weeks", parseInt(e.target.value) || 1)} className={input} /></div>
          <div><label className={label}>Prioridade</label><select value={f.priority} onChange={(e) => set("priority", e.target.value)} className={input}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
        </div>
      </Section>

      <Section title="3. Equipa Proposta" action={<button type="button" onClick={addTeam} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25"><Plus className="w-3.5 h-3.5" /> Adicionar papel</button>}>
        <div className="space-y-2">
          {(f.proposed_team || []).map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border">
              <input value={t.role} onChange={(e) => updTeam(i, "role", e.target.value)} className={input + " col-span-12 sm:col-span-4"} placeholder="Papel (ex: Dev Frontend)" />
              <input type="number" min="1" value={t.count} onChange={(e) => updTeam(i, "count", parseInt(e.target.value) || 1)} className={input + " col-span-6 sm:col-span-2"} placeholder="Qtd" />
              <input value={t.skills} onChange={(e) => updTeam(i, "skills", e.target.value)} className={input + " col-span-6 sm:col-span-3"} placeholder="Competências" />
              <input value={t.notes} onChange={(e) => updTeam(i, "notes", e.target.value)} className={input + " col-span-10 sm:col-span-2"} placeholder="Notas" />
              <button type="button" onClick={() => rmTeam(i)} className="col-span-2 sm:col-span-1 p-2 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {!(f.proposed_team || []).length && <p className="text-sm text-muted-foreground text-center py-4">Sem papéis definidos. Adicione a equipa necessária.</p>}
        </div>
      </Section>

      <Section title="4. Equipamentos & Recursos" action={<button type="button" onClick={addEquip} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25"><Plus className="w-3.5 h-3.5" /> Adicionar equipamento</button>}>
        <div className="space-y-2">
          {(f.proposed_equipment || []).map((e2, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border">
              <input value={e2.name} onChange={(e) => updEquip(i, "name", e.target.value)} className={input + " col-span-12 sm:col-span-5"} placeholder="Equipamento (ex: Servidor dedicado)" />
              <input type="number" min="1" value={e2.quantity} onChange={(e) => updEquip(i, "quantity", parseInt(e.target.value) || 1)} className={input + " col-span-4 sm:col-span-2"} placeholder="Qtd" />
              <input type="number" min="0" step="0.01" value={e2.estimated_cost} onChange={(e) => updEquip(i, "estimated_cost", parseFloat(e.target.value) || 0)} className={input + " col-span-4 sm:col-span-2"} placeholder="Custo unit." />
              <input value={e2.notes} onChange={(e) => updEquip(i, "notes", e.target.value)} className={input + " col-span-2 sm:col-span-2"} placeholder="Notas" />
              <button type="button" onClick={() => rmEquip(i)} className="col-span-2 sm:col-span-1 p-2 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {!(f.proposed_equipment || []).length && <p className="text-sm text-muted-foreground text-center py-4">Sem equipamentos definidos.</p>}
        </div>
      </Section>

      <Section title="5. Investimento & Benefícios">
        <div className="space-y-3">
          <div><label className={label}>Investimento total estimado (AKZ)</label><input type="number" min="0" step="0.01" value={f.estimated_investment} onChange={(e) => set("estimated_investment", parseFloat(e.target.value) || 0)} className={input} /></div>
          <div><label className={label}>Decomposição do investimento</label><textarea value={f.investment_breakdown} onChange={(e) => set("investment_breakdown", e.target.value)} className={textarea} placeholder="Detalhe dos custos: pessoal, equipamentos, licenças, infraestrutura..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Benefícios esperados</label><textarea value={f.expected_benefits} onChange={(e) => set("expected_benefits", e.target.value)} className={textarea} placeholder="Benefícios diretos e indiretos" /></div>
            <div><label className={label}>Métricas de sucesso</label><textarea value={f.success_metrics} onChange={(e) => set("success_metrics", e.target.value)} className={textarea} placeholder="Como medir o sucesso (KPIs)" /></div>
          </div>
        </div>
      </Section>

      <Section title="6. Análise de Riscos" action={<button type="button" onClick={addRisk} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25"><Plus className="w-3.5 h-3.5" /> Adicionar risco</button>}>
        <div className="space-y-2">
          {(f.risks || []).map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <input value={r.description} onChange={(e) => updRisk(i, "description", e.target.value)} className={input + " col-span-12 sm:col-span-7"} placeholder="Descrição do risco" />
                <select value={r.probability} onChange={(e) => updRisk(i, "probability", e.target.value)} className={input + " col-span-6 sm:col-span-2"}>{RISK_LEVELS.map((l) => <option key={l.value} value={l.value}>Prob: {l.label}</option>)}</select>
                <select value={r.impact} onChange={(e) => updRisk(i, "impact", e.target.value)} className={input + " col-span-5 sm:col-span-2"}>{RISK_LEVELS.map((l) => <option key={l.value} value={l.value}>Imp: {l.label}</option>)}</select>
                <button type="button" onClick={() => rmRisk(i)} className="col-span-1 p-2 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
              </div>
              <input value={r.mitigation} onChange={(e) => updRisk(i, "mitigation", e.target.value)} className={input} placeholder="Estratégia de mitigação" />
            </div>
          ))}
          {!(f.risks || []).length && <p className="text-sm text-muted-foreground text-center py-4">Sem riscos identificados.</p>}
        </div>
      </Section>

      <Section title="7. Documentação de Apoio">
        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-accent/50 transition-colors">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-accent" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">{uploading ? "A enviar..." : "Clique para anexar documentação (PDF, imagens, docs)"}</span>
            <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          <div className="space-y-1.5">
            {(f.documentation || []).map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                <FileText className="w-4 h-4 text-accent shrink-0" />
                <a href={d.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline truncate flex-1">{d.name}</a>
                <button type="button" onClick={() => rmDoc(i)} className="p-1 rounded text-destructive hover:bg-destructive/10"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button>
        {!initial?.id && (
          <button type="button" onClick={() => submit("DRAFT")} disabled={saving} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/60 disabled:opacity-50">Guardar rascunho</button>
        )}
        <button type="button" onClick={() => submit(initial?.id && initial.status === "DRAFT" ? "SUBMITTED" : (initial?.status || "SUBMITTED"))} disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? "A guardar..." : (initial?.status === "DRAFT" ? "Submeter proposta" : "Guardar")}
        </button>
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="acura-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}