import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <section className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-700 px-5 py-6 text-white shadow-lg sm:flex sm:items-end sm:justify-between sm:gap-6 sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border-[36px] border-white/[0.04]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-24 bg-amber-400" aria-hidden="true" />
      <div className="relative min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-white sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-100">{description}</p>
      </div>
      {action && <div className="relative mt-5 flex w-full flex-shrink-0 sm:mt-0 sm:w-auto">{action}</div>}
    </section>
  );
}
