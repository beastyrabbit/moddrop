import * as CookieConsent from "vanilla-cookieconsent";

export const CONSENT_COOKIE = "moddrop_consent";
export const CONSENT_DAYS = 180;
export function consentLanguage() {
  return ["/datenschutz", "/impressum"].includes(window.location.pathname)
    ? "de"
    : document.documentElement.lang.startsWith("de")
      ? "de"
      : "en";
}
export function syncConsentLanguage() {
  void CookieConsent.setLanguage(consentLanguage());
}
export function showCookieSettings() {
  CookieConsent.showPreferences();
}

export async function startConsent(onAnalytics: (accepted: boolean) => void) {
  await CookieConsent.run({
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
    onConsent: () => onAnalytics(CookieConsent.acceptedCategory("analytics")),
    onChange: () => onAnalytics(CookieConsent.acceptedCategory("analytics")),
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
  onAnalytics(CookieConsent.acceptedCategory("analytics"));
  return () => CookieConsent.reset(false);
}
