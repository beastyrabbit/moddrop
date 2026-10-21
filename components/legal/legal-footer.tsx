import Link from "next/link";
import { CookieSettings } from "@/components/cookie-settings";

const legalLinkClassName =
  "inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary";

export function LegalLinks() {
  return (
    <nav
      aria-label="Legal"
      className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs"
    >
      <Link className={legalLinkClassName} href="/legal-notice">
        Legal notice
      </Link>
      <Link className={legalLinkClassName} href="/privacy">
        Privacy
      </Link>
      <Link className={legalLinkClassName} href="/impressum" hrefLang="de">
        Impressum
      </Link>
      <Link className={legalLinkClassName} href="/datenschutz" hrefLang="de">
        Datenschutz
      </Link>
      <CookieSettings className={legalLinkClassName} />
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
