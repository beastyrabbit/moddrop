export type LegalLanguage = "de" | "en";

export const controller = {
  name: "Tobias Heer",
  careOf: "c/o Impressumservice Dein-Impressum",
  street: "Stettiner Str. 41",
  city: "35410 Hungen",
  country: { de: "Deutschland", en: "Germany" },
  legalEmail: "impressum-moddrop@heerlab.com",
  privacyEmail: "datenschutz-moddrop@heerlab.com",
  contactUrl: "https://beastyrabbit.com/kontakt?from=moddrop",
  updated: "2026-10-21",
} as const;

export function ControllerAddress({ language }: { language: LegalLanguage }) {
  return (
    <address className="not-italic">
      {controller.name}
      <br />
      {controller.careOf}
      <br />
      {controller.street}
      <br />
      {controller.city}
      <br />
      {controller.country[language]}
    </address>
  );
}
