import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalLanguage } from "./controller";
import { LegalFooter } from "./legal-footer";

export type LegalSection = { id: string; title: string; content: ReactNode };

export function LegalDocument({
  language,
  title,
  sections,
  updated,
}: Readonly<{
  language: LegalLanguage;
  title: string;
  sections: readonly LegalSection[];
  updated?: string;
}>) {
  return (
    <div
      lang={language}
      className="app-shell min-h-screen bg-background text-foreground"
    >
      <main className="mx-auto max-w-3xl px-5 py-12 font-[family-name:var(--font-dm-sans)] sm:px-8 sm:py-16">
        <Link
          href="/"
          className="text-sm text-primary underline underline-offset-4"
        >
          Moddrop
        </Link>
        <h1 className="mt-8 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {updated ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {language === "de" ? "Stand: " : "Last updated: "}
            <time dateTime={updated}>
              {new Date(updated).toLocaleDateString(
                language === "de" ? "de-DE" : "en-GB",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                },
              )}
            </time>
          </p>
        ) : null}
        <div className="mt-10 space-y-9 text-base leading-7 [&_a]:break-words [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">
          {sections.map((section, index) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className="text-xl font-semibold">
                {updated ? `${index + 1}. ` : ""}
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
