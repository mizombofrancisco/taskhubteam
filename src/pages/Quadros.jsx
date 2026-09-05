import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KanbanSquare, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { PageHeader, EmptyState, Loading } from "@/components/ui/acura";
import { fmtDate, isAdmin } from "@/lib/acura";
import { loadProjects, loadMyProjects } from "@/lib/data";
import BoardForm from "@/components/quadros/BoardForm";

export default function Quadros() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editBoard, setEditBoard] = useState(null);

  const admin = isAdmin(user);

  const reload = async () => {
    const [b, allItems, p] = await Promise.all([
      base44.entities.Board.list("-created_date", 200),
      base44.entities.BoardItem.list("order_index", 1000),
      admin ? loadProjects() : loadMyProjects(user.id),
    ]);
    setBoards(b.filter((x) => !x.is_archived));
    setItems(allItems);
    setProjects(p);
  };
  useEffect(() => { reload(); }, [user.id, admin]);

  const filtered = useMemo(() => {
    if (!boards) return [];
    return boards.filter((b) => {
      if (projectFilter !== "ALL" && b.project_id !== projectFilter) return false;
      if (q && !`${b.name} ${b.description || ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [boards, q, projectFilter]);

  const counts = (boardId) => {
    const list = items.filter((i) => i.board_id === boardId);
    return {
      total: list.length,
      todo: list.filter((i) => i.stage === "TO_DO").length,
      doing: list.filter((i) => i.stage === "IN_PROGRESS").length,
      done: list.filter((i) => i.stage === "DONE").length,
    };
  };

  const handleDelete = async (b) => {
    if (!confirm(`Eliminar o quadro "${b.name}" e todos os seus cartões?`)) return;
    try {
      await base44.entities.BoardItem.deleteMany({ board_id: b.id }).catch(() => {});
      await base44.entities.Board.delete(b.id);
      reload();
    } catch (e) { alert(e.message || "Erro ao eliminar quadro."); }
  };

  if (!boards) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Quadros de Colaboração"
        subtitle="Organize o trabalho da equipa em quadros Kanban"
        icon={KanbanSquare}
        actions={
          <button onClick={() => { setEditBoard(null); setShowCreate(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo Quadro
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar quadro…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </div>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm">
          <option value="ALL">Todos os projetos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState icon={KanbanSquare} title="Sem quadros" description="Crie o primeiro quadro de colaboração da equipa." action={<button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"><Plus className="w-4 h-4" /> Novo Quadro</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const c = counts(b.id);
            const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
            return (
              <div key={b.id} className="acura-card p-5 hover:acura-glow transition-shadow group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Link to={`/quadros/${b.id}`} className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-1.5 h-9 rounded-full shrink-0" style={{ background: b.color || "#0033A0" }} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate group-hover:text-accent transition-colors">{b.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{projects.find((p) => p.id === b.project_id)?.name || "Sem projeto"}{b.description ? ` · ${b.description}` : ""}</div>
                    </div>
                  </Link>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setEditBoard(b); setShowCreate(true); }} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(b)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <Link to={`/quadros/${b.id}`}>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color || "#0033A0" }} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.todo} To-Do</span>
                    <span>· {c.doing} Em Curso</span>
                    <span>· {c.done} Concluído</span>
                    <span className="ml-auto font-medium text-foreground">{pct}%</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowCreate(false); setEditBoard(null); }}>
          <div className="w-full max-w-lg acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">{editBoard ? "Editar Quadro" : "Novo Quadro"}</h2>
              <button onClick={() => { setShowCreate(false); setEditBoard(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <BoardForm initial={editBoard} currentUser={user} projects={projects} onCancel={() => { setShowCreate(false); setEditBoard(null); }} onSaved={(b) => { setShowCreate(false); setEditBoard(null); if (!editBoard) navigate(`/quadros/${b.id}`); else reload(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}