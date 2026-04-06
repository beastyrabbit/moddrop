"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

export function UserRecordBootstrap() {
  const { isAuthenticated } = useConvexAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) {
      return;
    }

    syncedRef.current = true;
    getOrCreateUser().catch((error) => {
      console.error("[moddrop] failed to sync user record", error);
      syncedRef.current = false;
    });
  }, [getOrCreateUser, isAuthenticated]);

  return null;
}
