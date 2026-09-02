"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: string; employee_id: string; full_name: string; email: string;
  department: string; job_title: string; is_active: boolean;
};
const blank = { id: "", employeeId: "", fullName: "", email: "", department: "", jobTitle: "", isActive: true };

export function EmployeeDirectoryAdmin() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const request = async (method: string, body?: unknown) => {
    const supabase = createClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session) throw new Error("Your administrator session has expired.");
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-employee-directory`, {
      method,
      headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${session.access_token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to update directory.");
    return result;
  };
  const load = async () => {
    try { setEmployees((await request("GET")).employees); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load directory."); }
  };
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await request("POST", form); await load(); setForm(blank);
      setMessage("Employee directory saved. It is available in the public request form immediately.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save employee."); }
    finally { setSaving(false); }
  };
  const edit = (employee: Employee) => setForm({ id: employee.id, employeeId: employee.employee_id, fullName: employee.full_name, email: employee.email, department: employee.department, jobTitle: employee.job_title, isActive: employee.is_active });
  const remove = async (employee: Employee) => {
    if (!window.confirm(`Remove ${employee.full_name} from the transport directory?`)) return;
    try { await request("DELETE", { id: employee.id }); await load(); if (form.id === employee.id) setForm(blank); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove employee."); }
  };
  const visible = employees.filter((employee) => `${employee.full_name} ${employee.employee_id} ${employee.department}`.toLowerCase().includes(query.toLowerCase()));
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="space-y-6">
    <Card className="p-5 sm:p-6"><div className="flex gap-3"><span className="rounded-lg bg-brand-light p-2 text-brand"><Users size={20} /></span><div><h2 className="font-semibold text-ink">Employee transport directory</h2><p className="mt-1 text-sm leading-6 text-slate-600">Admin-managed names for the public request form. This does not require Microsoft 365 access.</p></div></div>
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Employee ID"><Input required value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} /></Field>
        <Field label="English name"><Input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="First Last" /></Field>
        <Field label="Company email"><Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@yageo.com" /></Field>
        <Field label="Department"><Input required value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="IT, HR, PE..." /></Field>
        <Field label="Job title (optional)"><Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></Field>
        <Field label="Directory status"><Select value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}><option value="active">Active — appears in search</option><option value="inactive">Inactive — hidden from search</option></Select></Field>
        <div className="sm:col-span-2 flex flex-wrap gap-2"><Button disabled={saving}>{form.id ? "Save employee" : <><Plus size={16} /> Add employee</>}</Button>{form.id && <Button type="button" variant="secondary" onClick={() => setForm(blank)}>Cancel edit</Button>}</div>
      </form>
      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </Card>
    <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-ink">Directory records</h2><p className="text-sm text-slate-500">{employees.length} employee{employees.length === 1 ? "" : "s"}</p></div><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 sm:w-72" placeholder="Search name or ID" /></div></div>
      <div className="divide-y">{visible.map((employee) => <div key={employee.id} className="flex items-center gap-4 p-4 sm:px-5"><div className="min-w-0 flex-1"><p className="font-semibold text-ink">{employee.full_name} {!employee.is_active && <span className="ml-1 text-xs font-medium text-slate-400">Inactive</span>}</p><p className="mt-0.5 truncate text-sm text-slate-500">{employee.employee_id} · {employee.department} · {employee.email}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => edit(employee)} aria-label={`Edit ${employee.full_name}`}><Pencil size={15}/></Button><Button type="button" variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => void remove(employee)} aria-label={`Remove ${employee.full_name}`}><Trash2 size={15}/></Button></div>)}{visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No employees found. Add the first employee above.</p>}</div>
    </Card>
  </div>;
}
