import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ControlLegalFooter } from "@/components/legal/control-legal-footer";

export const metadata: Metadata = {
  title: "Rooms | Moddrop",
  description: "Create and manage Moddrop stream canvas rooms.",
};

export default function AuthenticatedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      {children}
      <ControlLegalFooter />
    </AppShell>
  );
}
