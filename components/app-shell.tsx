'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, CalendarDays, Car, CarFront, ChevronRight, ClipboardCheck,
  ClipboardList, LayoutDashboard, LogOut, Menu, Plus, Users, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from './app-provider';
import { Button } from './ui';
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
    { href: '/admin/vehicles', label: 'Vehicles', icon: Car },
    { href: '/admin/drivers', label: 'Drivers', icon: Users },
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, user, configured, authenticated, loading, error, setRole, signOut } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (configured && !loading && !authenticated) {
      if (path !== '/' && path !== '/login' && path !== '/admin/login' && !path.startsWith('/request')) {
        router.replace(path.startsWith('/admin') ? '/admin/login' : '/login');
      }
    }
  }, [configured, loading, authenticated, path, router]);

  if (path === '/' || path === '/login' || path === '/admin/login' || path.startsWith('/request')) return <>{children}</>;
  const loginPath = role === 'requester' ? '/login' : '/admin/login';

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

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-4 px-5 border-b border-white/10">
        <div className="flex h-10 items-center justify-center bg-white rounded-md px-2 py-0.5 shadow-sm">
          <img src="/tokin-logo.png" alt="TOKIN Logo" className="h-8 w-auto object-contain" />
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div>
          <p className="text-[15px] font-bold text-white leading-tight">Transport Portal</p>
          <p className="text-[11px] text-blue-200/80 font-medium">{portalLabel[role]}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
          Navigation
        </p>
        {links[role].map((x) => {
          const I = x.icon;
          const isActive = path === x.href || (x.href !== '/dashboard' && path.startsWith(x.href));
          return (
            <Link
              key={x.href}
              href={x.href}
              onClick={() => setOpen(false)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white text-brand shadow-md'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <I size={17} className={cn('flex-shrink-0', isActive ? 'text-brand' : 'text-blue-200/70 group-hover:text-white')} />
              <span className="flex-1">{x.label}</span>
              {isActive && <ChevronRight size={14} className="text-brand/50" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-white/20 text-xs font-bold text-white ring-2 ring-white/30">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
            <p className="truncate text-xs text-blue-200/70">{user.department}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col lg:flex shadow-sidebar"
        style={{ background: 'linear-gradient(180deg, #00498E 0%, #003166 100%)' }}
      >
        <SidebarContent />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside
            className="relative flex h-full w-72 flex-col shadow-modal animate-slide-in"
            style={{ background: 'linear-gradient(180deg, #00498E 0%, #003166 100%)' }}
          >
            <SidebarContent />
            <button
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 backdrop-blur-sm px-4 md:px-6 shadow-header">
          <div className="flex items-center gap-3">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden transition"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="hidden text-sm font-medium sm:flex items-center gap-1.5">
              <span className="text-brand font-semibold">TOKIN</span>
              <span className="text-gray-300">/</span>
              <span className="text-ink capitalize">{portalLabel[role]}</span>
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
                  className="h-8 border border-line bg-white px-2.5 text-xs font-semibold capitalize text-ink focus:outline-none focus:border-brand"
                >
                  {(['requester', 'approver', 'admin', 'driver'] as Role[]).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </>
            )}
            <button
              title="Sign out"
              onClick={async () => { await signOut(); router.push(loginPath); router.refresh(); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-danger transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-7 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
