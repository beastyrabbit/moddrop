import type { LegalLanguage } from "./controller";

const rows = {
  de: [
    [
      "__client_uat; __client_uat_<suffix>",
      "Clerk",
      "Cookie, Aktualisierungsstand der Anmeldung",
      "ca. 400 Tage, beobachtet",
      "technisch erforderlich, § 25 Abs. 2 Nr. 2 TDDDG",
    ],
    [
      "__clerk_environment",
      "Clerk",
      "localStorage, Anmeldekonfiguration",
      "ohne automatische Ablauffrist, beobachtet",
      "technisch erforderlich, § 25 Abs. 2 Nr. 2 TDDDG",
    ],
    [
      "__session (moddrop.live)",
      "Clerk",
      "Cookie, kurzlebiges Sitzungstoken",
      "60 Sekunden Tokenlaufzeit, regelmäßig erneuert; Clerk-Dokumentation",
      "technisch erforderlich, § 25 Abs. 2 Nr. 2 TDDDG",
    ],
    [
      "__client (clerk.moddrop.live)",
      "Clerk",
      "Cookie, Authentifizierung bei der Clerk-Frontend-API",
      "browserabhängige Laufzeit; Clerk-Dokumentation",
      "technisch erforderlich, § 25 Abs. 2 Nr. 2 TDDDG",
    ],
    [
      "moddrop:obsSetupSecret:<roomId>",
      "Moddrop",
      "sessionStorage, einmalige Zugangsschlüsselübergabe",
      "Tabsitzung, aus Code",
      "technisch erforderlich",
    ],
    [
      "moddrop:media-preferences:v1:<userId>:<roomId>",
      "Moddrop",
      "localStorage, Lautstärke und Stummschaltung",
      "ohne automatische Ablauffrist, aus Code",
      "Präferenz; Erforderlichkeit offen",
    ],
    [
      "TLDRAW_USER_DATA_v3",
      "Moddrop (Editor-Bibliothek)",
      "localStorage, Editor-Nutzerpräferenzen",
      "ohne automatische Ablauffrist, aus Code",
      "Präferenz; Erforderlichkeit offen",
    ],
    [
      "TLDRAW_TAB_ID_v2",
      "Moddrop (Editor-Bibliothek)",
      "sessionStorage, Tab-Zustand",
      "Tabsitzung, aus Code",
      "technisch erforderlicher Sitzungszustand",
    ],
  ],
  en: [
    [
      "__client_uat; __client_uat_<suffix>",
      "Clerk",
      "Cookie, authentication update marker",
      "approx. 400 days, observed",
      "strictly necessary, Section 25(2) no. 2 TDDDG",
    ],
    [
      "__clerk_environment",
      "Clerk",
      "localStorage, authentication configuration",
      "no automatic expiry, observed",
      "strictly necessary, Section 25(2) no. 2 TDDDG",
    ],
    [
      "__session (moddrop.live)",
      "Clerk",
      "Cookie, short-lived session token",
      "60-second token lifetime, refreshed regularly; Clerk documentation",
      "strictly necessary, Section 25(2) no. 2 TDDDG",
    ],
    [
      "__client (clerk.moddrop.live)",
      "Clerk",
      "Cookie, authentication with the Clerk frontend API",
      "browser-dependent lifetime; Clerk documentation",
      "strictly necessary, Section 25(2) no. 2 TDDDG",
    ],
    [
      "moddrop:obsSetupSecret:<roomId>",
      "Moddrop",
      "sessionStorage, one-time access-secret handover",
      "tab session, from code",
      "strictly necessary",
    ],
    [
      "moddrop:media-preferences:v1:<userId>:<roomId>",
      "Moddrop",
      "localStorage, volume and mute",
      "no automatic expiry, from code",
      "preference; necessity unresolved",
    ],
    [
      "TLDRAW_USER_DATA_v3",
      "Moddrop (editor library)",
      "localStorage, editor user preferences",
      "no automatic expiry, from code",
      "preference; necessity unresolved",
    ],
    [
      "TLDRAW_TAB_ID_v2",
      "Moddrop (editor library)",
      "sessionStorage, tab state",
      "tab session, from code",
      "necessary session state",
    ],
  ],
} as const;

export function StorageTable({ language }: { language: LegalLanguage }) {
  const headings =
    language === "de"
      ? [
          "Name",
          "Anbieter",
          "Speicher / Zweck",
          "Dauer / Nachweis",
          "Einordnung",
        ]
      : [
          "Name",
          "Provider",
          "Storage / purpose",
          "Duration / evidence",
          "Classification",
        ];
  return (
    <section
      className="overflow-x-auto"
      aria-label={language === "de" ? "Browserspeicher" : "Browser storage"}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b border-border p-3 align-top"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows[language].map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th
                    key={cell}
                    scope="row"
                    className="max-w-56 break-words border-b border-border p-3 align-top font-normal"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={cell}
                    className="border-b border-border p-3 align-top"
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
