import type { Metadata } from "next";
import { privacyDE } from "@/components/legal/content.de";
import { LegalDocument } from "@/components/legal/legal-document";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Datenschutzerklärung | Moddrop",
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalDocument
      language="de"
      title="Datenschutzerklärung"
      sections={privacyDE}
      updated="21. Oktober 2026"
    />
  );
}
