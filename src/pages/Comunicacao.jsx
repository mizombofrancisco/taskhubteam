import React, { useEffect, useState, useRef, useMemo } from "react";
import { Hash, Search, Send, Lock, Megaphone, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadChannels, loadChannelMessages, loadMyProjects, loadUsers, loadDirectMessages, dmConversationId } from "@/lib/data";
import { Avatar, EmptyState } from "@/components/ui/acura";
import { fmtTime, dayLabel, PRESENCE_META, relativeTime } from "@/lib/acura";

export default function Comunicacao() {
  const { user } = useAuth();
  const [mode, setMode] = useState("channels");
  const [channels, setChannels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [channelMsgs, setChannelMsgs] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [dmMsgs, setDmMsgs] = useState([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [c, p, u] = await Promise.all([loadChannels(), loadMyProjects(user.id), loadUsers()]);
      setChannels(c); setProjects(p);
      setUsers(u.filter((x) => x.id !== user.id && x.is_active !== false));
      const geral = c.find((ch) => ch.slug === "geral");
      if (geral) setActiveChannelId(geral.id);
    })();
  }, [user.id]);

  const myProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const visibleChannels = useMemo(() => channels.filter((ch) => {
    if (ch.type !== "PROJECT") return true;
    return myProjectIds.has(ch.project_id);
  }).filter((ch) => !q || ch.name.toLowerCase().includes(q.toLowerCase())), [channels, myProjectIds, q]);

  const partners = useMemo(() => users.filter((u) => !q ||
    (u.full_name || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.job_title || "").toLowerCase().includes(q.toLowerCase())), [users, q]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activePartner = users.find((u) => u.id === activePartnerId);
  const dmConvId = activePartnerId ? dmConversationId(user.id, activePartnerId) : null;

  const scrollToBottom = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  const loadChannelMsgs = async () => {
    if (!activeChannelId) return;
    setChannelMsgs(await loadChannelMessages(activeChannelId));
    scrollToBottom();
  };
  useEffect(() => {
    loadChannelMsgs();
    if (!activeChannelId) return;
    const unsub = base44.entities.ChannelMessage.subscribe((event) => {
      if (event.data?.channel_id === activeChannelId) loadChannelMsgs();
    });
    return unsub;
  }, [activeChannelId]); // eslint-disable-line

  const loadDmMsgs = async () => {
    if (!dmConvId) return;
    const msgs = await loadDirectMessages(dmConvId);
    setDmMsgs(msgs);
    const incoming = msgs.filter((m) => m.receiver_id === user.id && !m.is_read);
    if (incoming.length) {
      await Promise.all(incoming.map((m) => base44.entities.DirectMessage.update(m.id, { is_read: true, read_at: new Date().toISOString() })));
    }
    scrollToBottom();
  };
  useEffect(() => {
    loadDmMsgs();
    if (!dmConvId) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      if (event.data?.conversation_id === dmConvId) loadDmMsgs();
    });
    return unsub;
  }, [dmConvId]); // eslint-disable-line

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const content = text.trim(); setText("");
    try {
      if (mode === "channels" && activeChannelId) {
        const created = await base44.entities.ChannelMessage.create({ channel_id: activeChannelId, sender_id: user.id, content });
        setChannelMsgs((m) => [...m, created]);
      } else if (mode === "dm" && activePartnerId) {
        const created = await base44.entities.DirectMessage.create({ conversation_id: dmConvId, sender_id: user.id, receiver_id: activePartnerId, content });
        setDmMsgs((m) => [...m, created]);
        await base44.entities.Notification.create({ user_id: activePartnerId, type: "NEW_DIRECT_MESSAGE", title: "Nova mensagem", body: `${user.full_name} enviou-lhe uma mensagem.`, link: "/comunicacao" });
      }
      scrollToBottom();
    } catch (err) { setText(content); alert(err.message); }
  };

  const canPost = mode === "channels"
    ? activeChannel && (!activeChannel.is_read_only || user.role === "ADMIN" || user.role === "PROJECT_MANAGER") && !activeChannel.is_archived
    : !!activePartner;

  const groupMsgs = (msgs) => {
    const out = []; let last = null;
    msgs.forEach((m) => {
      const d = (m.created_date || new Date().toISOString()).slice(0, 10);
      if (d !== last) { out.push({ type: "day", label: dayLabel(d) }); last = d; }
      out.push({ type: "msg", data: m });
    });
    return out;
  };
  const channelGrouped = useMemo(() => groupMsgs(channelMsgs), [channelMsgs]);
  const dmGrouped = useMemo(() => groupMsgs(dmMsgs), [dmMsgs]);

  const hasActive = mode === "channels" ? !!activeChannelId : !!activePartnerId;
  const grouped = mode === "channels" ? channelGrouped : dmGrouped;
  const messages = mode === "channels" ? channelMsgs : dmMsgs;

  return (
    <div className="flex h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] -m-4 lg:-m-6 rounded-none lg:rounded-xl overflow-hidden acura-card">
      <div className={`w-full sm:w-72 border-r border-border flex flex-col bg-sidebar/40 ${hasActive ? "hidden sm:flex" : ""}`}>
        <div className="p-3 border-b border-border">
          <div className="flex gap-1 mb-3 p-1 bg-muted/40 rounded-lg">
            <button onClick={() => setMode("channels")} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "channels" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Hash className="w-4 h-4" /> Canais</button>
            <button onClick={() => setMode("dm")} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === "dm" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}><MessageSquare className="w-4 h-4" /> Diretas</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "channels" ? "Pesquisar canal…" : "Pesquisar colega…"} className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mode === "channels" ? (
            <>
              {visibleChannels.map((c) => (
                <button key={c.id} onClick={() => setActiveChannelId(c.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 text-left ${activeChannelId === c.id ? "bg-muted/60" : ""}`}>
                  {c.type === "ANNOUNCEMENTS" ? <Megaphone className="w-4 h-4 text-warning shrink-0" /> : <Hash className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm truncate">{c.name}</span>
                  {c.is_archived && <Lock className="w-3 h-3 text-muted-foreground ml-auto" />}
                </button>
              ))}
              {!visibleChannels.length && <div className="p-6 text-center text-sm text-muted-foreground">Sem canais</div>}
            </>
          ) : (
            <>
              {partners.map((u) => {
                const pres = PRESENCE_META[u.status] || PRESENCE_META.OFFLINE;
                return (
                  <button key={u.id} onClick={() => setActivePartnerId(u.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 text-left ${activePartnerId === u.id ? "bg-muted/60" : ""}`}>
                    <Avatar name={u.full_name} size={38} status={u.status} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{u.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.job_title || pres.label}</div>
                    </div>
                  </button>
                );
              })}
              {!partners.length && <div className="p-6 text-center text-sm text-muted-foreground">Sem colegas</div>}
            </>
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${hasActive ? "" : "hidden sm:flex"}`}>
        {mode === "channels" && activeChannel ? (
          <>
            <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
              <button onClick={() => setActiveChannelId(null)} className="sm:hidden text-muted-foreground">←</button>
              <Hash className="w-5 h-5 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-semibold truncate">{activeChannel.name}</div>
                {activeChannel.topic && <div className="text-xs text-muted-foreground truncate">{activeChannel.topic}</div>}
              </div>
              {activeChannel.is_archived && <span className="ml-auto text-xs text-muted-foreground">Arquivado</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-1">
              {channelGrouped.map((g, i) => g.type === "day" ? (
                <div key={i} className="flex items-center justify-center my-3"><span className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">{g.label}</span></div>
              ) : (
                <ChannelMsg key={g.data.id} msg={g.data} users={users} mine={g.data.sender_id === user.id} />
              ))}
              {!channelMsgs.length && <EmptyState icon={Hash} title="Sem mensagens" description="Seja o primeiro a escrever neste canal." />}
              <div ref={endRef} />
            </div>
          </>
        ) : mode === "dm" && activePartner ? (
          <>
            <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
              <button onClick={() => setActivePartnerId(null)} className="sm:hidden text-muted-foreground">←</button>
              <Avatar name={activePartner.full_name} size={40} status={activePartner.status} />
              <div className="min-w-0">
                <div className="font-semibold">{activePartner.full_name}</div>
                <div className="text-xs text-muted-foreground">{activePartner.status === "OFFLINE" ? `Visto ${relativeTime(activePartner.last_seen_at) || "há instantes"}` : PRESENCE_META[activePartner.status]?.label}</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-1">
              {dmGrouped.map((g, i) => g.type === "day" ? (
                <div key={i} className="flex items-center justify-center my-3"><span className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">{g.label}</span></div>
              ) : (
                <MsgBubble key={g.data.id} msg={g.data} mine={g.data.sender_id === user.id} />
              ))}
              {!dmMsgs.length && <EmptyState icon={MessageSquare} title="Sem mensagens" description="Inicie a conversa com o seu colega." />}
              <div ref={endRef} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><EmptyState icon={mode === "channels" ? Hash : MessageSquare} title={mode === "channels" ? "Selecione um canal" : "Selecione um colega"} description={mode === "channels" ? "Escolha um canal na lista para ver a conversa." : "Escolha um colega para iniciar uma conversa direta."} /></div>
        )}

        {(mode === "channels" ? activeChannel : activePartner) ? (
          canPost ? (
            <form onSubmit={send} className="p-4 border-t border-border flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={mode === "channels" && activeChannel ? `Escrever em #${activeChannel.name}…` : "Escrever mensagem…"} className="flex-1 h-11 px-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              <button type="submit" className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"><Send className="w-4 h-4" /></button>
            </form>
          ) : (
            <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">Canal só de leitura</div>
          )
        ) : null}
      </div>
    </div>
  );
}

function ChannelMsg({ msg, users, mine }) {
  if (msg.is_system) {
    return <div className="flex items-center justify-center my-2"><span className="text-[11px] text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">{msg.content}</span></div>;
  }
  const u = users.find((x) => x.id === msg.sender_id);
  return (
    <div className="flex gap-3 py-1.5">
      <Avatar name={u?.full_name} size={38} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2"><span className="text-sm font-semibold">{u?.full_name || "—"}</span><span className="text-[10px] text-muted-foreground">{fmtTime(msg.created_date)}</span></div>
        <div className="text-sm mt-0.5 whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  );
}

function MsgBubble({ msg, mine }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted/60 rounded-bl-md"}`}>
        <div>{msg.content}</div>
        <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmtTime(msg.created_date)}</div>
      </div>
    </div>
  );
}