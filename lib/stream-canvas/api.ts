import type { AccessibleRoom, CanvasRoom } from "./types";

/** Canvas backend base URL. Use `/canvas-api` in production (same-origin, no CORS). */
const configuredCanvasApi = normalizeConfiguredCanvasApi(
  process.env.NEXT_PUBLIC_CANVAS_API_URL,
);
export const CANVAS_API =
  configuredCanvasApi ??
  (process.env.NODE_ENV === "production"
    ? "/canvas-api"
    : "http://stream-canvas.localhost:1355");

type ClerkTokenGetter = () => Promise<string | null>;
type UploadUrlResolveOptions = { forceRefresh?: boolean };
export type UploadUrlRefreshDelayMs = number | null | undefined;

interface CachedUploadAccessUrl {
  url: string;
  expiresAt: number;
  pending?: Promise<string>;
}

const UPLOAD_ACCESS_CACHE_SKEW_MS = 30_000;
const uploadAccessUrlCache = new Map<string, CachedUploadAccessUrl>();

function normalizeConfiguredCanvasApi(value: string | undefined): string | undefined {
  if (
    !value ||
    value === "http://placeholder.canvas.local" ||
    value === "__NEXT_PUBLIC_CANVAS_API_URL__"
  ) {
    return undefined;
  }
  return value;
}

async function getClerkToken(
  getToken: ClerkTokenGetter,
  options?: { skipCache?: boolean },
) {
  const tokenGetter = getToken as typeof getToken &
    ((config?: { skipCache?: boolean }) => Promise<string | null>);
  return tokenGetter(options);
}

async function parseApiError(res: Response) {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? `API error ${res.status}`;
}

/** Fetch helper that attaches the Clerk session token. */
async function fetchApi(
  path: string,
  getToken: ClerkTokenGetter,
  init?: RequestInit,
) {
  const token = await getClerkToken(getToken);
  if (!token) throw new Error("Not authenticated");

  const makeRequest = (bearer: string) =>
    fetch(`${CANVAS_API}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${bearer}`,
        ...(init?.body && typeof init.body === "string"
          ? { "Content-Type": "application/json" }
          : {}),
      },
    });

  let res = await makeRequest(token);

  // Clerk can briefly hand out a stale cached token while rotating sessions.
  // Retry once with a fresh token before surfacing an auth error to the UI.
  if (res.status === 401) {
    const freshToken = await getClerkToken(getToken, { skipCache: true });
    if (freshToken && freshToken !== token) {
      res = await makeRequest(freshToken);
    }
  }

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json();
}

/** Create or get the current user's room. */
export function createRoom(getToken: ClerkTokenGetter): Promise<CanvasRoom> {
  return fetchApi("/api/rooms", getToken, { method: "POST" });
}

/** Get the current user's room. */
export function getMyRoom(getToken: ClerkTokenGetter): Promise<CanvasRoom> {
  return fetchApi("/api/rooms/me", getToken);
}

/** List all rooms the user can access (own + invited). */
export function getAccessibleRooms(
  getToken: ClerkTokenGetter,
): Promise<AccessibleRoom[]> {
  return fetchApi("/api/rooms/accessible", getToken);
}

/** Update room config. */
export function updateRoom(
  roomId: string,
  data: { twitchChannel?: string | null; allowedUsers?: string[] },
  getToken: ClerkTokenGetter,
): Promise<CanvasRoom> {
  return fetchApi(`/api/rooms/${roomId}`, getToken, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Regenerate the OBS room secret. */
export function regenerateSecret(
  roomId: string,
  getToken: ClerkTokenGetter,
): Promise<{ ok: boolean; obsSecret: string }> {
  return fetchApi(`/api/rooms/${roomId}/regenerate-secret`, getToken, {
    method: "POST",
  });
}

/** Mint a short-lived editor WebSocket token. */
export function getEditorWsToken(
  roomId: string,
  getToken: ClerkTokenGetter,
): Promise<{ token: string; roomId: string; expiresIn: number }> {
  return fetchApi(`/api/rooms/${roomId}/ws-token`, getToken, {
    method: "POST",
  });
}

/** Mint a short-lived editor access URL for uploaded room media. */
export function getUploadAccessUrl(
  roomId: string,
  uploadId: string,
  getToken: ClerkTokenGetter,
): Promise<{ url: string; expiresIn: number }> {
  return fetchApi(`/api/rooms/${roomId}/uploads/${uploadId}/access-url`, getToken);
}

/** Exchange an OBS bootstrap secret for a short-lived WS token (unauthenticated). */
export async function exchangeObsToken(secret: string): Promise<{
  token: string;
  roomId: string;
  twitchChannel: string | null;
  expiresIn: number;
}> {
  const res = await fetch(`${CANVAS_API}/obs/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Token exchange failed`,
    );
  }
  return res.json();
}

/** Mint a short-lived OBS access URL for uploaded room media. */
export async function getObsUploadAccessUrl(
  uploadId: string,
  secret: string,
): Promise<{ url: string; expiresIn: number }> {
  const res = await fetch(
    `${CANVAS_API}/obs/uploads/${encodeURIComponent(uploadId)}/access-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Upload access failed`,
    );
  }
  return res.json();
}

