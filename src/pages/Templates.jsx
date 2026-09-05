import React, { useEffect, useState } from "react";
import { LayoutTemplate, Plus, Pencil, Trash2, Copy, KanbanSquare, ListTodo } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PageHeader, EmptyState, Loading, SectionCard, Badge } from "@/components/ui/acura";
import { can } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";
import TemplateForm from "@/components/templates/TemplateForm";

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);

  const canManage = can(user, "templates", "manage");

  const reload = async () => {
    try {
      const list = await base44.entities.ProjectTemplate.list("-created_date", 200);
      setTemplates(list);
    } catch (e) { console.error(e); setTemplates([]); }
  };
  useEffect(() => { reload(); }, []);

  const handleDelete = async (t) => {
    if (!confirm(`Eliminar o template "${t.name}"?`)) return;
    try { await base44.entities.ProjectTemplate.delete(t.id); reload(); }
    catch (e) { alert(e.message || "Erro ao eliminar."); }
  };

  if (!templates) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Templates de Projeto"
        subtitle="Estruturas reutilizáveis de quadros e tarefas padrão"
        icon={LayoutTemplate}
        actions={canManage && (
          <button onClick={() => { setEdit(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo Template
          </button>
        )}
      />

      {!templates.length ? (
        <EmptyState icon={LayoutTemplate} title="Sem templates" description="Crie templates para gerar quadros e tarefas padrão ao iniciar um projeto." action={canManage && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"><Plus className="w-4 h-4" /> Novo Template</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="acura-card p-5 hover:acura-glow transition-shadow group">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-9 rounded-full shrink-0" style={{ background: t.color || "#0033A0" }} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.methodology}</div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setEdit(t); setShowForm(true); }} className="p-1.5 rounded-lg text-accent hover:bg-accent/10" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              {t.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>}
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground"><KanbanSquare className="w-3.5 h-3.5" /> {(t.boards || []).length} quadros</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground"><ListTodo className="w-3.5 h-3.5" /> {(t.tasks || []).length} tarefas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowForm(false); setEdit(null); }}>
          <div className="w-full max-w-2xl acura-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">{edit ? "Editar Template" : "Novo Template"}</h2>
              <button onClick={() => { setShowForm(false); setEdit(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6">
              <TemplateForm initial={edit} onCancel={() => { setShowForm(false); setEdit(null); }} onSaved={() => { setShowForm(false); setEdit(null); reload(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}