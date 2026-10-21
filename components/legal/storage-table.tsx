import type { LegalLanguage } from "./controller";

const rows = {
  de: [
    [
      "Clerk",
      "Anmeldung/Sitzung",
      "Nach den Sitzungs- und Löschregeln von Clerk",
      "technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG)",
    ],
    [
      "Moddrop",
      "Lokale Einstellungen wie Medienlautstärke/Stummschaltung und OBS-Setup-Übergabe",
      "Einstellungen bis zum lokalen Löschen; Übergabe für die Tabsitzung",
      "funktional; OBS-Übergabe technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG)",
    ],
    [
      "tldraw",
      "Editor-Einstellungen und Sitzungszustand",
      "Einstellungen bis zum lokalen Löschen; Sitzungszustand für die Tabsitzung",
      "funktional; Sitzungszustand technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG)",
    ],
    [
      "Twitch / YouTube",
      "Eigene Plattform-Cookies beim Laden von Medien",
      "Nach den Richtlinien der jeweiligen Plattform",
      "Medienanzeige technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG); weitere Verarbeitung nach Plattformrichtlinien",
    ],
  ],
  en: [
    [
      "Clerk",
      "Sign-in/session",
      "Under Clerk's session and deletion rules",
      "technically necessary (Section 25(2) no. 2 TDDDG)",
    ],
    [
      "Moddrop",
      "Local settings such as media volume/mute and OBS setup hand-off",
      "Settings until local deletion; hand-off for the tab session",
      "functional; OBS hand-off technically necessary (Section 25(2) no. 2 TDDDG)",
    ],
    [
      "tldraw",
      "Editor preferences and session state",
      "Preferences until local deletion; session state for the tab session",
      "functional; session state technically necessary (Section 25(2) no. 2 TDDDG)",
    ],
    [
      "Twitch / YouTube",
      "Platforms' own cookies when media loads",
      "Under each platform's policies",
      "media display technically necessary (Section 25(2) no. 2 TDDDG); further processing under platform policies",
    ],
  ],
} as const;

export function StorageTable({ language }: { language: LegalLanguage }) {
  const headings =
    language === "de"
      ? ["Anbieter", "Zweck", "Dauer", "Einordnung"]
      : ["Provider", "Purpose", "Duration", "Classification"];
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
