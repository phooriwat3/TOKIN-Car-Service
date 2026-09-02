"use client";

import { useEffect, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import PublicRequestForm from "@/components/public-request-form";
import { BrandLogo, PublicFooter, PublicHeader } from "@/components/brand";
import { Button } from "@/components/ui";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadProfile } from "@/lib/supabase/repository";
import type { RequestType, User } from "@/lib/types";

export function RequestSignInGate({ initialType }: { initialType?: RequestType }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setLoading(false);
        return;
      }
      try {
        const companyProfile = await loadProfile(supabase);
        if (active) setProfile(companyProfile);
      } catch {
        if (active) setError("Your company account is not active for Transport. Please contact the Transport administrator.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const signIn = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setSigningIn(true);
    setError("");
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", window.location.pathname);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email offline_access User.Read",
        redirectTo: redirectUrl.toString(),
      },
    });
    if (signInError) {
      setError(signInError.message);
      setSigningIn(false);
    }
  };

  if (!isSupabaseConfigured) return <PublicRequestForm initialType={initialType} />;
  if (profile) return <PublicRequestForm initialType={initialType} requester={profile} />;

  return (
    <main className="flex min-h-screen flex-col bg-[#edf1f4]">
      <PublicHeader context="Employee transport requests" />
      <section className="mx-auto grid w-full max-w-lg flex-1 place-items-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg sm:px-9">
          <BrandLogo />
          <div className="mt-8 flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-brand">
            <ShieldCheck size={23} />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-brand">Company access</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Sign in to request transport</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use your Microsoft company account. Your employee details will be filled in automatically and you can securely search for your approver.
          </p>
          {loading ? (
            <div className="mt-7 flex items-center gap-3 text-sm text-slate-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/25 border-t-brand" /> Checking your session...</div>
          ) : error ? (
            <p role="alert" className="mt-7 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger">{error}</p>
          ) : (
            <Button size="lg" className="mt-7 w-full" onClick={signIn} disabled={signingIn}>
              <LogIn size={17} /> {signingIn ? "Redirecting to Microsoft..." : "Sign in with Microsoft"}
            </Button>
          )}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
