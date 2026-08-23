'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, CalendarDays, CarFront, ChevronRight,
  ClipboardList, LayoutDashboard, LogOut, Menu, Plus, UserPlus, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from './app-provider';
import { Button, SectionLabel } from './ui';
import { cn } from '@/lib/utils';
import { Role } from '@/lib/types';
import { BrandLogo } from './brand';

const links: Record<Role, { href: string; label: string; icon: any }[]> = {
  requester: [
    { href: '/bookings/new', label: 'Request transport', icon: Plus },
    { href: '/bookings', label: 'My requests', icon: ClipboardList },
  ],
  approver: [],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/bookings/new', label: 'Create employee OT ride', icon: UserPlus },
    { href: '/admin/bookings', label: 'All bookings', icon: ClipboardList },
    { href: '/admin/calendar', label: 'Schedule', icon: CalendarDays },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ],
  driver: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/driver/trips', label: 'Assigned trips', icon: CarFront },
  ],
};

const portalLabel: Record<Role, string> = {
  requester: 'Request Portal',
  approver: 'Approval by secure link',
  admin: 'Administration',
  driver: 'Driver Portal',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getPageLabel(path: string, role: Role) {
  const matchingLink = [...links[role]]
    .sort((a, b) => b.href.length - a.href.length)
    .find((link) => path === link.href || (link.href !== '/dashboard' && path.startsWith(`${link.href}/`)));

  if (matchingLink) return matchingLink.label;

  const segment = path.split('/').filter(Boolean).at(-1);
  if (!segment) return 'Dashboard';

  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, user, configured, authenticated, loading, error, setRole, signOut } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (configured && !loading && !authenticated) {
      if (
        path !== '/' &&
        path !== '/login' &&

        path !== '/admin/login' &&
        !path.startsWith('/request')
      ) {
        router.replace('/admin/login');
      }
    }
  }, [configured, loading, authenticated, path, router]);

  if (
    path === '/' ||
    path === '/login' ||

    path === '/admin/login' ||
    path.startsWith('/request')
  ) return <>{children}</>;
  const loginPath = role === 'admin' ? '/admin/login' : '/request';

  if (configured && loading)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );

  if (configured && error)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-6">
        <div className="max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-danger-light text-danger">
            <X size={24} />
          </div>
          <h1 className="text-xl font-bold">Unable to load workspace</h1>
          <p className="mt-2 text-sm text-danger">{error}</p>
          <Button
            className="mt-5"
            onClick={async () => { await signOut(); router.push(loginPath); router.refresh(); }}
          >
            Return to sign in
          </Button>
        </div>
      </div>
    );

  if (configured && !authenticated) return null;

  const rolePath: Record<Role, string> = {
    requester: '/bookings',
    approver: '/__retired_approver_portal__',
    admin: '/admin',
    driver: '/driver',
  };

  const allowed = role !== 'approver' && (path === '/' || path === '/dashboard' || path.startsWith(rolePath[role]));
  if (configured && !allowed)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">{role === 'approver' ? 'Approver account access has been retired' : 'Access denied'}</h1>
          <p className="mt-2 text-sm text-gray-500">{role === 'approver' ? 'Requests are now approved from the secure link in the approval email.' : 'Your account cannot open this workspace.'}</p>
          <Link className="mt-4 inline-block font-semibold text-brand hover:text-brand-dark" href={role === 'approver' ? '/request' : '/dashboard'}>
            {role === 'approver' ? 'Return to request form' : 'Return to dashboard'}
          </Link>
        </div>
      </div>
    );

  const currentPageLabel = getPageLabel(path, role);
  const activeHref = [...links[role]]
    .sort((a, b) => b.href.length - a.href.length)
    .find((link) => path === link.href || (link.href !== '/dashboard' && path.startsWith(`${link.href}/`)))
    ?.href;

  const handleSignOut = async () => {
    await signOut();
    router.push(loginPath);
    router.refresh();
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white">
      <div className="relative flex h-[72px] shrink-0 items-center px-5 border-b border-slate-100">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <SectionLabel className="mb-2.5 px-3 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
          Navigation
        </SectionLabel>
        {links[role].map((x) => {
          const I = x.icon;
          const isActive = x.href === activeHref;
          return (
            <Link
              key={x.href}
              href={x.href}
              onClick={() => setOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand-600 rounded-r-full" />
              )}
              <I size={18} className={cn('flex-shrink-0 transition-colors', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
              <span className="flex-1">{x.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.department}</p>
          </div>
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={handleSignOut}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/90 bg-white shadow-sm lg:flex"
      >
        <SidebarContent />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative flex h-full w-64 flex-col border-r border-slate-200/90 bg-white shadow-modal animate-slide-in"
          >
            <SidebarContent />
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-header md:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 lg:hidden transition"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <span className="max-w-[180px] truncate text-sm font-semibold text-slate-900 sm:hidden">{currentPageLabel}</span>
            <div className="hidden items-center gap-1.5 text-sm font-medium sm:flex" aria-label="Breadcrumb">
              <span className="font-semibold text-slate-900">TOKIN</span>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-slate-500">{portalLabel[role]}</span>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-slate-900">{currentPageLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!configured && (
              <>
                <span className="hidden text-xs font-medium text-gray-400 sm:inline">Demo mode</span>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role);
                    router.push('/dashboard');
                  }}
                  aria-label="Switch demo role"
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold capitalize text-slate-700 shadow-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
                >
                  {(['requester', 'admin', 'driver'] as Role[]).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </>
            )}
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white py-1 pl-1 pr-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 text-[10px] font-bold text-brand-700">
                {getInitials(user.fullName)}
              </div>
              <span className="hidden max-w-28 truncate text-xs font-semibold text-slate-700 md:block">
                {user.fullName}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
