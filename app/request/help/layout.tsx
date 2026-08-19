import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Guide — TOKIN Transport",
  description:
    "How to submit a transport request, understand the approval workflow, and manage your booking.",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
