// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("profile operations require identity and preserve unique, public directory records", async () => {
  const t = convexTest(schema, modules);
  await expect(t.mutation(api.users.getOrCreateUser)).rejects.toThrow(
    "Not authenticated",
  );
  expect(await t.query(api.users.viewer)).toBeNull();
  expect(await t.query(api.users.searchByUsername, { prefix: "Ada" })).toEqual(
    [],
  );
  expect(
    await t.query(api.users.resolveUsernames, { userIds: ["user_ada"] }),
  ).toEqual([]);
  const ada = t.withIdentity({
    subject: "user_ada",
    issuer: "https://identity.example",
    nickname: "Ada",
  });
  const first = await ada.mutation(api.users.getOrCreateUser);
  expect(await ada.mutation(api.users.getOrCreateUser)).toEqual(first);
  const other = t.withIdentity({
    subject: "user_other",
    issuer: "https://identity.example",
    nickname: "ada",
  });
  const second = await other.mutation(api.users.getOrCreateUser);
  expect(second.username.toLowerCase()).not.toBe(first.username.toLowerCase());
  const results = await ada.query(api.users.searchByUsername, {
    prefix: " AdA ",
  });
  expect(results).toHaveLength(2);
  expect(Object.keys(results[0]).sort()).toEqual([
    "showProfilePic",
    "userId",
    "username",
  ]);
  expect(
    await t.run(async (ctx) => (await ctx.db.query("users").collect()).length),
  ).toBe(2);
});

test("directory search and resolution stay bounded and accept legacy profile fields", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (let i = 0; i < 15; i++)
      await ctx.db.insert("users", {
        clerkUserId: `user_${i}`,
        tokenIdentifier: `test|${i}`,
        username: `Member${i}`,
        usernameSearch: i % 2 ? undefined : `member${i}`,
        apiKey: "legacy-test-field",
        createdAt: 0,
        updatedAt: 0,
      });
  });
  const user = t.withIdentity({ subject: "reader" });
  expect(
    await user.query(api.users.searchByUsername, { prefix: "member" }),
  ).toHaveLength(10);
  expect(
    await user.query(api.users.resolveUsernames, {
      userIds: Array.from({ length: 60 }, (_, i) => `user_${i}`),
    }),
  ).toHaveLength(50);
});
