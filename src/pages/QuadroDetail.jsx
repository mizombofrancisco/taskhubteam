import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { PageHeader, Loading, EmptyState, Avatar } from "@/components/ui/acura";
import { fmtDate, isAdmin } from "@/lib/acura";
import { loadProjects, loadMyProjects } from "@/lib/data";
import BoardForm from "@/components/quadros/BoardForm";
import BoardItemForm, { BOARD_STAGES, BOARD_STAGE_LABELS, BOARD_STAGE_COLORS } from "@/components/quadros/BoardItemForm";
import BoardCard from "@/components/quadros/BoardCard";

export default function QuadroDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [itemForm, setItemForm] = useState(null); // { mode: 'create'|'edit', stage, item }

  const admin = isAdmin(user);

  const reload = async () => {
    const [b, allItems, u, p] = await Promise.all([
      base44.entities.Board.get(id).catch(() => null),
      base44.entities.BoardItem.filter({ board_id: id }, "order_index", 500),
      base44.entities.User.list("-created_date", 200),
      admin ? loadProjects() : loadMyProjects(user.id),
    ]);
    setBoard(b);
    setItems(allItems);
    setUsers(u);
    setProjects(p);
  };
  useEffect(() => { reload(); }, [id]);

  const canManage = board && (isAdmin(user) || board.owner_id === user.id);
  const project = projects.find((p) => p.id === board?.project_id);

  const visible = useMemo(() => {
    return items.filter((i) => !q || i.title.toLowerCase().includes(q.toLowerCase()));
  }, [items, q]);

  const byStage = (stage) => visible.filter((i) => i.stage === stage).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const item = items.find((i) => i.id === draggableId);
    if (!item) return;
    const fromStage = source.droppableId;
    const toStage = destination.droppableId;
    const updates = { stage: toStage, order_index: destination.index };
    const destList = byStage(toStage);
    const reordered = [...destList];
    reordered.splice(destination.index, 0, { ...item, ...updates });
    try {
      await base44.entities.BoardItem.update(item.id, updates);
      reordered.forEach((it, i) => {
        if (it.id !== item.id && (it.order_index || 0) !== i) {
          base44.entities.BoardItem.update(it.id, { order_index: i });
        }
      });
      reload();
    } catch (e) { alert("Não foi possível mover o cartão."); }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Eliminar o cartão "${item.title}"?`)) return;
    try { await base44.entities.BoardItem.delete(item.id); reload(); } catch (e) { alert(e.message || "Erro ao eliminar."); }
  };

  const handleDeleteBoard = async () => {
    if (!confirm(`Eliminar o quadro "${board.name}" e todos os seus cartões?`)) return;
    try {
      await base44.entities.BoardItem.deleteMany({ board_id: board.id }).catch(() => {});
      await base44.entities.Board.delete(board.id);
      navigate("/quadros");
    } catch (e) { alert(e.message || "Erro ao eliminar quadro."); }
  };

  if (!board) return <Loading />;
  if (board === null && !items.length) {
    // board may be null from failed get but items empty; handle not found only when truly missing
  }
  if (board === null) return <EmptyState title="Quadro não encontrado" action={<Link to="/quadros" className="text-accent">Voltar</Link>} />;

  return (
    <div>
      <Link to="/quadros" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> Quadros
      </Link>

      <PageHeader
        title={board.name}
        subtitle={
          <span>
            {project && <Link to={`/projects/${project.id}`} className="text-accent hover:underline">{project.name}</Link>}
            {project && (board.description ? " · " : "")}{board.description}
            {!project && (board.description || "Quadro de colaboração")}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <div className="flex gap-1">
                <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/60"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                <button onClick={handleDeleteBoard} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
              </div>
            )}
          </div>
        }
      />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar cartões…" className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BOARD_STAGES.map((stage) => {
            const list = byStage(stage);
            return (
              <div key={stage} className="flex flex-col rounded-xl bg-muted/30 border border-border min-h-[300px]">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: BOARD_STAGE_COLORS[stage] }} />
                    <span className="text-sm font-semibold">{BOARD_STAGE_LABELS[stage]}</span>
                    <span className="text-xs text-muted-foreground">{list.length}</span>
                  </div>
                  <button onClick={() => setItemForm({ mode: "create", stage, item: null })} className="p-1 rounded text-muted-foreground hover:text-accent hover:bg-accent/10" title="Adicionar cartão">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? "bg-accent/5" : ""}`}>
                      {list.map((item, idx) => (
                        <Draggable key={item.id} draggableId={item.id} index={idx}>
                          {(p) => (
                            <BoardCard
                              item={item}
                              users={users}
                              draggableProps={p}
                              dragHandleProps={p.dragHandleProps}
                              onClick={() => setItemForm({ mode: "edit", stage: item.stage, item })}
                              onEdit={(it) => setItemForm({ mode: "edit", stage: it.stage, item: it })}
                              onDelete={handleDeleteItem}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!list.length && <div className="text-center text-xs text-muted-foreground py-6">Sem cartões</div>}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-lg acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Editar Quadro</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <BoardForm initial={board} currentUser={user} projects={projects} onCancel={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); reload(); }} />
            </div>
          </div>
        </div>
      )}

      {itemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setItemForm(null)}>
          <div className="w-full max-w-lg acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">{itemForm.mode === "edit" ? "Editar Cartão" : "Novo Cartão"}</h2>
              <button onClick={() => setItemForm(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <BoardItemForm
                boardId={id}
                users={users}
                initial={itemForm.mode === "edit" ? itemForm.item : { stage: itemForm.stage }}
                onCancel={() => setItemForm(null)}
                onSaved={() => { setItemForm(null); reload(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}