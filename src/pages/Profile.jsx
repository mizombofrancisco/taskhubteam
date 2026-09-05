import React, { useState, useEffect } from "react";
import { UserCircle, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { PageHeader, SectionCard, Avatar } from "@/components/ui/acura";
import { ROLE_LABELS, PRESENCE_META } from "@/lib/acura";

export default function Profile() {
  const { user, checkUserAuth } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user) setForm({ job_title: user.job_title || "", phone: user.phone || "", avatar_url: user.avatar_url || "", daily_capacity_hours: user.daily_capacity_hours || 8, status: user.status || "ONLINE", status_message: user.status_message || "" });
  }, [user]);

  if (!form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      await base44.auth.updateMe(form);
      await checkUserAuth();
      setMsg("Perfil atualizado com sucesso.");
    } catch (err) { setMsg(err.message || "Erro ao guardar"); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Perfil" subtitle="Dados pessoais, estado e preferências" icon={UserCircle} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Avatar e estado" className="lg:col-span-1">
          <div className="p-5 flex flex-col items-center text-center">
            <Avatar name={user.full_name} size={88} src={form.avatar_url} status={form.status} />
            <div className="font-semibold mt-3">{user.full_name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
            <div className="text-xs text-accent mt-1">{ROLE_LABELS[user.role]}</div>
            <div className="mt-4 w-full">
              <label className="text-xs text-muted-foreground block mb-1.5">Estado de presença</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(PRESENCE_META).map(([k, m]) => (
                  <button key={k} type="button" onClick={() => set("status", k)} className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs ${form.status === k ? "border-accent bg-accent/10" : "border-border"}`}>
                    <span className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Dados pessoais" className="lg:col-span-2">
          <form onSubmit={save} className="p-5 space-y-4">
            {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes("sucesso") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{msg}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-sm font-medium">Cargo</label><input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Telefone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium">URL do avatar</label><input value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://…" className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Mensagem de estado</label><input value={form.status_message} onChange={(e) => set("status_message", e.target.value)} placeholder="Ex.: Em reunião até às 15h" className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Capacidade diária (horas)</label><input type="number" step="0.5" min="1" max="24" value={form.daily_capacity_hours} onChange={(e) => set("daily_capacity_hours", Number(e.target.value))} className="w-full h-11 px-3 rounded-lg bg-muted/40 border border-border text-sm" /></div>
            <div className="flex justify-end pt-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Save className="w-4 h-4" /> {saving ? "A guardar…" : "Guardar"}</button></div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}