/** Upload a file to a room. Returns the upload URL. */
export async function uploadFile(
  roomId: string,
  file: File,
  getToken: ClerkTokenGetter,
): Promise<{ id: string; url: string; filename: string }> {
  const token = await getClerkToken(getToken);
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("file", file);

  const makeRequest = (bearer: string) =>
    fetch(`${CANVAS_API}/api/rooms/${roomId}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}` },
      body: formData,
    });

  let res = await makeRequest(token);
  if (res.status === 401) {
    const freshToken = await getClerkToken(getToken, { skipCache: true });
    if (freshToken && freshToken !== token) {
      res = await makeRequest(freshToken);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Upload failed`);
  }
  return res.json();
}

export async function resolveEditorUploadUrl(
  roomId: string,
  src: string,
  getToken: ClerkTokenGetter,
  options: UploadUrlResolveOptions = {},
): Promise<string> {
  const uploadId = extractCanvasUploadId(src);
  if (!uploadId) return src;
  return resolveCachedUploadAccessUrl(
    `editor:${roomId}:${uploadId}`,
    options,
    async () => getUploadAccessUrl(roomId, uploadId, getToken),
  );
}

export function getEditorUploadUrlRefreshDelayMs(
  roomId: string,
  src: string,
): UploadUrlRefreshDelayMs {
  const uploadId = extractCanvasUploadId(src);
  if (!uploadId) return undefined;
  return getCachedUploadUrlRefreshDelayMs(`editor:${roomId}:${uploadId}`);
}

export async function resolveObsUploadUrl(
  src: string,
  obsSecret: string,
  options: UploadUrlResolveOptions = {},
): Promise<string> {
  const uploadId = extractCanvasUploadId(src);
  if (!uploadId) return src;
  return resolveCachedUploadAccessUrl(`obs:${uploadId}`, options, async () =>
    getObsUploadAccessUrl(uploadId, obsSecret),
  );
}

export function getObsUploadUrlRefreshDelayMs(
  src: string,
): UploadUrlRefreshDelayMs {
  const uploadId = extractCanvasUploadId(src);
  if (!uploadId) return undefined;
  return getCachedUploadUrlRefreshDelayMs(`obs:${uploadId}`);
}

async function resolveCachedUploadAccessUrl(
  cacheKey: string,
  options: UploadUrlResolveOptions,
  mintAccessUrl: () => Promise<{ url: string; expiresIn: number }>,
): Promise<string> {
  const now = Date.now();
  const cached = uploadAccessUrlCache.get(cacheKey);
  if (
    !options.forceRefresh &&
    cached &&
    cached.expiresAt - UPLOAD_ACCESS_CACHE_SKEW_MS > now
  ) {
    return cached.url;
  }
  if (!options.forceRefresh && cached?.pending) {
    return cached.pending;
  }

  const pending = mintAccessUrl()
    .then((access) => {
      const resolvedUrl = absoluteCanvasUrl(access.url);
      uploadAccessUrlCache.set(cacheKey, {
        url: resolvedUrl,
        expiresAt: Date.now() + access.expiresIn * 1000,
      });
      return resolvedUrl;
    })
    .catch((error) => {
      uploadAccessUrlCache.delete(cacheKey);
      throw error;
    });
  uploadAccessUrlCache.set(cacheKey, {
    url: cached?.url ?? "",
    expiresAt: cached?.expiresAt ?? 0,
    pending,
  });
  return pending;
}

function getCachedUploadUrlRefreshDelayMs(
  cacheKey: string,
): Exclude<UploadUrlRefreshDelayMs, undefined> {
  const cached = uploadAccessUrlCache.get(cacheKey);
  if (!cached || cached.pending) return null;
  return Math.max(0, cached.expiresAt - Date.now() - UPLOAD_ACCESS_CACHE_SKEW_MS);
}

export function absoluteCanvasUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = CANVAS_API.replace(/\/+$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

function extractCanvasUploadId(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src, "http://canvas.local");
  } catch {
    return null;
  }

  if (/^https?:\/\//i.test(src) && !isCanvasApiOrigin(url)) {
    return null;
  }

  const marker = "/uploads/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  const tail = url.pathname.slice(markerIndex + marker.length);
  const [uploadId] = tail.split("/");
  return uploadId || null;
}

function isCanvasApiOrigin(url: URL): boolean {
  if (CANVAS_API.startsWith("/")) {
    return typeof window !== "undefined" && url.origin === window.location.origin;
  }

  try {
    return url.origin === new URL(CANVAS_API).origin;
  } catch {
    return false;
  }
}

/** Build an absolute WebSocket URL, handling both relative and absolute CANVAS_API. */
function buildWsUrl(roomId: string, token: string): string {
  let base: string;
  if (CANVAS_API.startsWith("/")) {
    // Relative path — construct from current page origin
    const proto =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    const host =
      typeof window !== "undefined" ? window.location.host : "localhost";
    base = `${proto}//${host}${CANVAS_API}`;
  } else {
    base = CANVAS_API.replace(/^http/, "ws");
  }
  return `${base}/ws?roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`;
}

export const buildEditorWsUrl = buildWsUrl;
export const buildObsWsUrl = buildWsUrl;
