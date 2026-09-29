const ROOM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TWITCH_CHANNEL_PATTERN = /^\w{3,25}$/;
const CLERK_USER_ID_PATTERN = /^user_[A-Za-z0-9]+$/;

export const MAX_ALLOWED_USERS = 32;
export const MAX_ROOM_CONFIG_BODY_BYTES = 16 * 1024;

export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

export interface ValidatedRoomConfig {
  twitchChannel?: string | null;
  allowedUsers?: string[];
  youtubePolicy?: "disabled" | "preview_only" | "allow_on_air";
  acknowledgeYouTubeRisk?: boolean;
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function validateTwitchChannel(
  input: unknown,
): ValidationResult<string | null> {
  if (input === null || input === "") return { ok: true, value: null };
  if (typeof input !== "string") {
    return { ok: false, error: "Twitch channel must be a string" };
  }
  const channel = input.trim();
  if (channel.length > 0 && !TWITCH_CHANNEL_PATTERN.test(channel)) {
    return {
      ok: false,
      error: "Twitch channel must be 3-25 letters, numbers, or underscores",
    };
  }
  return { ok: true, value: channel || null };
}

function validateAllowedUsers(
  input: unknown,
  ownerClerkId: string,
): ValidationResult<string[]> {
  if (!Array.isArray(input)) {
    return { ok: false, error: "Allowed users must be an array" };
  }
  if (input.length > MAX_ALLOWED_USERS) {
    return {
      ok: false,
      error: `Allowed users cannot exceed ${MAX_ALLOWED_USERS}`,
    };
  }
  const allowedUsers = new Set<string>();
  for (const userId of input) {
    if (typeof userId !== "string") {
      return { ok: false, error: "Allowed user IDs must be strings" };
    }
    const trimmed = userId.trim();
    if (trimmed.length > 128 || !CLERK_USER_ID_PATTERN.test(trimmed)) {
      return { ok: false, error: "Invalid Clerk user ID" };
    }
    if (trimmed !== ownerClerkId) allowedUsers.add(trimmed);
  }
  return { ok: true, value: [...allowedUsers] };
}

export function validateRoomConfigUpdate(
  input: unknown,
  ownerClerkId: string,
): ValidationResult<ValidatedRoomConfig> {
  if (!isPlainObject(input)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const value: ValidatedRoomConfig = {};

  if ("twitchChannel" in input) {
    const result = validateTwitchChannel(input.twitchChannel);
    if (!result.ok) return result;
    value.twitchChannel = result.value;
  }

  if ("allowedUsers" in input) {
    const result = validateAllowedUsers(input.allowedUsers, ownerClerkId);
    if (!result.ok) return result;
    value.allowedUsers = result.value;
  }

  const youtube = validateYouTubeSettings(input);
  if (!youtube.ok) return youtube;
  return { ok: true, value: { ...value, ...youtube.value } };
}

function validateYouTubeSettings(
  input: Record<string, unknown>,
): ValidationResult<
  Pick<ValidatedRoomConfig, "youtubePolicy" | "acknowledgeYouTubeRisk">
> {
  const value: Pick<
    ValidatedRoomConfig,
    "youtubePolicy" | "acknowledgeYouTubeRisk"
  > = {};
  if ("youtubePolicy" in input) {
    if (
      input.youtubePolicy !== "disabled" &&
      input.youtubePolicy !== "preview_only" &&
      input.youtubePolicy !== "allow_on_air"
    ) {
      return { error: "Invalid YouTube policy", ok: false };
    }
    value.youtubePolicy = input.youtubePolicy;
  }

  if ("acknowledgeYouTubeRisk" in input) {
    if (typeof input.acknowledgeYouTubeRisk !== "boolean") {
      return {
        error: "YouTube risk acknowledgement must be boolean",
        ok: false,
      };
    }
    value.acknowledgeYouTubeRisk = input.acknowledgeYouTubeRisk;
  }

  if (
    value.youtubePolicy === "allow_on_air" &&
    value.acknowledgeYouTubeRisk !== true
  ) {
    return {
      error: "Allowing YouTube on air requires risk acknowledgement",
      ok: false,
    };
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
