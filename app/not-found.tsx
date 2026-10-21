import Link from "next/link";
import { LegalFooter } from "@/components/legal/legal-footer";

export default function NotFound() {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <Link href="/" className="text-primary underline underline-offset-4">
          Back to Moddrop
        </Link>
      </main>
      <LegalFooter />
    </div>
  );
}
