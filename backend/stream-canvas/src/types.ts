/** Connection role — determines read/write permissions on the tldraw room. */
export type ConnectionRole = "editor" | "obs";

/** Decoded claims from a Clerk JWT. */
export interface ClerkClaims {
  sub: string; // Clerk user ID
  iss: string;
  exp: number;
  iat: number;
  azp?: string;
}

/** Decoded claims from a short-lived OBS token. */
export interface ObsTokenClaims {
  roomId: string;
  role: "obs";
  scope: "stream-canvas-ws";
  exp: number;
  iat: number;
}

/** Decoded claims from a short-lived editor WebSocket ticket. */
export interface CanvasWsTokenClaims {
  roomId: string;
  role: "editor";
  scope: "stream-canvas-ws";
  userId: string;
  exp: number;
  iat: number;
}
