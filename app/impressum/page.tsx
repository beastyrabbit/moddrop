import type { Metadata } from "next";
import { noticeDE } from "@/components/legal/content.de";
import { LegalDocument } from "@/components/legal/legal-document";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Impressum | Moddrop",
  robots: { index: false },
};

export default function Page() {
  return <LegalDocument language="de" title="Impressum" sections={noticeDE} />;
}
