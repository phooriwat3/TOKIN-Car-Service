"use client";

import { useState } from "react";
import { ChevronDown, Mail, Send } from "lucide-react";
import { Button, Card, Field, Select } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { CompanyUserField } from "@/components/company-user-field";

export function AdminEmailTestPanel() {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [requestType, setRequestType] = useState<"overtime" | "outside_company">("overtime");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const send = async () => {
    setSending(true); setMessage(""); setError("");
    try {
      const supabase = createClient();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) throw new Error("Your administrator session has expired.");
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-send-test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipientEmail, requestType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send test email.");
      setMessage(`Test email sent to ${recipientEmail}.`);
      window.dispatchEvent(new Event("email-history-changed"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to send test email."); }
    finally { setSending(false); }
  };
  return <Card className="overflow-hidden">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50">
      <span className="flex items-center gap-3"><span className="rounded-lg bg-slate-100 p-2 text-slate-700"><Mail size={18}/></span><span><span className="block font-semibold text-ink">Advanced</span><span className="mt-0.5 block text-sm text-slate-500">Send a transport-form test email</span></span></span><ChevronDown size={18} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}/>
    </button>
    {open && <div className="border-t bg-slate-50/60 p-5"><div className="max-w-2xl"><p className="text-sm leading-6 text-slate-600">This sends a clearly marked test email only. It does not create a booking, notify an approver, or affect operations.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><CompanyUserField inputId="test-email-recipient" label="Send test email to" required value={recipientEmail} onChange={setRecipientEmail} placeholder="Search employee name or email..." useTransportDirectory onSelectUser={(person) => setRecipientEmail(person.mail)} /><Field label="Transport form"><Select value={requestType} onChange={(event) => setRequestType(event.target.value as "overtime" | "outside_company")}><option value="overtime">OVERTIME TRANSPORT</option><option value="outside_company">OFF-SITE BUSINESS TRANSPORT</option></Select></Field></div><Button type="button" className="mt-4" disabled={sending || !recipientEmail.trim()} onClick={() => void send()}><Send size={16}/>{sending ? "Sending test email..." : "Send test email"}</Button>{message && <p className="mt-3 text-sm font-medium text-green-700">{message}</p>}{error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}</div></div>}
  </Card>;
}
