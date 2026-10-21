"use client";
import { usePathname } from "next/navigation";
import { showCookieSettings } from "@/lib/telemetry/consent";

export function CookieSettings() {
  const pathname = usePathname();
  return (
    <button
      type="button"
      onClick={showCookieSettings}
      className="min-h-11 text-sm underline underline-offset-4"
    >
      {pathname === "/datenschutz" || pathname === "/impressum"
        ? "Cookie-Einstellungen"
        : "Cookie settings"}
    </button>
  );
}
