import type { YouTubePolicy } from "./types";

export interface LiveRoomConfig {
  twitchChannel: string | null;
  youtubePolicy: YouTubePolicy;
}

export function readRoomConfigMessage(value: unknown): LiveRoomConfig | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("type" in value) ||
    value.type !== "room-config" ||
    !("twitchChannel" in value) ||
    !(
      value.twitchChannel === null || typeof value.twitchChannel === "string"
    ) ||
    !("youtubePolicy" in value) ||
    !["disabled", "preview_only", "allow_on_air"].includes(
      String(value.youtubePolicy),
    )
  )
    return null;
  return {
    twitchChannel: value.twitchChannel,
    youtubePolicy: value.youtubePolicy as YouTubePolicy,
  };
}
