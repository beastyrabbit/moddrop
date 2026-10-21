"use client";

import { usePathname } from "next/navigation";
import { LegalFooter } from "./legal-footer";

export function ControlLegalFooter() {
  const pathname = usePathname();
  // Reserve enough room for wrapped links on narrow screens.
  return (
    <div
      className={
        pathname.startsWith("/app/rooms/")
          ? "fixed inset-x-0 bottom-0 z-[500] h-[104px] bg-background sm:h-[60px] [&_footer]:py-2"
          : ""
      }
    >
      <LegalFooter />
    </div>
  );
}
