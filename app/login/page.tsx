'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CarFront, ShieldCheck } from 'lucide-react';
import type { Role } from '@/lib/types';
import { useApp } from '@/components/app-provider';
import { Button, Card, Field, Input } from '@/components/ui';

export default function Login() {
  const { configured, authenticated, loading, error, setRole, signIn } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enterDemo = (role: Role) => {
    setRole(role);
    window.location.assign('/dashboard');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/dashboard');
      router.refresh();
    } catch {
      // Provider exposes the safe authentication error message.
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (configured && authenticated && !loading) router.replace('/dashboard');
  }, [authenticated, configured, loading, router]);

  if (configured && authenticated && !loading) return null;

  return (
    <main className="grid min-h-screen place-items-center bg-[#17345f] p-5">
      <div className="w-full max-w-3xl">
        <div className="mb-7 flex items-center justify-center gap-3 text-white">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-brand"><CarFront /></div>
          <div>
            <h1 className="text-2xl font-bold">Car Service Requisition System</h1>
            <p className="text-sm text-blue-200">TOKIN operations</p>
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <ShieldCheck className="text-brand" />
            <div>
              <h2 className="text-lg font-bold">{configured ? 'Sign in' : 'Choose a demo role'}</h2>
              <p className="text-sm text-gray-500">
                {configured ? 'Use your company account to continue.' : 'Supabase is not configured; changes stay in this browser.'}
              </p>
            </div>
          </div>

          {configured ? (
            <form className="mx-auto max-w-md space-y-4" onSubmit={submit}>
              <Field label="Email">
                <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Password">
                <Input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" disabled={submitting || loading}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['requester', 'approver', 'admin', 'driver'] as Role[]).map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => enterDemo(role)}
                    className="rounded-md border border-line p-4 text-left hover:border-brand hover:bg-blue-50"
                  >
                    <span className="font-semibold capitalize">{role}</span>
                    <span className="mt-1 block text-xs text-gray-500">Open the {role} workspace</span>
                  </button>
                ))}
              </div>
              <Button type="button" className="mt-6 w-full" onClick={() => enterDemo('requester')}>
                Continue as requester
              </Button>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
