const ROOM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TWITCH_CHANNEL_PATTERN = /^[a-zA-Z0-9_]{3,25}$/;
const CLERK_USER_ID_PATTERN = /^user_[A-Za-z0-9]+$/;

export const MAX_ALLOWED_USERS = 32;
export const MAX_ROOM_CONFIG_BODY_BYTES = 16 * 1024;

export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

export interface ValidatedRoomConfig {
  twitchChannel?: string | null;
  allowedUsers?: string[];
}

export function validateRoomConfigUpdate(
  input: unknown,
  ownerClerkId: string,
): { ok: true; value: ValidatedRoomConfig } | { ok: false; error: string } {
  if (!isPlainObject(input)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const value: ValidatedRoomConfig = {};

  if ("twitchChannel" in input) {
    if (input.twitchChannel === null || input.twitchChannel === "") {
      value.twitchChannel = null;
    } else if (typeof input.twitchChannel !== "string") {
      return { ok: false, error: "Twitch channel must be a string" };
    } else {
      const twitchChannel = input.twitchChannel.trim();
      if (
        twitchChannel.length > 0 &&
        !TWITCH_CHANNEL_PATTERN.test(twitchChannel)
      ) {
        return {
          ok: false,
          error: "Twitch channel must be 3-25 letters, numbers, or underscores",
        };
      }
      value.twitchChannel = twitchChannel.length > 0 ? twitchChannel : null;
    }
  }

  if ("allowedUsers" in input) {
    if (!Array.isArray(input.allowedUsers)) {
      return { ok: false, error: "Allowed users must be an array" };
    }
    if (input.allowedUsers.length > MAX_ALLOWED_USERS) {
      return {
        ok: false,
        error: `Allowed users cannot exceed ${MAX_ALLOWED_USERS}`,
      };
    }

    const allowedUsers: string[] = [];
    const seen = new Set<string>();
    for (const userId of input.allowedUsers) {
      if (typeof userId !== "string") {
        return { ok: false, error: "Allowed user IDs must be strings" };
      }
      const trimmed = userId.trim();
      if (trimmed.length > 128 || !CLERK_USER_ID_PATTERN.test(trimmed)) {
        return { ok: false, error: "Invalid Clerk user ID" };
      }
      if (trimmed === ownerClerkId || seen.has(trimmed)) continue;
      seen.add(trimmed);
      allowedUsers.push(trimmed);
    }
    value.allowedUsers = allowedUsers;
  }

  return { ok: true, value };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
