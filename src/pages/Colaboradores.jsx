import React, { useEffect, useState } from "react";
import { Users, UserPlus, Search, KeyRound, Trash2, Power } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadUsers, logActivity } from "@/lib/data";
import { PageHeader, SectionCard, EmptyState, Loading, Avatar, Badge } from "@/components/ui/acura";
import { useSelection, BulkBar, RowCheckbox } from "@/components/ui/BulkActions";
import { ROLE_LABELS, PRESENCE_META, normalizeRole, relativeTime, isAdmin } from "@/lib/acura";

const ROLES = ["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "DESIGNER", "TRAINER"];

export default function Colaboradores() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("diretorio");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pwUser, setPwUser] = useState(null);
  const [msg, setMsg] = useState(null);
  const sel = useSelection();
  const [bulkRole, setBulkRole] = useState("DEVELOPER");
  const [busy, setBusy] = useState(false);

  const reload = () => loadUsers().then(setUsers);
  useEffect(() => { reload(); }, []);

  const flash = (type, text) => { setMsg({ type, text }); window.setTimeout(() => setMsg(null), 4000); };

  const filtered = (users || []).filter((u) => !q ||
    (u.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.job_title || "").toLowerCase().includes(q.toLowerCase()) ||
    (ROLE_LABELS[u.role] || "").toLowerCase().includes(q.toLowerCase()));

  const setRole = async (u, role) => {
    try {
      await base44.entities.User.update(u.id, { role });
      await logActivity({ entity_type: "USER", entity_id: u.id, action: "UPDATED", changes: { field: "role", from: u.role, to: role } });
      flash("success", `Papel de ${u.full_name} atualizado para ${ROLE_LABELS[role] || role}.`);
      reload();
    } catch (e) { flash("error", e.message || "Erro ao atualizar papel."); }
  };
  const toggleActive = async (u) => {
    try {
      const next = u.is_active === false;
      await base44.entities.User.update(u.id, { is_active: next });
      await logActivity({ entity_type: "USER", entity_id: u.id, action: "UPDATED", changes: { field: "is_active", to: next } });
      reload();
    } catch (e) { flash("error", e.message || "Erro ao alterar estado."); }
  };
  const resetPassword = async (u) => {
    try {
      await base44.auth.resetPasswordRequest(u.email);
      flash("success", `Email de redefinição enviado para ${u.email}.`);
    } catch (e) { flash("error", e.message || "Erro ao enviar email de redefinição."); }
  };
  const deleteUser = async (u) => {
    if (u.id === user.id) return;
    if (!confirm(`Eliminar o colaborador ${u.full_name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await base44.entities.User.delete(u.id);
      await logActivity({ entity_type: "USER", entity_id: u.id, action: "DELETED", changes: { email: u.email } });
      flash("success", `Colaborador ${u.full_name} eliminado.`);
      reload();
    } catch (e) { flash("error", e.message || "Erro ao eliminar colaborador."); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(sel.selected).filter((id) => id !== user.id);
    if (!ids.length) { flash("error", "Selecione colaboradores válidos (não pode eliminar-se a si próprio)."); return; }
    if (!confirm(`Eliminar ${ids.length} colaborador(es)? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.User.delete(id).catch(() => {})));
      await logActivity({ entity_type: "USER", action: "DELETED", changes: { count: ids.length } });
      sel.clear();
      flash("success", `${ids.length} colaborador(es) eliminado(s).`);
      reload();
    } catch (e) { flash("error", e.message || "Erro ao eliminar colaboradores."); } finally { setBusy(false); }
  };

  const bulkSetRole = async () => {
    const ids = Array.from(sel.selected).filter((id) => id !== user.id);
    if (!ids.length) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.User.update(id, { role: bulkRole }).catch(() => {})));
      await logActivity({ entity_type: "USER", action: "UPDATED", changes: { field: "role", to: bulkRole, count: ids.length } });
      sel.clear();
      flash("success", `Papel atualizado para ${ids.length} colaborador(es).`);
      reload();
    } catch (e) { flash("error", e.message || "Erro ao atualizar papéis."); } finally { setBusy(false); }
  };

  const bulkToggleActive = async (active) => {
    const ids = Array.from(sel.selected).filter((id) => id !== user.id);
    if (!ids.length) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => base44.entities.User.update(id, { is_active: active }).catch(() => {})));
      sel.clear();
      flash("success", `${ids.length} colaborador(es) ${active ? "ativados" : "desativados"}.`);
      reload();
    } catch (e) { flash("error", e.message || "Erro ao atualizar estado."); } finally { setBusy(false); }
  };

  if (!users) return <Loading />;
  const admin = isAdmin(user);

  return (
    <div>
      <PageHeader title="Colaboradores" subtitle="Diretório e gestão de colaboradores Acuratech" icon={Users}
        actions={admin && (
          <button onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <UserPlus className="w-4 h-4" /> Convidar
          </button>
        )} />
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar colaborador, cargo ou email…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm" />
      </div>

      {admin && (
        <div className="flex gap-1 border-b border-border mb-5">
          <button onClick={() => setTab("diretorio")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === "diretorio" ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}>Diretório</button>
          <button onClick={() => setTab("gestao")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === "gestao" ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}>Gestão de acessos</button>
        </div>
      )}

      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{msg.text}</div>}

      {tab === "diretorio" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const pres = PRESENCE_META[u.status] || PRESENCE_META.OFFLINE;
            return (
              <div key={u.id} className="acura-card p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name} size={52} status={u.status} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{u.full_name}{u.id === user.id && <span className="ml-2 text-[10px] text-muted-foreground">(eu)</span>}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABELS[u.role] || "—"}</div>
                  </div>
                </div>
                {u.job_title && <div className="text-sm text-muted-foreground mt-3">{u.job_title}</div>}
                {u.email && <div className="text-xs text-muted-foreground mt-1">{u.email}</div>}
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: pres.color }} />
                  <span className="text-muted-foreground">{u.status === "OFFLINE" ? `Visto ${relativeTime(u.last_seen_at) || "recentemente"}` : pres.label}</span>
                </div>
                {u.phone && <div className="text-xs text-muted-foreground mt-1">{u.phone}</div>}
              </div>
            );
          })}
          {!filtered.length && <EmptyState icon={Users} title="Sem colaboradores" description="Ajuste a pesquisa ou convide novos colaboradores." />}
        </div>
      )}

      {tab === "gestao" && admin && (
        <>
        <BulkBar count={sel.count} onClear={sel.clear}>
          <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button onClick={bulkSetRole} disabled={busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">Definir papel</button>
          <button onClick={() => bulkToggleActive(true)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/40 text-success text-xs font-medium hover:bg-success/10 disabled:opacity-50"><Power className="w-3.5 h-3.5" /> Ativar</button>
          <button onClick={() => bulkToggleActive(false)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/60 disabled:opacity-50"><Power className="w-3.5 h-3.5" /> Desativar</button>
          <button onClick={bulkDelete} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
        </BulkBar>
        <SectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-5 py-3 w-10"><RowCheckbox checked={filtered.length && sel.count === filtered.length} onChange={() => sel.toggleAll(filtered.map((u) => u.id))} /></th>
                  <th className="px-5 py-3 font-medium">Colaborador</th>
                  <th className="px-5 py-3 font-medium">Papel</th>
                  <th className="px-5 py-3 font-medium">Presença</th>
                  <th className="px-5 py-3 font-medium">Ativo</th>
                  <th className="px-5 py-3 font-medium">Palavra-passe</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3"><RowCheckbox checked={sel.selected.has(u.id)} onChange={() => sel.toggle(u.id)} /></td>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={u.full_name} size={36} status={u.status} /><div><div className="font-medium">{u.full_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div></div></td>
                    <td className="px-5 py-3">
                      <select value={normalizeRole(u.role)} onChange={(e) => setRole(u, e.target.value)} className="h-9 px-2 rounded-lg bg-muted/40 border border-border text-xs">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3"><Badge color={(PRESENCE_META[u.status] || PRESENCE_META.OFFLINE).color}>{(PRESENCE_META[u.status] || PRESENCE_META.OFFLINE).label}</Badge></td>
                    <td className="px-5 py-3">
                      {u.id !== user.id ? (
                        <button onClick={() => toggleActive(u)} className={`relative w-10 h-5 rounded-full transition-colors ${u.is_active === false ? "bg-muted" : "bg-success"}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${u.is_active === false ? "left-0.5" : "left-5"}`} />
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {u.id === user.id ? (
                        <button onClick={() => setPwUser(u)} className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"><KeyRound className="w-3.5 h-3.5" /> Alterar</button>
                      ) : (
                        <button onClick={() => resetPassword(u)} className="text-xs text-accent hover:underline">Redefinir</button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.id !== user.id && (
                        <button onClick={() => deleteUser(u)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <EmptyState title="Sem utilizadores" />}
          </div>
        </SectionCard>
        </>
      )}

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onDone={() => { setInviteOpen(false); reload(); }} />}
      {pwUser && <ChangePasswordModal user={pwUser} onClose={() => setPwUser(null)} onDone={() => { setPwUser(null); flash("success", "Palavra-passe alterada com sucesso."); }} />}
    </div>
  );
}

function InviteModal({ onClose, onDone }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("DEVELOPER");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      await base44.users.inviteUser(email, role);
      await logActivity({ entity_type: "USER", action: "CREATED", changes: { email, role } });
      setMsg("Convite enviado com sucesso.");
      setTimeout(onDone, 800);
    } catch (err) { setMsg(err.message || "Erro ao convidar"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md acura-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="text-lg font-semibold">Convidar colaborador</h2><button onClick={onClose} className="text-muted-foreground">✕</button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes("sucesso") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{msg}</div>}
          <div className="space-y-1.5"><label className="text-sm font-medium">Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Papel</label><select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">{saving ? "A enviar…" : "Enviar convite"}</button></div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose, onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (next.length < 6) { setMsg("A nova palavra-passe deve ter pelo menos 6 caracteres."); return; }
    if (next !== confirm) { setMsg("As palavras-passe não coincidem."); return; }
    setSaving(true);
    try {
      await base44.auth.changePassword({ userId: user.id, currentPassword: current, newPassword: next });
      setMsg("Palavra-passe alterada com sucesso.");
      setTimeout(onDone, 800);
    } catch (err) { setMsg(err.message || "Erro ao alterar palavra-passe."); } finally { setSaving(false); }
  };

  const field = "w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md acura-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="text-lg font-semibold">Alterar palavra-passe</h2><button onClick={onClose} className="text-muted-foreground">✕</button></div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes("sucesso") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{msg}</div>}
          <div className="space-y-1.5"><label className="text-sm font-medium">Palavra-passe atual *</label><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={field} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Nova palavra-passe *</label><input type="password" value={next} onChange={(e) => setNext(e.target.value)} required className={field} placeholder="Mín. 6 caracteres" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Confirmar nova palavra-passe *</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={field} /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm hover:bg-muted/60">Cancelar</button><button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">{saving ? "A guardar…" : "Guardar"}</button></div>
        </form>
      </div>
    </div>
  );
}