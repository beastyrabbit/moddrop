import type { Metadata } from "next";
import { noticeEN } from "@/components/legal/content.en";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Legal Notice (Impressum) | Moddrop",
  robots: { index: false },
};

export default function Page() {
  return (
    <LegalDocument
      language="en"
      title="Legal Notice (Impressum)"
      sections={noticeEN}
    />
  );
}
