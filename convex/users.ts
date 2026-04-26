import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const MAX_RESOLVE_USERS = 50;
const MAX_USERNAME_PREFIX_LENGTH = 30;
const MAX_LEGACY_USERNAME_SEARCH_FALLBACK = 500;

interface PublicUserDto {
  userId: string;
  username: string;
  showProfilePic: boolean;
}

async function getUserByToken(
  ctx: QueryCtx | MutationCtx,
  tokenIdentifier: string,
) {
  return ctx.db
    .query("users")
    .withIndex("byTokenIdentifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier),
    )
    .unique();
}

function clerkUserIdFromTokenIdentifier(tokenIdentifier: string) {
  const parts = tokenIdentifier.split("|");
  return parts[parts.length - 1] ?? tokenIdentifier;
}

export function toPublicUser(user: Doc<"users">): PublicUserDto {
  return {
    userId: user.clerkUserId,
    username: user.username ?? user.clerkUserId,
    showProfilePic: user.showProfilePic ?? true,
  };
}

export function normalizeUsernamePrefix(prefix: string): string {
  return prefix.trim().toLowerCase().slice(0, MAX_USERNAME_PREFIX_LENGTH);
}

export function usernameSearchKey(username: string): string {
  return username.toLowerCase();
}

export function normalizeClerkUserIdList(userIds: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const userId of userIds) {
    const trimmed = userId.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
    if (normalized.length >= MAX_RESOLVE_USERS) break;
  }

  return normalized;
}

async function deriveUniqueUsername(
  ctx: MutationCtx,
  identity: {
    nickname?: string | null;
    name?: string | null;
  },
) {
  const raw = identity.nickname ?? identity.name;

  const sanitized =
    raw
      ?.replace(/[^a-zA-Z0-9_-]/g, "")
      .replace(/^[-_]+|[-_]+$/g, "")
      .slice(0, 30) || `user-${crypto.randomUUID().slice(0, 8)}`;

  const taken = await ctx.db
    .query("users")
    .withIndex("byUsernameSearch", (q) =>
      q.eq("usernameSearch", usernameSearchKey(sanitized)),
    )
    .first();
  const legacyTaken = await ctx.db
    .query("users")
    .withIndex("byUsername", (q) => q.eq("username", sanitized))
    .first();
  if (!taken && !legacyTaken) {
    return sanitized;
  }

  for (let index = 0; index < 5; index += 1) {
    const suffix = crypto.randomUUID().slice(0, 4);
    const candidate = `${sanitized.slice(0, 25)}-${suffix}`;
    const exists = await ctx.db
      .query("users")
      .withIndex("byUsernameSearch", (q) =>
        q.eq("usernameSearch", usernameSearchKey(candidate)),
      )
      .first();
    const legacyExists = await ctx.db
      .query("users")
      .withIndex("byUsername", (q) => q.eq("username", candidate))
      .first();
    if (!exists && !legacyExists) {
      return candidate;
    }
  }

  return undefined;
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await getUserByToken(ctx, identity.tokenIdentifier);
    return user ? toPublicUser(user) : null;
  },
});

export const getOrCreateUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await getUserByToken(ctx, identity.tokenIdentifier);
    if (existing) {
      const usernameSearch = existing.username
        ? usernameSearchKey(existing.username)
        : undefined;
      if (usernameSearch && existing.usernameSearch !== usernameSearch) {
        await ctx.db.patch(existing._id, {
          usernameSearch,
          updatedAt: Date.now(),
        });
      }
      return toPublicUser(existing);
    }

    const username = await deriveUniqueUsername(ctx, {
      nickname: identity.nickname,
      name: identity.name,
    });

    const clerkUserId = clerkUserIdFromTokenIdentifier(
      identity.tokenIdentifier,
    );
    const id = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId,
      ...(username
        ? { username, usernameSearch: usernameSearchKey(username) }
        : {}),
      showProfilePic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const user = await ctx.db.get(id);
    if (!user) {
      throw new Error("User created but could not be loaded");
    }
    return toPublicUser(user);
  },
});

export const searchByUsername = query({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const prefix = normalizeUsernamePrefix(args.prefix);
    if (!prefix) {
      return [];
    }

    const candidates = await ctx.db
      .query("users")
      .withIndex("byUsernameSearch", (q) =>
        q
          .gte("usernameSearch", prefix)
          .lt("usernameSearch", `${prefix}\uffff`),
      )
      .take(10);

    if (candidates.length >= 10) {
      return candidates.map(toPublicUser);
    }

    const byUserId = new Map<string, PublicUserDto>();
    for (const candidate of candidates) {
      byUserId.set(candidate.clerkUserId, toPublicUser(candidate));
    }

    const legacyCandidates = await ctx.db
      .query("users")
      .withIndex("byUsernameSearch", (q) => q.eq("usernameSearch", undefined))
      .take(MAX_LEGACY_USERNAME_SEARCH_FALLBACK);

    for (const candidate of legacyCandidates) {
      if (
        candidate.username &&
        usernameSearchKey(candidate.username).startsWith(prefix)
      ) {
        byUserId.set(candidate.clerkUserId, toPublicUser(candidate));
        if (byUserId.size >= 10) break;
      }
    }

    return [...byUserId.values()].slice(0, 10);
  },
});

export const resolveUsernames = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userIds = normalizeClerkUserIdList(args.userIds);
    const resolved = await Promise.all(
      userIds.map(async (userId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", userId))
          .unique();

        return user
          ? toPublicUser(user)
          : {
              userId,
              username: userId,
              showProfilePic: true,
            };
      }),
    );

    return resolved;
  },
});
