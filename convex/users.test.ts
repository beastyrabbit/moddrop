import { describe, expect, it } from "vitest";
import {
  normalizeClerkUserIdList,
  normalizeUsernamePrefix,
  toPublicUser,
  usernameSearchKey,
} from "./users";
import type { Doc } from "./_generated/dataModel";

describe("Convex user public helpers", () => {
  it("caps username search prefixes", () => {
    expect(normalizeUsernamePrefix("  BeastyRabbitExtraLongUsername  ")).toBe(
      "beastyrabbitextralongusername",
    );
    expect(normalizeUsernamePrefix("a".repeat(60))).toHaveLength(30);
    expect(usernameSearchKey("BeastyRabbit")).toBe("beastyrabbit");
  });

  it("dedupes and caps username resolution input", () => {
    const userIds = [
      " user_a ",
      "user_a",
      "",
      ...Array.from({ length: 60 }, (_, index) => `user_${index}`),
    ];

    const normalized = normalizeClerkUserIdList(userIds);

    expect(normalized[0]).toBe("user_a");
    expect(normalized).toHaveLength(50);
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("returns only public user fields", () => {
    const publicUser = toPublicUser({
      _id: "users:example",
      _creationTime: 1,
      tokenIdentifier: "https://clerk.example|user_secret",
      clerkUserId: "user_public",
      username: "BeastyRabbit",
      usernameSearch: "beastyrabbit",
      apiKey: "should-not-leak",
      showProfilePic: false,
    } as Doc<"users">);

    expect(publicUser).toEqual({
      userId: "user_public",
      username: "BeastyRabbit",
      showProfilePic: false,
    });
    expect("apiKey" in publicUser).toBe(false);
    expect("tokenIdentifier" in publicUser).toBe(false);
  });
});
