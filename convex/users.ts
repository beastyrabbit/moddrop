import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

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

async function deriveUniqueUsername(
  ctx: MutationCtx,
  identity: {
    nickname?: string | null;
    name?: string | null;
    email?: string | null;
  },
) {
  const raw =
    identity.nickname ??
    identity.name ??
    (identity.email ? identity.email.split("@")[0] : undefined);
  if (!raw) {
    return undefined;
  }

  const sanitized = raw
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 30);
  if (!sanitized) {
    return undefined;
  }

  const taken = await ctx.db
    .query("users")
    .withIndex("byUsername", (q) => q.eq("username", sanitized))
    .unique();
  if (!taken) {
    return sanitized;
  }

  for (let index = 0; index < 5; index += 1) {
    const suffix = crypto.randomUUID().slice(0, 4);
    const candidate = `${sanitized.slice(0, 25)}-${suffix}`;
    const exists = await ctx.db
      .query("users")
      .withIndex("byUsername", (q) => q.eq("username", candidate))
      .unique();
    if (!exists) {
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

    return getUserByToken(ctx, identity.tokenIdentifier);
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
      return existing;
    }

    const username = await deriveUniqueUsername(ctx, {
      nickname: identity.nickname,
      name: identity.name,
      email: identity.email,
    });

    const clerkUserId = clerkUserIdFromTokenIdentifier(
      identity.tokenIdentifier,
    );
    const id = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkUserId,
      ...(username ? { username } : {}),
      apiKey: crypto.randomUUID(),
      showProfilePic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return ctx.db.get(id);
  },
});

export const searchByUsername = query({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const prefix = args.prefix.trim().toLowerCase();
    if (!prefix) {
      return [];
    }

    const candidates = await ctx.db
      .query("users")
      .withIndex("byUsername")
      .take(50);

    return candidates
      .filter((user) => user.username?.toLowerCase().startsWith(prefix))
      .slice(0, 10)
      .map((user) => ({
        userId: user.clerkUserId,
        username: user.username ?? user.clerkUserId,
      }));
  },
});

export const resolveUsernames = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const resolved = await Promise.all(
      args.userIds.map(async (userId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", userId))
          .unique();

        return {
          userId,
          username: user?.username ?? userId,
        };
      }),
    );

    return resolved;
  },
});
