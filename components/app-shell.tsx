'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, CalendarDays, Car, CarFront, ClipboardCheck, ClipboardList, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from './app-provider';
import { Button } from './ui';
import { cn } from '@/lib/utils';
import { Role } from '@/lib/types';
const links: Record<Role, { href: string; label: string; icon: any }[]> = {
    requester: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/bookings', label: 'My bookings', icon: ClipboardList },
        { href: '/bookings/new', label: 'New request', icon: Plus }
    ],
    approver: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/approvals', label: 'Approval queue', icon: ClipboardCheck }
    ],
    admin: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/bookings', label: 'All bookings', icon: ClipboardList },
        { href: '/admin/calendar', label: 'Schedule', icon: CalendarDays },
        { href: '/admin/vehicles', label: 'Vehicles', icon: Car },
        { href: '/admin/drivers', label: 'Drivers', icon: Users },
        { href: '/admin/reports', label: 'Reports', icon: BarChart3 }
    ],
    driver: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/driver/trips', label: 'Assigned trips', icon: CarFront },
        { href: '/driver/line', label: 'Connect LINE', icon: MessageCircle }
    ]
};
export function AppShell({ children }: { children: React.ReactNode }) {
    const { role, user, configured, authenticated, loading, error, setRole, signOut } = useApp();
    const path = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    if (path === '/login' || path.startsWith('/liff/')) return <>{children}</>;
    if (configured && loading) return <div className="grid min-h-screen place-items-center bg-canvas text-sm text-gray-500">Loading workspace...</div>;
    if (configured && error) return <div className="grid min-h-screen place-items-center bg-canvas p-6"><div className="max-w-lg text-center"><h1 className="text-xl font-bold">Unable to load workspace</h1><p className="mt-2 text-sm text-red-600">{error}</p><Button className="mt-4" onClick={async () => { await signOut(); router.push('/login'); router.refresh() }}>Return to sign in</Button></div></div>;
    if (configured && !authenticated) return null;
    const rolePath: Record<Role, string> = {
        requester: '/bookings',
        approver: '/approvals',
        admin: '/admin',
        driver: '/driver'
    };
    const allowed = path === '/dashboard' || path.startsWith(rolePath[role]);
    if (configured && !allowed) {
        return <div className="grid min-h-screen place-items-center bg-canvas p-6"><div className="text-center"><h1 className="text-xl font-bold">Access denied</h1><p className="mt-2 text-sm text-gray-500">Your account cannot open this workspace.</p><Link className="mt-4 inline-block font-semibold text-brand" href="/dashboard">Return to dashboard</Link></div></div>
    }
    const nav = <><div className="flex h-16 items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-md bg-white text-brand font-bold">CS</div><div><p className="font-bold text-white">Car Service</p><p className="text-xs text-blue-200">Requisition System</p></div></div><nav className="flex-1 space-y-1 p-3">{links[role].map(x => {
        const I = x.icon; return <Link key={x.href} href={x.href} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/10', path === x.href && 'bg-white text-brand')}><I size={18} />{x.label}</Link>
    })}</nav><div className="border-t border-white/10 p-4 text-sm"><p className="font-semibold text-white">{user.fullName}</p><p className="text-xs text-blue-200">{user.department}</p></div></>;
    return <div className="min-h-screen bg-canvas"><aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#17345f] lg:flex">{nav}</aside>{open && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-72 flex-col bg-[#17345f]">{nav}<button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)}><X /></button></aside></div>}<div className="lg:pl-60"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white px-4 md:px-7"><button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button><div className="hidden text-sm text-gray-500 sm:block">Operational workspace</div><div className="flex items-center gap-2"><span className="hidden text-xs font-medium text-gray-500 sm:inline">View as</span><select value={role} disabled={configured} onChange={e => {
        setRole(e.target.value as Role);
        router.push('/dashboard')
    }} className="h-9 rounded-md border border-line bg-white px-2 text-sm font-semibold capitalize">{(['requester', 'approver', 'admin', 'driver'] as Role[]).map(r => <option key={r}>{r}</option>)}
    </select><Button variant="ghost" title="Logout" onClick={async () => { await signOut(); router.push('/login'); router.refresh() }}><LogOut size={17} /></Button></div></header><main className="mx-auto max-w-[1440px] p-4 md:p-7">{children}</main></div></div>
}
