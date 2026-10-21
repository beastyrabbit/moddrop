export type AnalyticsEvents = {
  auth_started: { flow: "sign_in" | "sign_up" };
  auth_completed: { flow: "sign_in" | "sign_up" };
  room_created: Record<string, never>;
  room_opened: Record<string, never>;
  obs_link_copied: Record<string, never>;
  obs_link_regenerated: Record<string, never>;
  settings_changed: { moderators: boolean; youtube: boolean; twitch: boolean };
  media_added: {
    type: "image" | "video" | "audio" | "youtube" | "twitch" | "embed";
  };
  upload_succeeded: { type: "image" | "video" | "audio" | "other" };
  upload_failed: { reason: "network" | "rejected" | "authentication" };
  failure: {
    operation: "api" | "room" | "canvas";
    reason: "network" | "rejected";
  };
  outbound_link: { host: string };
  web_vital: { name: string; value: number; rating: string };
};
type Tracker = <K extends keyof AnalyticsEvents>(
  name: K,
  data: AnalyticsEvents[K],
) => void;
let tracker: Tracker | undefined;
let authFlow: "sign_in" | "sign_up" | undefined;
export function beginAuth(flow: "sign_in" | "sign_up") {
  if (!tracker) return;
  if (authFlow !== flow) track("auth_started", { flow });
  authFlow = flow;
}
export function completeAuth() {
  if (authFlow) track("auth_completed", { flow: authFlow });
  authFlow = undefined;
}
export function setAnalyticsTracker(value?: Tracker) {
  tracker = value;
  if (!value) authFlow = undefined;
}
export function track<K extends keyof AnalyticsEvents>(
  name: K,
  data: AnalyticsEvents[K],
) {
  tracker?.(name, data);
}

export function vitalEvent(metric: {
  name: string;
  value: number;
  rating: string;
}) {
  return {
    name: metric.name,
    value: Math.round(metric.value * (metric.name === "CLS" ? 1000 : 1)),
    rating: metric.rating,
  };
}
export function outboundHost(
  target: EventTarget | null,
  origin: string,
): string | undefined {
  const anchor = target instanceof Element ? target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return;
  try {
    const url = new URL(anchor.href, origin);
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin)
      return url.hostname;
  } catch {
    /* Ignore non-web links. */
  }
}
