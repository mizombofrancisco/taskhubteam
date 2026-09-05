import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUS = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "PROBATION", label: "Em experiência" },
  { value: "ON_LEAVE", label: "Licença" },
  { value: "SUSPENDED", label: "Suspenso" },
  { value: "TERMINATED", label: "Desligado" },
];
const CONTRACT = [
  { value: "INDETERMINATE", label: "Contrato indeterminado" },
  { value: "DETERMINATE", label: "Contrato a termo" },
  { value: "PROBATION", label: "Período de experiência" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INTERNSHIP", label: "Estágio" },
  { value: "TRAINEE", label: "Trainee" },
];

export default function EmployeeHRForm({ users, initial, currentUser, onSaved, onCancel }) {
  const [form, setForm] = useState({
    user_id: "",
    admission_date: new Date().toISOString().slice(0, 10),
    termination_date: "",
    employment_status: "ACTIVE",
    contract_type: "INDETERMINATE",
    department: "",
    position: "",
    base_salary: "",
    work_start: "09:00",
    work_end: "18:00",
    lunch_start: "13:00",
    lunch_end: "14:00",
    weekly_hours: 40,
    vacation_days_entitlement: 22,
    vacation_days_used: 0,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.user_id || !form.admission_date) {
      setError("Colaborador e data de admissão são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        base_salary: form.base_salary ? Number(form.base_salary) : null,
        weekly_hours: Number(form.weekly_hours) || 0,
        vacation_days_entitlement: Number(form.vacation_days_entitlement) || 0,
        vacation_days_used: Number(form.vacation_days_used) || 0,
      };
      let saved;
      if (initial?.id) {
        saved = await base44.entities.EmployeeHR.update(initial.id, payload);
      } else {
        saved = await base44.entities.EmployeeHR.create(payload);
        await base44.entities.ActivityLog.create({
          user_id: currentUser.id,
          entity_type: "EMPLOYEE_HR",
          entity_id: saved.id,
          action: "CREATED",
          changes: { user_id: form.user_id },
        });
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "Erro ao guardar perfil RH");
    } finally {
      setSaving(false);
    }
  };

  const field = "h-11 bg-muted/40 border-border";

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Colaborador *</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.user_id} onChange={(e) => set("user_id", e.target.value)} required disabled={!!initial?.id}>
            <option value="">Selecionar…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Data de admissão *</Label>
          <Input type="date" className={field} value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.employment_status} onChange={(e) => set("employment_status", e.target.value)}>
            {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de contrato</Label>
          <select className={`${field} w-full rounded-lg px-3 text-sm`} value={form.contract_type} onChange={(e) => set("contract_type", e.target.value)}>
            {CONTRACT.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Departamento</Label>
          <Input className={field} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Tecnologia" />
        </div>
        <div className="space-y-1.5">
          <Label>Cargo</Label>
          <Input className={field} value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Developer Sénior" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label>Início trabalho</Label>
          <Input type="time" className={field} value={form.work_start} onChange={(e) => set("work_start", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim trabalho</Label>
          <Input type="time" className={field} value={form.work_end} onChange={(e) => set("work_end", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Início almoço</Label>
          <Input type="time" className={field} value={form.lunch_start} onChange={(e) => set("lunch_start", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim almoço</Label>
          <Input type="time" className={field} value={form.lunch_end} onChange={(e) => set("lunch_end", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label>Horas semanais</Label>
          <Input type="number" className={field} value={form.weekly_hours} onChange={(e) => set("weekly_hours", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Salário base</Label>
          <Input type="number" className={field} value={form.base_salary} onChange={(e) => set("base_salary", e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Dias férias (ano)</Label>
          <Input type="number" className={field} value={form.vacation_days_entitlement} onChange={(e) => set("vacation_days_entitlement", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Dias gozados</Label>
          <Input type="number" className={field} value={form.vacation_days_used} onChange={(e) => set("vacation_days_used", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Contacto emergência</Label>
          <Input className={field} value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} placeholder="Nome" />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone emergência</Label>
          <Input className={field} value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} placeholder="+244 …" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Data de desligamento (se aplicável)</Label>
        <Input type="date" className={field} value={form.termination_date} onChange={(e) => set("termination_date", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea className="bg-muted/40 border-border" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? "A guardar…" : initial?.id ? "Guardar" : "Criar perfil"}</Button>
      </div>
    </form>
  );
}