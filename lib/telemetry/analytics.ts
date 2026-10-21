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
  if (typeof value === "string") return recordingString(value, key);
  if (Array.isArray(value))
    return value
      .filter((item) => !isRecordingFragment(item))
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

function recordingString(value: string, key: string) {
  if (key === "type" && ["click", "scroll"].includes(value)) return value;
  if (key === "tag" && value === "url-change") return value;
  if (key === "name" && value === "html") return value;
  if (["publicId", "systemId"].includes(key)) return "";
  if (["url", "href"].includes(key)) return recordingUrl(value);
  if (key === "textContent") return value.replace(/\S/g, "*");
  if (key === "tagName" && /^[a-z][a-z0-9-]*$/i.test(value)) return value;
  return "*";
}

function isRecordingFragment(item: unknown) {
  return (
    item &&
    typeof item === "object" &&
    "type" in item &&
    item.type === "umami:rrweb-event-fragment"
  );
}

function isLayoutDeclaration(declaration: string) {
  const colon = declaration.indexOf(":");
  if (colon === -1) return false;
  const property = declaration.slice(0, colon).trim();
  const value = declaration.slice(colon + 1).trim();
  return (
    /^(width|height|min-width|max-width|min-height|max-height|top|left|right|bottom)$/.test(
      property,
    ) && /^-?[\d.]+(px|%|vh|vw|rem|em)?$/.test(value)
  );
}

function fetchInputUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
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
    result.style = attrs.style.split(";").filter(isLayoutDeclaration).join(";");
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

type AnalyticsTransport = {
  readonly config: NonNullable<TelemetryConfig["umami"]>;
  readonly allowed: () => boolean;
  readonly payload: () => Record<string, unknown>;
};
let activeInstance: AnalyticsTransport | undefined;
let transportInstalled = false;
let analyticsLoaded = false;
const guardedEndpoints = new Set<string>();
const blockedResponse = () => new Response("{}", { status: 200 });

function recorderEndpoint(website: string) {
  return `/api/websites/${website}/recorder`;
}

async function sendAnalytics(
  instance: AnalyticsTransport,
  nativeFetch: typeof fetch,
  path: string,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const options: RequestInit = {
    ...init,
    referrerPolicy: "no-referrer",
    credentials: "omit",
  };
  if (path === recorderEndpoint(instance.config.website)) {
    const response = await nativeFetch(input, options);
    if (!response.ok) return response;
    const settings = await response.json();
    if (activeInstance !== instance || !instance.allowed())
      return blockedResponse();
    // Sampling/enabled flags remain controlled by the self-hosted Umami admin.
    return Response.json({
      ...settings,
      maskLevel: "strict",
      blockSelector:
        "[data-telemetry-private],.cl-rootBox,.cl-modalBackdrop,canvas,iframe,video,audio,img,svg",
    });
  }
  if (typeof init?.body !== "string") return blockedResponse();
  const body = JSON.parse(init.body) as {
    type: string;
    payload: Record<string, unknown>;
  };
  if (path === "/api/send" && body.type === "event") {
    body.payload = { ...body.payload, ...instance.payload() };
  } else if (path === "/api/record") {
    body.payload = {
      ...body.payload,
      events: scrubRecording(body.payload.events),
    };
  } else return blockedResponse();
  return nativeFetch(input, { ...options, body: JSON.stringify(body) });
}

function installTransport(config: AnalyticsTransport["config"]) {
  for (const path of [
    "/api/send",
    "/api/record",
    recorderEndpoint(config.website),
  ])
    guardedEndpoints.add(`${config.host}${path}`);
  if (transportInstalled) return;
  transportInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  // One document-wide guard survives unmounts and boundary recovery. Keep old
  // endpoints guarded too, so a retired recorder cannot flush after config changes.
  window.fetch = async (input, init) => {
    const url = new URL(fetchInputUrl(input), window.location.href);
    if (!guardedEndpoints.has(`${url.origin}${url.pathname}`))
      return nativeFetch(input, init);
    const instance = activeInstance;
    if (!instance?.allowed() || url.origin !== instance.config.host)
      return blockedResponse();
    return sendAnalytics(instance, nativeFetch, url.pathname, input, init);
  };
}

export function createAnalytics(
  config: NonNullable<TelemetryConfig["umami"]>,
  reload = () => window.location.reload(),
) {
  let consent = false;
  let disposed = false;
  let loaded = false;
  let stopping = false;
  let tracker: Umami | undefined;
  let route = "";
  const ownsTransport = () => activeInstance === instance;
  const allowed = () =>
    !disposed &&
    !stopping &&
    ownsTransport() &&
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
    if (!allowed() || !tracker || route === next) return;
    route = next;
    void tracker.track(payload());
  }
  function loadScript(name: string) {
    if (!allowed()) return;
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
        tracker = window.umami;
        pageview();
        loadScript("recorder");
      }
    };
    scripts.push(script);
    document.head.append(script);
  }
  const instance = { config, allowed, payload };
  installTransport(config);
  activeInstance = instance;
  setAnalyticsTracker();
  return {
    pageview,
    setConsent(accepted: boolean) {
      if (disposed || stopping || !ownsTransport()) return;
      const withdrawing = consent && !accepted && loaded;
      consent = accepted;
      setAnalyticsTracker(
        accepted
          ? (name, data) => {
              if (allowed()) void tracker?.track({ ...payload(), name, data });
            }
          : undefined,
      );
      if (allowed() && !loaded) {
        loaded = true;
        analyticsLoaded = true;
        loadScript("script");
      }
      if (withdrawing) {
        stopping = true;
        scripts.forEach((script) => {
          script.remove();
        });
        reload();
      }
    },
    dispose(enteringOverlay = false) {
      disposed = true;
      consent = false;
      const current = ownsTransport();
      if (current) {
        activeInstance = undefined;
        setAnalyticsTracker();
      }
      scripts.forEach((script) => {
        script.remove();
      });
      // A fresh document is necessary to remove recorder/history listeners.
      if (analyticsLoaded && enteringOverlay && (current || !activeInstance)) {
        analyticsLoaded = false;
        reload();
      }
    },
  };
}
