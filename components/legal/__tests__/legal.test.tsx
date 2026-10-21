import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "@/app/app/layout";
import Datenschutz, {
  metadata as datenschutzMetadata,
} from "@/app/datenschutz/page";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import Impressum, { metadata as impressumMetadata } from "@/app/impressum/page";
import LegalNotice, {
  metadata as legalNoticeMetadata,
} from "@/app/legal-notice/page";
import NotFound from "@/app/not-found";
import OBSError from "@/app/obs/error";
import Privacy, { metadata as privacyMetadata } from "@/app/privacy/page";
import SignInPage from "@/app/sign-in/page";
import { Landing } from "@/components/landing/Landing";
import { ControlLegalFooter } from "../control-legal-footer";
import { controller } from "../controller";
import { LegalDocument } from "../legal-document";

const state = vi.hoisted(() => ({ pathname: "/app" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
  useClerk: () => ({}),
  useUser: () => ({ user: null }),
  SignIn: () => <div>Local authentication fixture</div>,
}));

function expectLinks(html: string) {
  for (const path of ["legal-notice", "privacy", "impressum", "datenschutz"])
    expect(html).toContain(`href="/${path}"`);
}

describe("legal routes", () => {
  const cases: [string, () => React.JSX.Element, Metadata, string][] = [
    [
      "Impressum",
      Impressum,
      impressumMetadata,
      "impressum-moddrop@heerlab.com",
    ],
    [
      "Legal Notice",
      LegalNotice,
      legalNoticeMetadata,
      "impressum-moddrop@heerlab.com",
    ],
    [
      "Datenschutzerklärung",
      Datenschutz,
      datenschutzMetadata,
      "datenschutz-moddrop@heerlab.com",
    ],
    [
      "Privacy Policy",
      Privacy,
      privacyMetadata,
      "datenschutz-moddrop@heerlab.com",
    ],
  ];
  it.each(cases)(
    "renders %s with approved operator data and noindex",
    (title, Page, metadata, email) => {
      const html = renderToStaticMarkup(<Page />);
      for (const text of [
        title,
        "Tobias Heer",
        "c/o Impressumservice Dein-Impressum",
        "Stettiner Str. 41",
        "35410 Hungen",
        email,
      ])
        expect(html).toContain(text);
      expect(metadata.robots).toEqual({ index: false });
      expect(html).not.toContain("[[");
      expect(html).not.toContain("]]");
      expect(html).not.toContain("MODULE");
      expect(html).not.toContain("kontakt@heerlab.com");
      expectLinks(html);
    },
  );
  it("links to the central contact form and dates both policies", () => {
    expect(renderToStaticMarkup(<Impressum />)).toContain(
      'href="https://beastyrabbit.com/kontakt?from=moddrop"',
    );
    expect(renderToStaticMarkup(<LegalNotice />)).toContain(
      'href="https://beastyrabbit.com/kontakt?from=moddrop"',
    );
    for (const Page of [Datenschutz, Privacy])
      expect(renderToStaticMarkup(<Page />)).toContain(
        `dateTime="${controller.updated}"`,
      );
  });
  it.each([
    [Impressum, "Kontaktformular"],
    [LegalNotice, "Contact form"],
  ])("separates the contact lines", (Page, label) => {
    expect(renderToStaticMarkup(<Page />)).toContain(`</a><br/>${label}: `);
  });
  it.each([
    ["de", "22. Oktober 2026"],
    ["en", "22 October 2026"],
  ] as const)(
    "uses the same ISO date for the %s attribute and label",
    (language, label) => {
      const html = renderToStaticMarkup(
        <LegalDocument
          language={language}
          title="Fixture"
          sections={[]}
          updated="2026-10-22"
        />,
      );
      expect(html).toContain(`<time dateTime="2026-10-22">${label}</time>`);
    },
  );
  it.each([
    [
      Datenschutz,
      "bis zu 10 Jahre",
      "Zur Datensicherung werden regelmäßig Sicherungskopien innerhalb der eigenen Infrastruktur erstellt; sie werden nach Ablauf ihrer Aufbewahrungszeit überschrieben.",
    ],
    [
      Privacy,
      "up to 10 years",
      "For data protection, backup copies are regularly created within the controller&#x27;s own infrastructure; they are overwritten after their retention period has expired.",
    ],
  ])(
    "describes existing processing in grouped categories",
    (Page, retention, backups) => {
      const html = renderToStaticMarkup(<Page />);
      expect(html).toContain(retention);
      expect(html).toContain(backups);
      expect(html).toContain('href="mailto:datenschutz-moddrop@heerlab.com"');
      for (const provider of [
        "Clerk",
        "Discord",
        "Twitch",
        "Google Ireland Limited",
        "cdn.tldraw.com",
        "tldraw Inc.",
      ])
        expect(html).toContain(provider);
      const table = html.match(/<table[\s\S]*?<\/table>/)?.[0] ?? "";
      expect(table.match(/<tr>/g)).toHaveLength(6);
      expect(table).toContain("moddrop_consent");
      expect(html).toContain("Umami");
      expect(html).toContain("GlitchTip");
      expect(table).toContain("OBS");
      expect(table).toContain("Twitch / YouTube");
      expect(html).not.toMatch(
        /OPEN|noch (?:nicht|zu)|not yet confirmed|Longhorn|Garage|Load Twitch player|Load YouTube video|__client_uat/,
      );
    },
  );
});

describe("legal navigation", () => {
  it("keeps the OBS error state transparent and free of legal links", () => {
    const html = renderToStaticMarkup(
      <OBSError error={new Error("fixture")} reset={() => {}} />,
    );
    expect(html).toContain("OBS output unavailable.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("bg-");
    expect(html).not.toContain("app-shell");
  });
  it("is in the landing, control layout, sign-in, not-found and error surfaces", () => {
    for (const element of [
      <Landing key="home" />,
      <AppLayout key="app">Rooms</AppLayout>,
      <SignInPage key="sign-in" />,
      <NotFound key="404" />,
      <ErrorPage key="error" error={new Error("fixture")} reset={() => {}} />,
      <GlobalError
        key="global"
        error={new Error("fixture")}
        reset={() => {}}
      />,
    ])
      expectLinks(renderToStaticMarkup(element));
  });
  it("remains present on the canvas control route", () => {
    state.pathname = "/app/rooms/fixture";
    expectLinks(renderToStaticMarkup(<ControlLegalFooter />));
    state.pathname = "/app";
  });
});
