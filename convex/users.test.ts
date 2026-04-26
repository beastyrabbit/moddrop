import { describe, expect, it } from "vitest";
import { normalizeClerkUserIdList, normalizeUsernamePrefix } from "./users";

describe("Convex user public helpers", () => {
  it("caps username search prefixes", () => {
    expect(normalizeUsernamePrefix("  BeastyRabbitExtraLongUsername  ")).toBe(
      "beastyrabbitextralongusername",
    );
    expect(normalizeUsernamePrefix("a".repeat(60))).toHaveLength(30);
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
});
