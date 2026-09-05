import React, { useState, useCallback } from "react";
import { X } from "lucide-react";

// Hook: manages a Set of selected ids
export function useSelection() {
  const [selected, setSelected] = useState(new Set());
  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback((ids) => {
    setSelected((prev) => {
      if (ids.length && prev.size === ids.length && ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, toggle, toggleAll, clear, count: selected.size };
}

// Sticky action bar shown when one or more rows are selected
export function BulkBar({ count, onClear, children }) {
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 mb-3 rounded-lg border border-accent/40 bg-accent/10">
      <span className="text-sm font-medium">{count} selecionado(s)</span>
      <div className="flex items-center gap-2 ml-auto">
        {children}
        <button onClick={onClear} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60" title="Limpar seleção">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Checkbox that stops click propagation so it never triggers row navigation
export function RowCheckbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 rounded border-border accent-accent cursor-pointer shrink-0"
    />
  );
}