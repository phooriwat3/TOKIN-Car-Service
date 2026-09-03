"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, MailX, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type EmailLog = { id: string; request_no: string | null; request_type: "overtime" | "outside_company" | null; recipient_email: string; event: string; status: "sent" | "failed" | "not_configured"; created_at: string };
const typeLabel: Record<string, string> = { overtime: "OVERTIME TRANSPORT", outside_company: "OFF-SITE BUSINESS TRANSPORT" };

export function AdminEmailHistory() {
  const [history, setHistory] = useState<EmailLog[]>([]);
  const [category, setCategory] = useState<"admin" | "management">("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const supabase = createClient();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) throw new Error("Your administrator session has expired.");
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-send-test-email`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load email history.");
      setHistory(result.history ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load email history."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const refresh = () => void load(); window.addEventListener("email-history-changed", refresh); return () => window.removeEventListener("email-history-changed", refresh); }, [load]);
  const visible = history.filter((item) => category === "admin" ? item.event === "admin.test_email" : item.event === "request.manage_link_created");
  const title = category === "admin" ? "Admin email → user" : "Management email → user";
  const detail = category === "admin" ? "Manual test messages sent by an administrator." : "Automatic requester confirmation and manage-link messages.";
  return <Card className="overflow-hidden">
    <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold text-ink">Email delivery history</h2><p className="mt-0.5 text-sm text-slate-500">Complete means the email automation accepted the message.</p></div><Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Refresh</Button></div>
    <div className="flex flex-wrap gap-2 border-b bg-slate-50/60 p-3"><Button type="button" size="sm" variant={category === "admin" ? "primary" : "secondary"} onClick={() => setCategory("admin")}>Admin email → user</Button><Button type="button" size="sm" variant={category === "management" ? "primary" : "secondary"} onClick={() => setCategory("management")}>Management email → user</Button></div>
    <div className="border-b px-5 py-3"><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
    {error ? <p role="alert" className="p-5 text-sm text-danger">{error}</p> : loading ? <div className="p-8 text-center text-sm text-slate-500">Loading email history...</div> : visible.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No {category === "admin" ? "admin test" : "management"} email attempts have been recorded yet.</div> : <div className="divide-y">{visible.map((item) => { const sent = item.status === "sent"; const Icon = sent ? CheckCircle2 : item.status === "failed" ? MailX : Clock3; return <div key={item.id} className="flex gap-3 p-4 sm:px-5"><Icon size={18} className={`mt-0.5 shrink-0 ${sent ? "text-green-600" : item.status === "failed" ? "text-danger" : "text-amber-600"}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-semibold text-ink">{category === "admin" ? "Admin test email" : "Requester confirmation"}</span><span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${sent ? "bg-green-50 text-green-700" : item.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{sent ? "Complete" : item.status === "failed" ? "Not complete" : "Not configured"}</span></div><p className="mt-1 truncate text-sm text-slate-600">{item.recipient_email}{item.request_no ? ` · ${item.request_no}` : ""}</p><p className="mt-0.5 text-xs text-slate-400">{item.request_type ? typeLabel[item.request_type] : "Test email"} · {new Date(item.created_at).toLocaleString()}</p></div></div>; })}</div>}
  </Card>;
}
