import { safePath } from "@/backend/stream-canvas/src/telemetry/scrub";
import type { TelemetryConfig } from "./config";
import { setAnalyticsTracker } from "./events";

type Umami = { track: (payload: Record<string, unknown>) => Promise<void> };
declare global {
  interface Window {
    umami?: Umami;
  }
}

export const isOverlay = (path: string) =>
  path === "/obs" || path.startsWith("/obs/");
export const isBot = (agent: string) =>
  /bot|crawler|spider|headless|slurp|bingpreview/i.test(agent);

export function analyticsAllowed(
  config: NonNullable<TelemetryConfig["umami"]>,
  consent: boolean,
  location: Pick<Location, "hostname" | "pathname">,
  agent: string,
) {
  return (
    consent &&
    !isOverlay(location.pathname) &&
    !isBot(agent) &&
    config.domains
      .split(",")
      .map((domain) => domain.trim())
      .includes(location.hostname)
  );
}

// rrweb serializes text, attributes, CSS, URLs and sometimes fragmented snapshots.
// Retain structure, static app styling and coordinates. Fragment strings cannot be safely
// scrubbed independently, so discard them. Never send form, image or media values.
export function scrubRecording(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (key === "type" && ["click", "scroll"].includes(value)) return value;
    if (key === "tag" && value === "url-change") return value;
    if (key === "name" && value === "html") return value;
    if (["publicId", "systemId"].includes(key)) return "";
    if (["url", "href"].includes(key)) return recordingUrl(value);
    if (key === "textContent") return value.replace(/\S/g, "*");
    if (key === "tagName" && /^[a-z][a-z0-9-]*$/i.test(value)) return value;
    return "*";
  }
  if (Array.isArray(value))
    return value
      .filter(
        (item) =>
          !(
            item &&
            typeof item === "object" &&
            "type" in item &&
            item.type === "umami:rrweb-event-fragment"
          ),
      )
      .map((item) => scrubRecording(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        name === "attributes" && !Array.isArray(item)
          ? recordingAttributes(item)
          : scrubRecording(item, name),
      ]),
    );
  }
  return value;
}

function recordingUrl(value: string) {
  return `${typeof window === "undefined" ? "" : window.location.origin}${safePath(value)}`;
}

function recordingAttributes(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const attrs = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  // Classes are application-defined; no Moddrop component puts account or room
  // values in class names. Never retain IDs, data-*, input values or media srcs.
  if (typeof attrs.class === "string") result.class = attrs.class;
  if (typeof attrs.style === "string") {
    result.style = attrs.style
      .split(";")
      .filter((declaration) =>
        /^\s*(?:(?:min-|max-)?width|(?:min-|max-)?height|top|left|right|bottom)\s*:\s*-?[\d.]+(?:px|%|vh|vw|rem|em)?\s*$/.test(
          declaration,
        ),
      )
      .join(";");
  }
  if (
    typeof attrs.href === "string" &&
    /^\/_next\/static\/[\w/.-]+\.css$/.test(safePath(attrs.href))
  ) {
    result.href = recordingUrl(attrs.href);
    result.rel = "stylesheet";
    // Only CSS bundled with this app is retained. Strip URL references so
    // playback cannot fetch media/font payloads through serialized styles.
    if (typeof attrs._cssText === "string")
      result._cssText = attrs._cssText.replace(/url\([^)]*\)/gi, "none");
  }
  return result;
}

export function createAnalytics(
  config: NonNullable<TelemetryConfig["umami"]>,
  reload = () => window.location.reload(),
) {
  let consent = false;
  let loaded = false;
  let route = "";
  const originalFetch = window.fetch.bind(window);
  const allowed = () =>
    analyticsAllowed(config, consent, window.location, navigator.userAgent);
  const scripts: HTMLScriptElement[] = [];
  const payload = () => ({
    website: config.website,
    hostname: window.location.hostname,
    url: recordingUrl(window.location.href),
    referrer: "",
    title: "Moddrop",
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
  });
  function pageview() {
    const next = safePath(window.location.href);
    if (!allowed() || !window.umami || route === next) return;
    route = next;
    void window.umami.track(payload());
  }
  function loadScript(name: string) {
    const script = document.createElement("script");
    script.src = `${config.host}/${name}.js`;
    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.dataset.websiteId = config.website;
    script.dataset.domains = config.domains;
    script.dataset.autoTrack = "false";
    script.dataset.excludeSearch = "true";
    script.dataset.excludeHash = "true";
    script.onload = () => {
      if (name === "script" && allowed()) {
        pageview();
        loadScript("recorder");
      }
    };
    scripts.push(script);
    document.head.append(script);
  }
  // The recorder has neither a before-send hook nor URL exclusions. Restrict
  // this guard to the configured Umami origin, and keep it installed until reload
  // so unload flushes cannot send data after withdrawal or navigation to OBS.
  window.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      window.location.href,
    );
    if (
      url.origin !== config.host ||
      ![
        "/api/send",
        "/api/record",
        `/api/websites/${config.website}/recorder`,
      ].includes(url.pathname)
    )
      return originalFetch(input, init);
    if (!allowed()) return new Response("{}", { status: 200 });
    if (url.pathname === "/api/send" && typeof init?.body === "string") {
      const body = JSON.parse(init.body) as {
        type: string;
        payload: Record<string, unknown>;
      };
      if (body.type !== "event") return new Response("{}");
      body.payload = { ...body.payload, ...payload() };
      return originalFetch(input, {
        ...init,
        referrerPolicy: "no-referrer",
        credentials: "omit",
        body: JSON.stringify(body),
      });
    }
    if (url.pathname === "/api/record" && typeof init?.body === "string") {
      const body = JSON.parse(init.body) as {
        type: string;
        payload: { website: string; timestamp: number; events: unknown[] };
      };
      const events = scrubRecording(body.payload.events);
      return originalFetch(input, {
        ...init,
        referrerPolicy: "no-referrer",
        credentials: "omit",
        body: JSON.stringify({ ...body, payload: { ...body.payload, events } }),
      });
    }
    if (url.pathname === `/api/websites/${config.website}/recorder`) {
      const response = await originalFetch(input, {
        ...init,
        referrerPolicy: "no-referrer",
        credentials: "omit",
      });
      if (!response.ok) return response;
      const settings = await response.json();
      // Sampling/enabled flags remain controlled by the self-hosted Umami admin.
      return Response.json({
        ...settings,
        maskLevel: "strict",
        blockSelector:
          "[data-telemetry-private],.cl-rootBox,.cl-modalBackdrop,canvas,iframe,video,audio,img,svg",
      });
    }
    return new Response("{}", { status: 200 });
  };
  return {
    pageview,
    setConsent(accepted: boolean) {
      const withdrawing = consent && !accepted && loaded;
      consent = accepted;
      setAnalyticsTracker(
        accepted
          ? (name, data) => {
              if (allowed())
                void window.umami?.track({ ...payload(), name, data });
            }
          : undefined,
      );
      if (allowed() && !loaded) {
        loaded = true;
        loadScript("script");
      }
      if (withdrawing) {
        scripts.forEach((script) => {
          script.remove();
        });
        reload();
      }
    },
    dispose(enteringOverlay = false) {
      consent = false;
      setAnalyticsTracker();
      scripts.forEach((script) => {
        script.remove();
      });
      // A fresh document is necessary to remove recorder/history listeners.
      if (loaded && enteringOverlay) reload();
      else if (!loaded) window.fetch = originalFetch;
    },
  };
}
