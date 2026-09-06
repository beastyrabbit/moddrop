"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

export function UserRecordBootstrap() {
  const { isAuthenticated } = useConvexAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const sync = async () => {
      try {
        await getOrCreateUser();
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
  }, [getOrCreateUser, isAuthenticated]);

  return null;
}
