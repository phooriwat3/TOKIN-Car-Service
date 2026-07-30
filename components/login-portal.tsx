"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import type { Role } from "@/lib/types";
import { landingPathForRole } from "@/lib/role-routes";
import { useApp } from "@/components/app-provider";
import { Button, Field, Input } from "@/components/ui";

type LoginPortalProps = {
  portal: "approver" | "admin";
};

export function LoginPortal({ portal }: LoginPortalProps) {
  const admin = portal === "admin";
  const expectedRole: Role = admin ? "admin" : "approver";
  const {
    configured,
    authenticated,
    loading,
    error,
    role,
    setRole,
    signIn,
    signOut,
  } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const enterDemo = (nextRole: Role) => {
    setRole(nextRole);
    window.location.assign(landingPathForRole[nextRole]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // Provider exposes the safe authentication error message.
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!configured || !authenticated || loading) return;
    if (role === expectedRole) {
      router.replace(landingPathForRole[role]);
    }
  }, [authenticated, configured, expectedRole, loading, role, router]);

  if (configured && authenticated && !loading && role !== expectedRole) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#edf1f4] p-6">
        <section className="w-full max-w-md border border-slate-300 bg-white p-8 shadow-[0_20px_60px_rgba(15,35,50,0.12)]">
          <img src="/tokin-logo.png" alt="TOKIN" className="h-9 w-auto object-contain" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {admin ? "Administration access" : "Department approval access"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-ink">
            A different account is currently signed in
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            You are signed in as <strong>{role}</strong>. Sign out before continuing
            to the {admin ? "Administration" : "Approver"} portal.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-7 w-full"
            onClick={async () => {
              await signOut();
              router.refresh();
            }}
          >
            Sign out and continue
          </Button>
          <Link
            className="mt-5 block text-center text-sm font-semibold text-gray-500 hover:text-brand"
            href="/request"
          >
            Return to employee request form
          </Link>
        </section>
      </main>
    );
  }

  if (configured && authenticated && !loading) return null;

  return (
    <main className="min-h-screen bg-[#edf1f4] p-3 sm:p-6 lg:grid lg:place-items-center">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] w-full max-w-6xl overflow-hidden border border-slate-300 bg-white shadow-[0_24px_80px_rgba(15,35,50,0.12)] sm:min-h-[calc(100vh-48px)] sm:rounded-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#102d44] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
          <div className="absolute -bottom-28 -right-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-16 -right-10 h-52 w-52 rounded-full border border-white/10" />
          <div className="relative">
            <div className="inline-flex h-12 items-center rounded-lg bg-white px-3 shadow-sm">
              <img
                src="/tokin-logo.png"
                alt="TOKIN"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Transport operations
            </p>
            <h1 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.02em]">
              One place to request, approve, and coordinate company transport.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Built for clear handoffs between employees, department approvers,
              transport administration, and drivers.
            </p>
          </div>
          <ul className="relative space-y-3 text-sm text-slate-200">
            {[
              "Track each request from submission to completion",
              "Keep approvals and assignments in one record",
              "Receive route and vehicle updates by email",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[#f0a34a]">
                  <Check size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center justify-between lg:hidden">
              <img
                src="/tokin-logo.png"
                alt="TOKIN"
                className="h-9 w-auto object-contain"
              />
              <span className="text-xs font-semibold text-gray-500">
                Transport operations
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              {admin ? "Operations access" : "Department approval access"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-ink">
              {configured
                ? admin
                  ? "Sign in to administration"
                  : "Sign in to approve requests"
                : "Preview the workspace"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {configured
                ? admin
                  ? "Use your authorized administration account to continue."
                  : "Use your registered company account to review requests for your department."
                : "The live data service is not connected. Choose a role to explore the interface with sample data."}
            </p>

            {configured ? (
              <form className="mt-8 space-y-5" onSubmit={submit}>
                <Field label="Company email">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 pl-10"
                      placeholder="name@yageo.com"
                    />
                  </div>
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 pl-10 pr-11"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      aria-label={showPass ? "Hide password" : "Show password"}
                      onClick={() => setShowPass((visible) => !visible)}
                      className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger"
                  >
                    {error}
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  disabled={submitting || loading}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{" "}
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            ) : (
              <Button
                size="lg"
                type="button"
                className="mt-8 w-full"
                onClick={() => enterDemo(expectedRole)}
              >
                {admin
                  ? "Continue as administrator"
                  : "Continue as department approver"}
              </Button>
            )}

            <div className="mt-8 space-y-3 border-t border-line pt-5 text-sm">
              {admin ? (
                <Link
                  className="block font-semibold text-brand hover:text-brand-dark"
                  href="/approver/login"
                >
                  Approver sign in
                </Link>
              ) : (
                <Link
                  className="block font-semibold text-brand hover:text-brand-dark"
                  href="/admin/login"
                >
                  Administration sign in
                </Link>
              )}
              <Link
                className="block font-medium text-gray-500 hover:text-brand"
                href="/request"
              >
                Return to employee request form
              </Link>
            </div>
            <p className="mt-10 text-xs text-gray-400">
              TOKIN Industrial · Internal transport service
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
