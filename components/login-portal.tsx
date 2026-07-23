'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CarFront, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import type { Role } from '@/lib/types';
import { landingPathForRole } from '@/lib/role-routes';
import { useApp } from '@/components/app-provider';
import { Button, Field, Input } from '@/components/ui';

export function LoginPortal({ admin = false }: { admin?: boolean }) {
  const { configured, authenticated, loading, error, role, setRole, signIn } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    router.replace(landingPathForRole[role]);
  }, [authenticated, configured, loading, role, router]);

  if (configured && authenticated && !loading) return null;

  return (
    <main
      className="relative grid min-h-screen place-items-center p-5 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #001F3F 0%, #00498E 50%, #0074D9 100%)' }}
    >
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] opacity-20"
        style={{ background: 'radial-gradient(circle, #0074D9, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] opacity-15"
        style={{ background: 'radial-gradient(circle, #00C6FF, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="mb-8 flex flex-col items-center gap-3 text-white">
          <div
            className="flex h-16 w-16 items-center justify-center ring-1 ring-white/20"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
          >
            <CarFront size={30} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">TOKIN Transport</h1>
            <p className="mt-1 text-sm text-blue-200/80">
              {admin ? 'Administration Portal' : 'Transportation Request Portal'}
            </p>
          </div>
        </div>

        <div
          className="border border-white/10 p-8 shadow-modal"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ink">
              {configured
                ? admin ? 'Admin sign in' : 'Sign in to your account'
                : 'Choose a demo role'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {configured
                ? 'Use your company credentials to continue.'
                : 'Supabase is not configured — changes stay in this browser.'}
            </p>
          </div>

          {configured ? (
            <form className="space-y-4" onSubmit={submit}>
              <Field label="Email address">
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="you@tokin.co.th"
                  />
                </div>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    placeholder="enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              {error && (
                <div className="flex items-center gap-2 border-l-2 border-danger bg-danger-light px-3 py-2.5 text-sm text-danger">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M7 0a7 7 0 1 0 0 14A7 7 0 0 0 7 0Zm.7 10.5h-1.4v-1.4h1.4v1.4Zm0-2.8h-1.4V3.5h1.4v4.2Z" />
                  </svg>
                  {error}
                </div>
              )}
              <Button size="lg" className="w-full mt-2" disabled={submitting || loading}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          ) : admin ? (
            <Button size="lg" type="button" className="w-full" onClick={() => enterDemo('admin')}>
              Continue as admin
            </Button>
          ) : (
            <div className="space-y-3">
              <Button size="lg" type="button" className="w-full" onClick={() => enterDemo('requester')}>
                Open request portal
              </Button>
              <Button size="lg" type="button" variant="secondary" className="w-full" onClick={() => enterDemo('approver')}>
                Open approver portal
              </Button>
            </div>
          )}

          <div className="mt-6 border-t border-line pt-5 text-center text-sm">
            {admin ? (
              <Link className="font-medium text-brand hover:text-brand-dark transition" href="/login">
                Return to requester portal
              </Link>
            ) : (
              <Link className="font-medium text-gray-500 hover:text-brand transition" href="/admin/login">
                Admin / Approver sign in
              </Link>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          2026 TOKIN Industrial. All rights reserved.
        </p>
      </div>
    </main>
  );
}
