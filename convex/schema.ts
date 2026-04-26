import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    username: v.optional(v.string()),
    usernameSearch: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    showProfilePic: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byTokenIdentifier", ["tokenIdentifier"])
    .index("byClerkUserId", ["clerkUserId"])
    .index("byUsername", ["username"])
    .index("byUsernameSearch", ["usernameSearch"])
    .index("byApiKey", ["apiKey"]),
});
