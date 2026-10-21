import type { Metadata } from "next";
import { privacyDE } from "@/components/legal/content.de";
import { controller } from "@/components/legal/controller";
import { LegalDocument } from "@/components/legal/legal-document";

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
      updated={controller.updated}
    />
  );
}
