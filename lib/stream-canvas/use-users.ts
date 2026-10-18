"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { resolveUsers, searchUsers } from "./api";
import type { PublicUser } from "./types";

const SEARCH_DEBOUNCE_MS = 150;

type GetToken = ReturnType<typeof useAuth>["getToken"];
type DirectoryLoader = (
  key: string,
  getToken: GetToken,
) => Promise<PublicUser[]>;

/** `undefined` while loading or idle, `null` when the request failed. */
type DirectoryUsers = PublicUser[] | null | undefined;

const loadSearch: DirectoryLoader = (prefix, getToken) =>
  searchUsers(prefix, getToken);
const loadResolved: DirectoryLoader = (key, getToken) =>
  resolveUsers(key.split("\n"), getToken);

/** Username prefix matches for a non-blank prefix, with a retry for failures. */
export function useUserSearch(prefix: string): {
  results: DirectoryUsers;
  retry: () => void;
} {
  const { users, retry } = useDirectoryQuery(
    prefix.trim(),
    SEARCH_DEBOUNCE_MS,
    loadSearch,
  );
  return { results: users, retry };
}

/**
 * Directory entries for the given IDs; `undefined` while loading or empty.
 * A failed lookup yields `[]` so callers fall back to showing the raw IDs.
 */
export function useResolvedUsers(
  userIds: readonly string[],
): PublicUser[] | undefined {
  const { users } = useDirectoryQuery(userIds.join("\n"), 0, loadResolved);
  return users === null ? [] : users;
}

function useDirectoryQuery(
  key: string,
  delayMs: number,
  load: DirectoryLoader,
): { users: DirectoryUsers; retry: () => void } {
  const { getToken } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    attempt: number;
    users: PublicUser[] | null;
  }>();

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      load(key, getToken).then(
        (users) => {
          if (!cancelled) setResult({ key, attempt, users });
        },
        (error: unknown) => {
          console.error("[moddrop] user directory request failed", error);
          if (!cancelled) setResult({ key, attempt, users: null });
        },
      );
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt, delayMs, getToken, key, load]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  // Results for an older key or attempt are stale; report loading instead.
  const current = key && result?.key === key && result.attempt === attempt;
  return { users: current ? result.users : undefined, retry };
}
