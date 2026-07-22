export type YouTubePolicy = "disabled" | "preview_only" | "allow_on_air";

/** Room config returned by the canvas backend API. */
export interface CanvasRoom {
  id: string;
  ownerClerkId: string;
  twitchChannel: string | null;
  youtubePolicy: YouTubePolicy;
  allowedUsers: string[];
  createdAt: string | null;
  updatedAt: string | null;
  obsSetupSecret?: string;
}

/** Room with ownership info, returned by the accessible rooms endpoint. */
export interface AccessibleRoom {
  id: string;
  twitchChannel: string | null;
  youtubePolicy: YouTubePolicy;
  collaboratorCount: number;
  isOwner: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}
