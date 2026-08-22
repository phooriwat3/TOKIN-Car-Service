"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import type { Role } from "@/lib/types";
import { landingPathForRole } from "@/lib/role-routes";
import { useApp } from "@/components/app-provider";
import { Button, Field, Input } from "@/components/ui";
import { BrandLogo } from "@/components/brand";

const loginNotes = [
  "Track each request from submission to completion",
  "Keep approvals and assignments in one record",
  "Receive route and vehicle updates by email",
];

export function LoginPortal() {
  const expectedRole: Role = "admin";
  const {
    configured,
    authenticated,
    loading,
    error,
    role,
    setRole,
    signIn,
    signInWithMicrosoft,
    signOut,
  } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [microsoftSubmitting, setMicrosoftSubmitting] = useState(false);

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

  const submitMicrosoft = async () => {
    setMicrosoftSubmitting(true);
    try {
      await signInWithMicrosoft("/admin/bookings");
    } catch {
      setMicrosoftSubmitting(false);
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
        <section className="w-full max-w-md border border-slate-300 bg-white p-8 shadow-lg">
          <BrandLogo />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Administration access
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            A different account is currently signed in
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            You are signed in as <strong>{role}</strong>. Sign out before continuing
            to the Administration portal.
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
    <main className="grid min-h-screen place-items-center bg-[#edf1f4] p-4 sm:p-6">
      <section className="w-full max-w-md border border-slate-300 bg-white px-6 py-9 shadow-lg sm:rounded-lg sm:px-10">
        <div className="mb-9 flex items-center justify-between gap-4">
          <BrandLogo />
          <span className="text-xs font-semibold text-gray-500">
            Transport operations
          </span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Operations access
        </p>
        <h2 className="mt-2 text-3xl font-bold text-ink">
          {configured ? "Sign in to administration" : "Preview the workspace"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {configured
            ? "Use your authorized administration account to continue."
            : "The live data service is not connected. Preview the administration workspace with sample data."}
        </p>

        {configured ? (
          <div className="mt-8">
            <form className="space-y-5" onSubmit={submit}>
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
              disabled={submitting || microsoftSubmitting || loading}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            </form>
          </div>
        ) : (
          <Button
            size="lg"
            type="button"
            className="mt-8 w-full"
            onClick={() => enterDemo(expectedRole)}
          >
            Continue as administrator
          </Button>
        )}

        <div className="mt-8 space-y-4 border-t border-line pt-5 text-sm">
          <Link
            className="block font-medium text-gray-500 hover:text-brand"
            href="/request"
          >
            Return to employee request form
          </Link>
          <ul className="space-y-2 text-xs leading-5 text-slate-500">
            {loginNotes.map((item) => (
              <li key={item} className="flex gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-xs text-gray-400">
          TOKIN Industrial - Internal transport service
        </p>
      </section>
    </main>
  );
}