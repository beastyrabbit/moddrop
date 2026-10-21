"use client";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  isConsentRunning,
  showCookieSettings,
  subscribeConsent,
} from "@/lib/telemetry/consent";

const serverSnapshot = () => false;

export function CookieSettings({
  className,
}: Readonly<{ className?: string }>) {
  const pathname = usePathname();
  const running = useSyncExternalStore(
    subscribeConsent,
    isConsentRunning,
    serverSnapshot,
  );
  if (!running) return null;
  return (
    <button type="button" onClick={showCookieSettings} className={className}>
      {pathname === "/datenschutz" || pathname === "/impressum"
        ? "Cookie-Einstellungen"
        : "Cookie settings"}
    </button>
  );
}
