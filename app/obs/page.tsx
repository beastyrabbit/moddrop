"use client";

import { Suspense, useEffect, useState } from "react";
import { CanvasMirror } from "@/components/stream-canvas/CanvasMirror";

function OBSInner() {
  const [secret, setSecret] = useState<string | null>(null);
  const [hashChecked, setHashChecked] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const hashSecret = hashParams.get("secret");
    if (hashSecret) {
      setSecret(hashSecret);
      setHashChecked(true);
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const querySecret = queryParams.get("secret");
    if (querySecret) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}#secret=${encodeURIComponent(querySecret)}`,
      );
      setSecret(querySecret);
      setHashChecked(true);
      return;
    }

    setSecret(null);
    setHashChecked(true);
  }, []);

  if (!hashChecked) {
    return null;
  }

  if (!secret) {
    return (
      <div className="obs-status flex h-screen items-center justify-center text-sm text-white/60">
        Missing OBS secret. Open the OBS URL from room settings or add
        #secret=YOUR_SECRET to the URL.
      </div>
    );
  }

  return <CanvasMirror obsSecret={secret} />;
}

export default function StreamCanvasOBSPage() {
  return (
    <Suspense>
      <OBSInner />
    </Suspense>
  );
}
