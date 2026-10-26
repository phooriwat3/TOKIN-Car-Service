'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CarFront,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
    { href: '/admin/vehicles', label: 'Daily transport setup', icon: CarFront },
    { href: '/admin/employees', label: 'Employee directory', icon: Users },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/advanced', label: 'Advanced', icon: Settings2 },
  ],
  driver: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/driver/trips', label: 'Assigned trips', icon: CarFront },
  ],
  finance: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports', label: 'Billing & Reports', icon: BarChart3 },
  ],
  executive: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/bookings', label: 'All bookings', icon: ClipboardList },
  ],
  auditor: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/advanced', label: 'Audit & Compliance', icon: Settings2 },
  ],
};

const portalLabel: Record<Role, string> = {
  requester: 'Request Portal',
  approver: 'Approval by secure link',
  admin: 'Administration',
  driver: 'Driver Portal',
  finance: 'Finance Portal',
  executive: 'Executive Portal',
  auditor: 'Audit & Compliance',
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

interface AdvancedNavItemProps {
  isActive: boolean;
  isMobile?: boolean;
  onNavigate?: () => void;
}

function AdvancedNavItem({ isActive, isMobile = false, onNavigate }: AdvancedNavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  if (isMobile) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'group relative flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left',
            isActive
              ? 'bg-white/12 text-white font-semibold'
              : 'text-brand-100 hover:bg-white/[0.08] hover:text-white',
          )}
        >
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400" />
          )}
          <div className="flex items-center gap-3">
            <Settings2
              size={18}
              className={cn(
                'flex-shrink-0 transition-colors',
                isActive ? 'text-amber-300' : 'text-brand-300 group-hover:text-white',
              )}
            />
            <span>Advanced</span>
          </div>
          <ChevronRight
            size={16}
            className={cn(
              'text-brand-300 transition-transform duration-200',
              isOpen ? 'rotate-90 text-amber-300' : 'group-hover:text-white',
            )}
          />
        </button>

        {isOpen && (
          <div className="ml-7 space-y-1 border-l-2 border-white/10 py-1 pl-3">
            <Link
              href="/admin/advanced?tab=history"
              onClick={onNavigate}
              className="block rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-100 hover:bg-white/[0.08] hover:text-white"
            >
              Checking created emails
            </Link>
            <Link
              href="/admin/advanced?tab=test"
              onClick={onNavigate}
              className="block rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-100 hover:bg-white/[0.08] hover:text-white"
            >
              Send test email
            </Link>
            <Link
              href="/admin/advanced"
              onClick={onNavigate}
              className="block rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-200 hover:bg-white/[0.08] hover:text-white"
            >
              All operational tools
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href="/admin/advanced"
        onClick={onNavigate}
        className={cn(
          'group relative flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          isActive || isOpen
            ? 'bg-white/12 text-white font-semibold'
            : 'text-brand-100 hover:bg-white/[0.08] hover:text-white',
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400" />
        )}
        <div className="flex items-center gap-3">
          <Settings2
            size={18}
            className={cn(
              'flex-shrink-0 transition-colors',
              isActive || isOpen ? 'text-amber-300' : 'text-brand-300 group-hover:text-white',
            )}
          />
          <span className="flex-1">Advanced</span>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            'text-brand-300 transition-all duration-200',
            isOpen ? 'translate-x-0.5 text-amber-300' : 'group-hover:text-white',
          )}
        />
      </Link>

      {/* Hover bridge & Clean Flyout Submenu Panel matching reference */}
      {isOpen && (
        <div
          className="absolute left-[calc(100%+6px)] top-[-4px] z-50 w-60 origin-top-left rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-lg shadow-slate-200/50 transition-all animate-in fade-in-0 zoom-in-95 duration-150 before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-4"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header matching Picture 2 */}
          <div className="px-3 pt-2.5 pb-2">
            <p className="text-sm font-semibold text-slate-900">
              Advanced
            </p>
          </div>

          <div className="space-y-0.5 px-1 pb-1">
            <Link
              href="/admin/advanced?tab=history"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
            >
              Checking created emails
            </Link>

            <Link
              href="/admin/advanced?tab=test"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand-600"
            >
              Send test email
            </Link>

            <Link
              href="/admin/advanced"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.();
              }}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-600"
            >
              All operational tools
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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
        path !== '/admin/recover' &&
        path !== '/access-denied' &&
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
    path === '/admin/recover' ||
    path === '/admin/reset-password' ||
    path === '/access-denied' ||
    path.startsWith('/request')
  ) return <>{children}</>;
  const loginPath = role === 'admin' ? '/admin/login' : '/request';

  if (configured && loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,rgba(218,234,249,0.8),transparent_34%),var(--canvas)] text-sm text-slate-600">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-8 py-7 shadow-card">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <span className="font-semibold">Loading workspace...</span>
        </div>
      </div>
    );

  if (configured && error)
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,rgba(218,234,249,0.8),transparent_34%),var(--canvas)] p-6">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-light text-danger">
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
    finance: '/admin/reports',
    executive: '/bookings',
    auditor: '/admin/advanced',
  };

  const allowed = role !== 'approver' && (path === '/' || path === '/dashboard' || path.startsWith(rolePath[role]));
  if (configured && !allowed)
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,rgba(218,234,249,0.8),transparent_34%),var(--canvas)] p-6">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
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

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 text-white">
      <div className="relative flex h-[72px] shrink-0 items-center justify-center border-b border-white/10 bg-white px-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <SectionLabel className="mb-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-brand-300">
          Navigation
        </SectionLabel>
        {links[role].map((x) => {
          const I = x.icon;
          const isActive = x.href === activeHref || (x.href === '/admin/advanced' && path.startsWith('/admin/advanced'));

          if (x.href === '/admin/advanced') {
            return (
              <AdvancedNavItem
                key={x.href}
                isActive={isActive}
                isMobile={isMobile}
                onNavigate={() => setOpen(false)}
              />
            );
          }

          return (
            <Link
              key={x.href}
              href={x.href}
              onClick={() => setOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/12 text-white font-semibold'
                  : 'text-brand-100 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400" />
              )}
              <I size={18} className={cn('flex-shrink-0 transition-colors', isActive ? 'text-amber-300' : 'text-brand-300 group-hover:text-white')} />
              <span className="flex-1">{x.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 bg-black/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400 text-xs font-bold text-brand-950">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
            <p className="truncate text-xs text-brand-200">{user.department}</p>
          </div>
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={handleSignOut}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(218,234,249,0.8),transparent_30%),var(--canvas)]">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-brand-700 bg-brand-950 shadow-xl lg:flex"
      >
        <SidebarContent isMobile={false} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative flex h-full w-64 flex-col border-r border-brand-700 bg-brand-950 shadow-modal animate-slide-in"
          >
            <SidebarContent isMobile={true} />
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 border-t-4 border-t-brand-700 bg-white/95 px-4 shadow-header backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 lg:hidden transition"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
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
