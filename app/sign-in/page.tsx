import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalFooter } from "@/components/legal/legal-footer";

export const metadata: Metadata = { title: "Sign in | Moddrop" };

export default function SignInPage() {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <Link href="/" className="text-primary underline underline-offset-4">
          Moddrop
        </Link>
        <h1 className="text-2xl font-semibold">Sign in to Moddrop</h1>
        <SignIn routing="hash" fallbackRedirectUrl="/app" />
      </main>
      <LegalFooter />
    </div>
  );
}
