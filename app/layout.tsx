import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
export const metadata: Metadata = {
  title: "TOKIN Transport",
  description: "Vehicle and OT transportation request portal",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
