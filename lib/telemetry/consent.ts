import * as CookieConsent from "vanilla-cookieconsent";

export const CONSENT_COOKIE = "moddrop_consent";
export const CONSENT_DAYS = 180;
let running = false;
let generation = 0;
let owner:
  | { readonly generation: number; readonly notify: () => void }
  | undefined;
let startup: Promise<unknown> | undefined;
let starting = false;
const listeners = new Set<() => void>();

export function isConsentRunning() {
  return running;
}
export function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function setConsentRunning(value: boolean) {
  running = value;
  for (const listener of listeners) listener();
}

export function isGermanLegalPath(pathname: string) {
  let end = pathname.length;
  while (end > 0 && pathname[end - 1] === "/") end--;
  const path = pathname.slice(0, end);
  return path === "/datenschutz" || path === "/impressum";
}

export function consentLanguage() {
  if (isGermanLegalPath(window.location.pathname)) return "de";
  return document.documentElement.lang.startsWith("de") ? "de" : "en";
}
export function syncConsentLanguage() {
  void CookieConsent.setLanguage(consentLanguage());
}
export function showCookieSettings() {
  CookieConsent.showPreferences();
}

function runConsent() {
  // CookieConsent is a singleton: overlapping callers share initialization and
  // its callbacks always address the current owner, including after remount.
  const notify = () => owner?.notify();
  return CookieConsent.run({
    cookie: {
      name: CONSENT_COOKIE,
      expiresAfterDays: CONSENT_DAYS,
      sameSite: "Lax",
    },
    // Bots receive no analytics either way. Show the UI to make it testable
    // with an ordinary browser UA; there is no production test override.
    hideFromBots: false,
    disablePageInteraction: false,
    guiOptions: {
      consentModal: {
        layout: "box wide",
        position: "bottom left",
        equalWeightButtons: true,
      },
      preferencesModal: { layout: "box", equalWeightButtons: true },
    },
    categories: { necessary: { enabled: true, readOnly: true }, analytics: {} },
    onConsent: notify,
    onChange: notify,
    language: {
      default: consentLanguage(),
      translations: {
        en: {
          consentModal: {
            title: "Your privacy choices",
            description:
              'With your permission, self-hosted Umami measures visits and records masked page interactions for replay and heatmaps. Necessary, storage-free GlitchTip error reporting helps us fix failures. <a href="/privacy">Privacy policy</a>.',
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            showPreferencesBtn: "Preferences",
          },
          preferencesModal: {
            title: "Cookie settings",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            savePreferencesBtn: "Save preferences",
            closeIconLabel: "Close",
            sections: [
              {
                title: "Necessary",
                description:
                  'The moddrop_consent cookie stores your choice and a random receipt ID for 180 days. GlitchTip sends scrubbed error reports and writes no device storage. Other features use Clerk sign-in storage, local media and tldraw preferences, editor session state and an OBS setup hand-off. Twitch and YouTube may use their own cookies. <a href="/privacy">Storage details</a>.',
                linkedCategory: "necessary",
              },
              {
                title: "Analytics, replay and heatmaps",
                description:
                  "Optional Umami pageviews, events, performance measurements and masked interactions. No cookies; nothing is written to localStorage or sessionStorage. Withdrawing consent reloads the page to stop recording.",
                linkedCategory: "analytics",
              },
            ],
          },
        },
        de: {
          consentModal: {
            title: "Ihre Datenschutzauswahl",
            description:
              'Mit Ihrer Einwilligung misst das selbst gehostete Umami Besuche und zeichnet maskierte Seiteninteraktionen für Sitzungsaufzeichnungen und Heatmaps auf. GlitchTip hilft mit bereinigten Fehlerberichten ohne Gerätespeicherung bei der Fehlerbehebung. <a href="/datenschutz">Datenschutzerklärung</a>.',
            acceptAllBtn: "Alle akzeptieren",
            acceptNecessaryBtn: "Alle ablehnen",
            showPreferencesBtn: "Einstellungen",
          },
          preferencesModal: {
            title: "Cookie-Einstellungen",
            acceptAllBtn: "Alle akzeptieren",
            acceptNecessaryBtn: "Alle ablehnen",
            savePreferencesBtn: "Auswahl speichern",
            closeIconLabel: "Schließen",
            sections: [
              {
                title: "Notwendig",
                description:
                  'Das Cookie moddrop_consent speichert Ihre Auswahl und eine zufällige Belegkennung für 180 Tage. GlitchTip sendet bereinigte Fehlerberichte ohne Gerätespeicherung. Weitere Funktionen nutzen Clerk-Anmeldespeicherung, lokale Medien- und tldraw-Einstellungen, Editor-Sitzungszustand und eine OBS-Setup-Übergabe. Twitch und YouTube können eigene Cookies nutzen. <a href="/datenschutz">Speicherdetails</a>.',
                linkedCategory: "necessary",
              },
              {
                title: "Analyse, Sitzungsaufzeichnungen und Heatmaps",
                description:
                  "Optionale Umami-Seitenaufrufe, Ereignisse, Leistungsmessungen und maskierte Interaktionen. Keine Cookies; es werden keine Einträge in localStorage oder sessionStorage geschrieben. Beim Widerruf wird die Seite neu geladen, um die Aufzeichnung zu beenden.",
                linkedCategory: "analytics",
              },
            ],
          },
        },
      },
    },
  });
}

function resetConsent() {
  if (starting) return;
  startup = undefined;
  CookieConsent.reset(false);
}

export async function startConsent(
  onAnalytics: (accepted: boolean) => void,
  signal?: AbortSignal,
) {
  if (signal?.aborted) return () => {};
  const current = ++generation;
  let stopped = false;
  const notify = () => {
    if (owner?.generation === current && !stopped && !signal?.aborted)
      onAnalytics(CookieConsent.acceptedCategory("analytics"));
  };
  const stop = () => {
    signal?.removeEventListener("abort", stop);
    if (stopped) return;
    stopped = true;
    if (owner?.generation !== current) return;
    owner = undefined;
    resetConsent();
    setConsentRunning(false);
  };
  owner = { generation: current, notify };
  signal?.addEventListener("abort", stop, { once: true });
  if (!startup) {
    starting = true;
    startup = runConsent().finally(() => {
      starting = false;
      if (!owner) resetConsent();
    });
  }
  try {
    await startup;
    if (owner?.generation === current) {
      setConsentRunning(true);
      notify();
    }
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}
