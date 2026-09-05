import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import Brand from "@/components/Brand";
import { safeReturnTo } from "@/lib/authReturnTo";
import { homeRouteForRole } from "@/lib/acura";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // role-based redirect
      let dest = returnTo && returnTo !== "/" ? returnTo : "/";
      try {
        const me = await base44.auth.me();
        if (dest === "/") dest = homeRouteForRole(me.role);
      } catch {}
      window.location.href = dest;
    } catch (err) {
      setError("Credenciais inválidas. Verifique o email e a palavra-passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[44%] acura-gradient relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #5FD3FA 0, transparent 40%), radial-gradient(circle at 80% 70%, #0033A0 0, transparent 50%)" }} />
        <div className="relative">
          <Brand size={40} withWordmark light />
        </div>
        <div className="relative text-white">
          <h1 className="text-4xl font-display font-extrabold leading-tight mb-4">Plataforma de gestão<br />de projetos & colaboração</h1>
          <p className="text-white/80 text-lg max-w-md">Projetos, tarefas, timesheets e comunicação corporativa num só lugar — pensado para equipas hospitalares e de engenharia.</p>
          <div className="mt-8 flex items-center gap-6 text-white/70 text-sm">
            <div><div className="text-2xl font-bold text-white">Kanban</div><div>arrastar & largar</div></div>
            <div><div className="text-2xl font-bold text-white">Timesheets</div><div>com aprovação</div></div>
            <div><div className="text-2xl font-bold text-white">Partners</div><div>chat em tempo real</div></div>
          </div>
        </div>
        <div className="relative text-white/50 text-xs">Acuratech — Soluções Hospitalares, Lda</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><Brand size={44} withWordmark /></div>
          <h2 className="text-2xl font-display font-bold mb-1">Bem-vindo de volta</h2>
          <p className="text-muted-foreground text-sm mb-8">Inicie sessão na sua conta Acuratech Hub</p>

          {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" autoFocus placeholder="nome@acuratech.ao" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-12 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Palavra-passe</label>
                <Link to="/forgot-password" className="text-xs text-accent hover:underline">Esqueceu-se?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-12 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> A entrar…</> : <>Iniciar sessão <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Acesso restrito a colaboradores Acuratech. Contacte o administrador para obter um convite.
          </p>
        </div>
      </div>
    </div>
  );
}