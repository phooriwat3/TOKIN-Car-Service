'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, Bell, CalendarDays, CarFront, ChevronRight, ClipboardCheck,
  ClipboardList, LayoutDashboard, LogOut, Menu, Plus, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from './app-provider';
import { Button, SectionLabel } from './ui';
import { cn } from '@/lib/utils';
import { Role } from '@/lib/types';

const links: Record<Role, { href: string; label: string; icon: any }[]> = {
  requester: [
    { href: '/bookings/new', label: 'Request transport', icon: Plus },
    { href: '/bookings', label: 'My requests', icon: ClipboardList },
  ],
  approver: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/approvals', label: 'Approval queue', icon: ClipboardCheck },
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
  approver: 'Approver Portal',
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
        path !== '/approver/login' &&
        path !== '/admin/login' &&
        !path.startsWith('/request')
      ) {
        router.replace(path.startsWith('/approvals') ? '/approver/login' : '/admin/login');
      }
    }
  }, [configured, loading, authenticated, path, router]);

  if (
    path === '/' ||
    path === '/login' ||
    path === '/approver/login' ||
    path === '/admin/login' ||
    path.startsWith('/request')
  ) return <>{children}</>;
  const loginPath =
    role === 'approver'
      ? '/approver/login'
      : role === 'admin'
        ? '/admin/login'
        : '/request';

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
    approver: '/approvals',
    admin: '/admin',
    driver: '/driver',
  };

  const allowed = path === '/' || path === '/dashboard' || path.startsWith(rolePath[role]);
  if (configured && !allowed)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-gray-500">Your account cannot open this workspace.</p>
          <Link className="mt-4 inline-block font-semibold text-brand hover:text-brand-dark" href="/dashboard">
            Return to dashboard
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
    <div className="flex h-full flex-col">
      <div className="relative flex h-[68px] shrink-0 items-center gap-3 px-5">
        <div className="flex h-9 items-center justify-center rounded-md bg-white px-2 shadow-sm">
          <img src="/tokin-logo.png" alt="TOKIN Logo" className="h-8 w-auto object-contain" />
        </div>
        <div className="h-7 w-px bg-white/15" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-white">Transport operations</p>
          <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" aria-hidden="true" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
              {portalLabel[role]}
            </span>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <SectionLabel className="mb-2 px-3 text-white/30">
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
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/[0.09] text-white ring-1 ring-inset ring-white/[0.08]'
                  : 'text-white/70 hover:bg-white/[0.055] hover:text-white/90',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.45)]" />
              )}
              <I size={17} className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
              <span className="flex-1">{x.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.07] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white ring-2 ring-white/15">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
            <p className="truncate text-xs text-slate-400/80">{user.department}</p>
          </div>
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={handleSignOut}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
        className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-white/[0.06] shadow-sidebar lg:flex"
        style={{ background: 'linear-gradient(175deg, var(--sidebar-bg-from) 0%, var(--sidebar-bg-to) 100%)' }}
      >
        <SidebarContent />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative flex h-full w-[260px] flex-col border-r border-white/[0.06] shadow-modal animate-slide-in"
            style={{ background: 'linear-gradient(175deg, var(--sidebar-bg-from) 0%, var(--sidebar-bg-to) 100%)' }}
          >
            <SidebarContent />
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/[0.92] px-4 shadow-header backdrop-blur-md backdrop-saturate-150 md:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden transition"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
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
                  className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold capitalize text-slate-700 shadow-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
                >
                  {(['requester', 'approver', 'admin', 'driver'] as Role[]).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              title="Notifications"
              aria-label="Notifications, 3 unread"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
            >
              <Bell size={18} />
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-[#f59e0b] px-0.5 text-[9px] font-bold leading-none text-white">
                3
              </span>
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 py-1 pl-1 pr-2.5 shadow-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 ring-1 ring-brand-200">
                {getInitials(user.fullName)}
              </div>
              <span className="hidden max-w-28 truncate text-xs font-semibold text-slate-700 md:block">
                {user.fullName}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1380px] animate-fade-in p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
