"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { toast } from "sonner";
import { syncCurrentUser } from "@/lib/stream-canvas/api";

export function UserRecordBootstrap() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const sync = async () => {
      try {
        await syncCurrentUser(getToken);
      } catch (error) {
        if (cancelled) return;
        if (++attempts < 3) {
          timer = setTimeout(() => void sync(), attempts * 1_000);
          return;
        }
        console.error("[moddrop] failed to sync user record", error);
        toast.error("Failed to sync your profile.", {
          action: {
            label: "Retry",
            onClick: () => {
              if (!cancelled) {
                attempts = 0;
                void sync();
              }
            },
          },
        });
      }
    };
    void sync();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [getToken, isSignedIn]);

  return null;
}
