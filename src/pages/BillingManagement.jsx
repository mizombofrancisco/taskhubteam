import React, { useEffect, useMemo, useState } from "react";
import { Receipt, Plus, Search, Wallet, CheckCircle2, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PageHeader, SectionCard, StatCard, Loading, EmptyState, Badge } from "@/components/ui/acura";
import { useSelection, BulkBar, RowCheckbox } from "@/components/ui/BulkActions";
import { fmtDate } from "@/lib/acura";
import { loadProjects } from "@/lib/data";

const STATUS_LABELS = {
  DRAFT: "Rascunho", SENT: "Enviada", PARTIAL: "Parcial", PAID: "Paga", OVERDUE: "Vencida", CANCELLED: "Anulada",
};
const STATUS_COLORS = {
  DRAFT: "#9AA3B5", SENT: "#0057D9", PARTIAL: "#F5A623", PAID: "#00A65A", OVERDUE: "#E5383B", CANCELLED: "#6B7280",
};
const STATUSES = Object.keys(STATUS_LABELS);

function isOverdue(inv) {
  if (inv.status === "PAID" || inv.status === "CANCELLED" || inv.status === "DRAFT") return false;
  return inv.due_date && new Date(inv.due_date) < new Date();
}

export default function BillingManagement() {
  const [invoices, setInvoices] = useState(null);
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editInv, setEditInv] = useState(null);
  const sel = useSelection();
  const [bulkStatus, setBulkStatus] = useState("SENT");
  const [busy, setBusy] = useState(false);

  const deleteInvoice = async (inv) => {
    if (!confirm(`Eliminar a fatura ${inv.invoice_number}?`)) return;
    try {
      await base44.entities.Invoice.delete(inv.id);
      reload();
    } catch (e) { alert(e.message || "Erro ao eliminar fatura."); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(sel.selected);
    if (!ids.length || !confirm(`Eliminar ${ids.length} fatura(s)?`)) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.Invoice.delete(id).catch(() => {})));
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao eliminar faturas."); } finally { setBusy(false); }
  };

  const bulkSetStatus = async () => {
    const ids = Array.from(sel.selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.Invoice.update(id, { status: bulkStatus }).catch(() => {})));
      sel.clear();
      await reload();
    } catch (e) { alert(e.message || "Erro ao atualizar faturas."); } finally { setBusy(false); }
  };

  const reload = async () => {
    const [inv, proj] = await Promise.all([
      base44.entities.Invoice.list("-issue_date", 500),
      loadProjects().catch(() => []),
    ]);
    // auto-flag overdue
    const today = new Date();
    let changed = [];
    for (const i of inv) {
      if (i.status === "SENT" && i.due_date && new Date(i.due_date) < today) {
        changed.push(base44.entities.Invoice.update(i.id, { status: "OVERDUE" }).catch(() => {}));
      }
    }
    if (changed.length) {
      await Promise.all(changed);
      const fresh = await base44.entities.Invoice.list("-issue_date", 500);
      setInvoices(fresh);
    } else {
      setInvoices(inv);
    }
    setProjects(proj);
  };

  useEffect(() => { reload(); }, []);

  const clients = useMemo(() => {
    const set = new Set();
    projects.forEach((p) => { if (p.client_name) set.add(p.client_name); });
    invoices?.forEach((i) => { if (i.client_name) set.add(i.client_name); });
    return Array.from(set).sort();
  }, [projects, invoices]);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    return (invoices || []).filter((i) => {
      if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
      if (q) {
        const text = `${i.invoice_number} ${i.client_name} ${i.notes || ""}`.toLowerCase();
        if (!text.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, q]);

  const stats = useMemo(() => {
    const active = (invoices || []).filter((i) => i.status !== "CANCELLED");
    const total = active.reduce((s, i) => s + (i.amount || 0), 0);
    const paid = active.reduce((s, i) => s + (i.paid_amount || 0), 0);
    const outstanding = total - paid;
    const overdueCount = active.filter(isOverdue).length;
    return { total, paid, outstanding, overdueCount };
  }, [invoices]);

  if (!invoices) return <Loading />;

  return (
    <div>
      <PageHeader title="Gestão de Faturação" subtitle="Faturas vinculadas a clientes e relatórios financeiros" icon={Receipt}
        actions={<button onClick={() => { setEditInv(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> Nova fatura</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total faturado" value={`${stats.total.toFixed(0)} €`} icon={Wallet} accent="#0057D9" />
        <StatCard label="Recebido" value={`${stats.paid.toFixed(0)} €`} icon={CheckCircle2} accent="#00A65A" />
        <StatCard label="Pendente" value={`${stats.outstanding.toFixed(0)} €`} icon={Clock} accent="#F5A623" />
        <StatCard label="Vencidas" value={stats.overdueCount} icon={AlertTriangle} accent="#E5383B" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar fatura ou cliente…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <BulkBar count={sel.count} onClear={sel.clear}>
        <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={bulkSetStatus} disabled={busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">Definir estado</button>
        <button onClick={bulkDelete} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
      </BulkBar>

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 w-10"><RowCheckbox checked={filtered.length && sel.count === filtered.length} onChange={() => sel.toggleAll(filtered.map((i) => i.id))} /></th>
                <th className="px-4 py-3 font-medium">Fatura</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Projeto</th>
                <th className="px-4 py-3 font-medium">Emissão</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium text-right">Montante</th>
                <th className="px-4 py-3 font-medium text-right">Pago</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => {
                const proj = projectMap.get(inv.project_id);
                return (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><RowCheckbox checked={sel.selected.has(inv.id)} onChange={() => sel.toggle(inv.id)} /></td>
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.client_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{proj ? `${proj.code} · ${proj.name}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{(inv.amount || 0).toFixed(0)} €</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{(inv.paid_amount || 0).toFixed(0)} €</td>
                    <td className="px-4 py-3"><Badge color={STATUS_COLORS[inv.status]}>{STATUS_LABELS[inv.status]}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditInv(inv); setShowForm(true); }} className="text-xs text-accent hover:underline">Editar</button>
                        <button onClick={() => deleteInvoice(inv)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <EmptyState icon={Receipt} title="Sem faturas" description="Crie a primeira fatura para começar." />}
        </div>
      </SectionCard>

      {showForm && <InvoiceForm initial={editInv} projects={projects} clients={clients} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </div>
  );
}

function InvoiceForm({ initial, projects, clients, onClose, onSaved }) {
  const [form, setForm] = useState({
    invoice_number: initial?.invoice_number || `FT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    client_name: initial?.client_name || "",
    project_id: initial?.project_id || "",
    issue_date: initial?.issue_date || new Date().toISOString().slice(0, 10),
    due_date: initial?.due_date || "",
    amount: initial?.amount || "",
    paid_amount: initial?.paid_amount || 0,
    status: initial?.status || "DRAFT",
    notes: initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.invoice_number || !form.client_name || !form.issue_date || !form.amount) return setErr("Preencha número, cliente, data e montante.");
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), paid_amount: Number(form.paid_amount) || 0, project_id: form.project_id || null };
      if (initial?.id) await base44.entities.Invoice.update(initial.id, payload);
      else await base44.entities.Invoice.create(payload);
      onSaved();
    } catch (ex) { setErr(ex.message || "Erro ao guardar."); } finally { setSaving(false); }
  };

  const field = "w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card"><h2 className="text-lg font-semibold">{initial?.id ? "Editar fatura" : "Nova fatura"}</h2><button onClick={onClose} className="text-muted-foreground">✕</button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Número *</label><input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} className={field} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Estado</label><select value={form.status} onChange={(e) => set("status", e.target.value)} className={field}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Cliente *</label>
            <input list="clients-list" value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={field} placeholder="Selecionar ou escrever…" />
            <datalist id="clients-list">{clients.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Projeto</label>
            <select value={form.project_id} onChange={(e) => set("project_id", e.target.value)} className={field}>
              <option value="">—</option>
              {projects.filter((p) => !form.client_name || p.client_name === form.client_name).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Data emissão *</label><input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} className={field} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Vencimento</label><input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className={field} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-sm font-medium">Montante (€) *</label><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={field} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Pago (€)</label><input type="number" step="0.01" min="0" value={form.paid_amount} onChange={(e) => set("paid_amount", e.target.value)} className={field} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Notas</label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">{saving ? "A guardar…" : "Guardar"}</button></div>
        </form>
      </div>
    </div>
  );
}