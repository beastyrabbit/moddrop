import type { Metadata } from "next";
import { privacyEN } from "@/components/legal/content.en";
import { controller } from "@/components/legal/controller";
import { LegalDocument } from "@/components/legal/legal-document";

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
      updated={controller.updated}
    />
  );
}
