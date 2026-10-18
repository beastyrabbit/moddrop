import { randomUUID } from "node:crypto";
import type { ClerkClient } from "@clerk/backend";
import { eq, inArray, like } from "drizzle-orm";
import { config } from "./config.ts";
import { db } from "./db.ts";
import {
  escapeLikePattern,
  normalizeClerkUserIdList,
  normalizeUsernamePrefix,
  sanitizeUsername,
  usernameSearchKey,
} from "./usernames.ts";
import { users } from "./schema.ts";

const MAX_SEARCH_RESULTS = 10;
const SUFFIXED_USERNAME_ATTEMPTS = 5;

export interface PublicUser {
  userId: string;
  username: string;
  showProfilePic: boolean;
}

export interface ClerkProfile {
  username: string | null;
  fullName: string | null;
}

type UserRecord = typeof users.$inferSelect;

let clerkClient: ClerkClient | undefined;

/** Clerk Backend API lookup. An object so tests can replace `load`. */
export const clerkProfiles = {
  async load(clerkUserId: string): Promise<ClerkProfile> {
    if (!config.clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY is required to load user profiles");
    }
    if (!clerkClient) {
      const { createClerkClient } = await import("@clerk/backend");
      clerkClient = createClerkClient({ secretKey: config.clerkSecretKey });
    }
    const user = await clerkClient.users.getUser(clerkUserId);
    return { username: user.username, fullName: user.fullName };
  },
};

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    userId: user.clerkUserId,
    username: user.username,
    showProfilePic: user.showProfilePic,
  };
}

/** Return the caller's directory entry, creating it from Clerk on first use. */
export async function getOrCreateUser(
  clerkUserId: string,
): Promise<PublicUser> {
  const existing = await findUser(clerkUserId);
  if (existing) return toPublicUser(existing);

  const profile = await clerkProfiles.load(clerkUserId);
  for (const username of usernameCandidates(
    profile.username ?? profile.fullName,
  )) {
    const [created] = await db
      .insert(users)
      .values({
        clerkUserId,
        username,
        usernameSearch: usernameSearchKey(username),
      })
      .onConflictDoNothing()
      .returning();
    if (created) return toPublicUser(created);

    // The conflict may be this user's own row from a concurrent request.
    const winner = await findUser(clerkUserId);
    if (winner) return toPublicUser(winner);
  }

  throw new Error("Could not allocate a unique username");
}

export async function searchUsers(rawPrefix: string): Promise<PublicUser[]> {
  const prefix = normalizeUsernamePrefix(rawPrefix);
  if (!prefix) return [];

  const rows = await db
    .select()
    .from(users)
    .where(like(users.usernameSearch, `${escapeLikePattern(prefix)}%`))
    .orderBy(users.usernameSearch)
    .limit(MAX_SEARCH_RESULTS);
  return rows.map(toPublicUser);
}

/** Resolve display names in input order; unknown IDs fall back to the ID. */
export async function resolveUsers(
  rawUserIds: readonly string[],
): Promise<PublicUser[]> {
  const userIds = normalizeClerkUserIdList(rawUserIds);
  if (userIds.length === 0) return [];

  const rows = await db
    .select()
    .from(users)
    .where(inArray(users.clerkUserId, userIds));
  const byId = new Map(rows.map((row) => [row.clerkUserId, row]));
  return userIds.map((userId) => {
    const user = byId.get(userId);
    return user
      ? toPublicUser(user)
      : { userId, username: userId, showProfilePic: true };
  });
}

async function findUser(clerkUserId: string) {
  return db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
}

function usernameCandidates(raw: string | null): string[] {
  const base = sanitizeUsername(raw ?? "") || randomUsername();
  return [
    base,
    ...Array.from(
      { length: SUFFIXED_USERNAME_ATTEMPTS },
      () => `${base.slice(0, 25)}-${randomUUID().slice(0, 4)}`,
    ),
    randomUsername(),
  ];
}

function randomUsername(): string {
  return `user-${randomUUID().slice(0, 8)}`;
}
