import type { Metadata } from "next";
import { privacyEN } from "@/components/legal/content.en";
import { LegalDocument } from "@/components/legal/legal-document";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Privacy Policy | Moddrop",
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalDocument
      language="en"
      title="Privacy Policy"
      sections={privacyEN}
      updated="21 October 2026"
    />
  );
}
