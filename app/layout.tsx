import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/components/app-provider';
import { AppShell } from '@/components/app-shell';
export const metadata: Metadata = { title: 'Car Service Requisition System', description: 'TOKIN vehicle booking operations' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return <html lang="en"><body><AppProvider><AppShell>{children}</AppShell></AppProvider></body></html>
}
