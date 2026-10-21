import Link from "next/link";
import { CookieSettings } from "@/components/cookie-settings";

export function LegalLinks() {
  return (
    <nav
      aria-label="Legal"
      className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs"
    >
      <Link
        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary"
        href="/legal-notice"
      >
        Legal notice
      </Link>
      <Link
        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary"
        href="/privacy"
      >
        Privacy
      </Link>
      <Link
        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary"
        href="/impressum"
        hrefLang="de"
      >
        Impressum
      </Link>
      <Link
        className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary"
        href="/datenschutz"
        hrefLang="de"
      >
        Datenschutz
      </Link>
      <CookieSettings />
    </nav>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-4 text-muted-foreground">
      <LegalLinks />
    </footer>
  );
}
