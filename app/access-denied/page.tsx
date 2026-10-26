import Link from "next/link";
import { ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/brand";

export default function AccessDeniedPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950 p-6">
      <div className="absolute inset-0 bg-[url('/images/tokin-thailand.jpg')] bg-cover bg-center" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/95 via-brand-900/82 to-brand-700/60" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-1 bg-amber-400" aria-hidden="true" />
      <section className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-8 text-center shadow-2xl backdrop-blur">
        <BrandLogo className="mx-auto" />
        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-full bg-danger-light text-danger">
          <ShieldX size={27} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This account is not authorized for the requested privileged area.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Link href="/admin/login" className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">Return to staff sign in</Link>
          <Link href="/request" className="text-sm font-semibold text-slate-500 hover:text-brand">Employee request form</Link>
        </div>
      </section>
    </main>
  );
}
