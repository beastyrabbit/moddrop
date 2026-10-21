"use client";
import { usePathname } from "next/navigation";
import { showCookieSettings } from "@/lib/telemetry/consent";

export function CookieSettings({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <button type="button" onClick={showCookieSettings} className={className}>
      {pathname === "/datenschutz" || pathname === "/impressum"
        ? "Cookie-Einstellungen"
        : "Cookie settings"}
    </button>
  );
}
