/** Room config returned by the canvas backend API. */
export interface CanvasRoom {
  id: string;
  ownerClerkId: string;
  twitchChannel: string | null;
  allowedUsers: string[];
  createdAt: string | null;
  updatedAt: string | null;
  obsSetupSecret?: string;
}

/** Room with ownership info, returned by the accessible rooms endpoint. */
export interface AccessibleRoom {
  id: string;
  twitchChannel: string | null;
  collaboratorCount: number;
  isOwner: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}
