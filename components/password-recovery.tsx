"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { Button, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

function RecoveryShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-950">
      <div className="absolute inset-0 bg-[url('/images/tokin-thailand.jpg')] bg-cover bg-center" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/95 via-brand-900/82 to-brand-700/60" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" aria-hidden="true" />
      <div className="relative grid min-h-screen place-items-center p-4 sm:p-6">
        {children}
      </div>
    </main>
  );
}

export function PasswordRecovery() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Recovery service is not configured.");
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/recovery` },
      );
      if (recoveryError) throw recoveryError;
      setSent(true);
    } catch {
      setError("Unable to start password recovery. Contact the system administrator if the problem continues.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RecoveryShell>
      <section className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-7 shadow-2xl backdrop-blur sm:p-9">
        <BrandLogo />
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-brand">Privileged account recovery</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Reset your password</h1>
        {sent ? (
          <div className="mt-6">
            <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
              <ShieldCheck className="mt-0.5 shrink-0" size={18} />
              <span>If an authorized account exists for that address, a secure recovery link has been sent.</span>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <p className="text-sm leading-6 text-slate-600">Use the company email assigned to your administrator, finance, executive, or auditor account.</p>
            <Field label="Company email">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" placeholder="name@yageo.com" />
              </div>
            </Field>
            {error && <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-3 text-sm text-danger">{error}</div>}
            <Button size="lg" className="w-full" disabled={submitting}>{submitting ? "Sending..." : "Send recovery link"}</Button>
          </form>
        )}
        <Link href="/admin/login" className="mt-6 block text-center text-sm font-semibold text-brand hover:text-brand-dark">Return to sign in</Link>
      </section>
    </RecoveryShell>
  );
}

export function PasswordUpdate() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Use at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Recovery service is not configured.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setComplete(true);
    } catch {
      setError("The recovery session is invalid or expired. Request a new recovery link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RecoveryShell>
      <section className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-7 shadow-2xl backdrop-blur sm:p-9">
        <BrandLogo />
        <h1 className="mt-8 text-2xl font-bold text-ink">Choose a new password</h1>
        {complete ? (
          <div className="mt-6">
            <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">Your password has been updated.</p>
            <Link href="/admin/login" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-white">Continue to sign in</Link>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <Field label="New password"><Input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            <Field label="Confirm new password"><Input type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
            {error && <div role="alert" className="rounded-lg border border-danger/20 bg-danger-light p-3 text-sm text-danger">{error}</div>}
            <Button size="lg" className="w-full" disabled={submitting}>{submitting ? "Updating..." : "Update password"}</Button>
          </form>
        )}
      </section>
    </RecoveryShell>
  );
}
