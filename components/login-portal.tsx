'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CarFront, ShieldCheck } from 'lucide-react';
import type { Role } from '@/lib/types';
import { landingPathForRole } from '@/lib/role-routes';
import { useApp } from '@/components/app-provider';
import { Button, Card, Field, Input } from '@/components/ui';

export function LoginPortal({ admin = false }: { admin?: boolean }) {
  const { configured, authenticated, loading, error, role, setRole, signIn } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="grid min-h-screen place-items-center bg-[#17345f] p-5">
      <div className="w-full max-w-3xl">
        <div className="mb-7 flex items-center justify-center gap-3 text-white">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-brand"><CarFront /></div>
          <div>
            <h1 className="text-2xl font-bold">TOKIN Transport</h1>
            <p className="text-sm text-blue-200">{admin ? 'Administration portal' : 'Transportation request portal'}</p>
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <div className="mb-6 flex items-start gap-3">
            <ShieldCheck className="text-brand" />
            <div>
              <h2 className="text-lg font-bold">{configured ? (admin ? 'Admin sign in' : 'Requester sign in') : 'Choose a demo role'}</h2>
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
          ) : admin ? (
            <Button type="button" className="w-full" onClick={() => enterDemo('admin')}>Continue as admin</Button>
          ) : (
            <Button type="button" className="w-full" onClick={() => enterDemo('requester')}>Open request form</Button>
          )}

          <div className="mt-6 border-t border-line pt-5 text-center text-sm">
            {admin ? (
              <Link className="font-semibold text-brand" href="/login">Return to requester portal</Link>
            ) : (
              <Link className="text-gray-500 hover:text-brand" href="/admin/login">Admin / Approver sign in</Link>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
