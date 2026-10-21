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
  readonly resume: () => void;
};
type ScriptState = {
  readonly element: HTMLScriptElement;
  status: "loading" | "loaded";
};
const documentState = {
  config: undefined as AnalyticsTransport["config"] | undefined,
  activeInstance: undefined as AnalyticsTransport | undefined,
  tracker: undefined as Umami | undefined,
  scripts: new Map<string, ScriptState>(),
  recorderRunning: false,
  transportInstalled: false,
  reloading: false,
  guardedEndpoints: new Set<string>(),
};
const blockedResponse = () => new Response("{}", { status: 200 });

function sameConfig(
  first: AnalyticsTransport["config"] | undefined,
  second: AnalyticsTransport["config"],
) {
  return (
    first?.host === second.host &&
    first.website === second.website &&
    first.domains === second.domains
  );
}

function recorderEndpoint(website: string) {
  return `/api/websites/${website}/recorder`;
}

function currentTransport(url: URL) {
  const { activeInstance, config, reloading } = documentState;
  if (
    reloading ||
    !config ||
    !activeInstance?.allowed() ||
    !sameConfig(config, activeInstance.config) ||
    url.origin !== config.host
  )
    return undefined;
  if (
    ["/api/send", "/api/record", recorderEndpoint(config.website)].includes(
      url.pathname,
    )
  )
    return activeInstance;
  return undefined;
}

async function recorderSettings(response: Response, url: URL) {
  if (!currentTransport(url)) return blockedResponse();
  if (!response.ok) return response;
  const settings = await response.json();
  if (!currentTransport(url)) return blockedResponse();
  // Sampling/enabled flags remain controlled by the self-hosted Umami admin.
  return Response.json({
    ...settings,
    maskLevel: "strict",
    blockSelector:
      "[data-telemetry-private],.cl-rootBox,.cl-modalBackdrop,canvas,iframe,video,audio,img,svg",
  });
}

async function sendAnalytics(
  nativeFetch: typeof fetch,
  url: URL,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const instance = currentTransport(url);
  if (!instance) return blockedResponse();
  const options: RequestInit = {
    ...init,
    referrerPolicy: "no-referrer",
    credentials: "omit",
  };
  if (url.pathname === recorderEndpoint(instance.config.website)) {
    const response = await nativeFetch(input, options);
    return recorderSettings(response, url);
  }
  if (typeof init?.body !== "string") return blockedResponse();
  const body = JSON.parse(init.body) as {
    type: string;
    payload: Record<string, unknown>;
  };
  if (url.pathname === "/api/send" && body.type === "event") {
    body.payload = { ...body.payload, ...instance.payload() };
  } else if (url.pathname === "/api/record") {
    body.payload = {
      ...body.payload,
      events: scrubRecording(body.payload.events),
    };
  } else return blockedResponse();
  const response = await nativeFetch(input, {
    ...options,
    body: JSON.stringify(body),
  });
  return currentTransport(url) ? response : blockedResponse();
}

function installTransport(config: AnalyticsTransport["config"]) {
  for (const path of [
    "/api/send",
    "/api/record",
    recorderEndpoint(config.website),
  ])
    documentState.guardedEndpoints.add(`${config.host}${path}`);
  if (documentState.transportInstalled) return;
  documentState.transportInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  // One document-wide guard survives unmounts and boundary recovery. Keep old
  // endpoints guarded too, so a retired recorder cannot flush after config changes.
  window.fetch = async (input, init) => {
    const url = new URL(fetchInputUrl(input), window.location.href);
    if (!documentState.guardedEndpoints.has(`${url.origin}${url.pathname}`))
      return nativeFetch(input, init);
    return sendAnalytics(nativeFetch, url, input, init);
  };
}

function reloadDocument(reload: () => void) {
  if (documentState.reloading) return;
  documentState.reloading = true;
  setAnalyticsTracker();
  documentState.scripts.forEach(({ element }) => {
    element.remove();
  });
  reload();
}

function loadScript(name: "script" | "recorder") {
  const { config, activeInstance, scripts } = documentState;
  if (!config || !activeInstance?.allowed()) return;
  const src = `${config.host}/${name}.js`;
  if (scripts.has(src)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.dataset.websiteId = config.website;
  script.dataset.domains = config.domains;
  script.dataset.autoTrack = "false";
  script.dataset.excludeSearch = "true";
  script.dataset.excludeHash = "true";
  const state: ScriptState = { element: script, status: "loading" };
  script.onload = () => {
    if (scripts.get(src) !== state || state.status !== "loading") return;
    state.status = "loaded";
    if (name === "script") documentState.tracker ??= window.umami;
    else documentState.recorderRunning = true;
    documentState.activeInstance?.resume();
  };
  script.onerror = () => {
    if (scripts.get(src) !== state || state.status !== "loading") return;
    script.remove();
    scripts.delete(src);
  };
  scripts.set(src, state);
  document.head.append(script);
}

export function createAnalytics(
  config: NonNullable<TelemetryConfig["umami"]>,
  reload = () => window.location.reload(),
) {
  let consent = false;
  let disposed = false;
  let route = "";
  const ownsTransport = () => documentState.activeInstance === instance;
  const allowed = () =>
    !disposed &&
    !documentState.reloading &&
    ownsTransport() &&
    sameConfig(documentState.config, config) &&
    analyticsAllowed(config, consent, window.location, navigator.userAgent);
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
    const next = window.location.pathname;
    if (!allowed() || !documentState.tracker || route === next) return;
    route = next;
    void documentState.tracker.track(payload());
  }
  function resume() {
    if (!allowed()) return;
    if (documentState.tracker) {
      pageview();
      if (!documentState.recorderRunning) loadScript("recorder");
    } else loadScript("script");
  }
  const instance = { config, allowed, payload, resume };
  installTransport(config);
  documentState.activeInstance = instance;
  setAnalyticsTracker();
  if (
    documentState.scripts.size > 0 &&
    !sameConfig(documentState.config, config)
  )
    reloadDocument(reload);
  else if (!documentState.reloading) documentState.config = { ...config };
  return {
    pageview,
    setConsent(accepted: boolean) {
      if (disposed || documentState.reloading || !ownsTransport()) return;
      const withdrawing =
        consent && !accepted && documentState.scripts.size > 0;
      consent = accepted;
      setAnalyticsTracker(
        accepted
          ? (name, data) => {
              if (allowed())
                void documentState.tracker?.track({ ...payload(), name, data });
            }
          : undefined,
      );
      resume();
      if (withdrawing) reloadDocument(reload);
    },
    dispose(enteringOverlay = false) {
      disposed = true;
      consent = false;
      const current = ownsTransport();
      if (current) {
        documentState.activeInstance = undefined;
        setAnalyticsTracker();
      }
      // Scripts and their running observers belong to the document. A successor
      // reuses them, including a tracker that finishes loading during recovery.
      // A fresh document is necessary to remove recorder/history listeners.
      if (
        documentState.scripts.size > 0 &&
        enteringOverlay &&
        (current || !documentState.activeInstance)
      )
        reloadDocument(reload);
    },
  };
}
