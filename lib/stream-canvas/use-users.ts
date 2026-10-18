"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { resolveUsers, searchUsers } from "./api";
import type { PublicUser } from "./types";

const SEARCH_DEBOUNCE_MS = 150;

type GetToken = ReturnType<typeof useAuth>["getToken"];
type DirectoryLoader = (
  key: string,
  getToken: GetToken,
) => Promise<PublicUser[]>;

const loadSearch: DirectoryLoader = (prefix, getToken) =>
  searchUsers(prefix, getToken);
const loadResolved: DirectoryLoader = (key, getToken) =>
  resolveUsers(key.split("\n"), getToken);

/** Username prefix matches; `undefined` while loading or when blank. */
export function useUserSearch(prefix: string): PublicUser[] | undefined {
  return useDirectoryQuery(prefix.trim(), SEARCH_DEBOUNCE_MS, loadSearch);
}

/** Directory entries for the given IDs; `undefined` while loading or empty. */
export function useResolvedUsers(
  userIds: readonly string[],
): PublicUser[] | undefined {
  return useDirectoryQuery(userIds.join("\n"), 0, loadResolved);
}

function useDirectoryQuery(
  key: string,
  delayMs: number,
  load: DirectoryLoader,
): PublicUser[] | undefined {
  const { getToken } = useAuth();
  const [result, setResult] = useState<{ key: string; users: PublicUser[] }>();

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      load(key, getToken).then(
        (users) => {
          if (!cancelled) setResult({ key, users });
        },
        (error: unknown) => {
          console.error("[moddrop] user directory request failed", error);
          if (!cancelled) setResult({ key, users: [] });
        },
      );
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs, getToken, key, load]);

  // Results for an older key are stale; report loading until the new one lands.
  return key && result?.key === key ? result.users : undefined;
}
