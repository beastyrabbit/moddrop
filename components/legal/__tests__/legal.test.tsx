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
import Privacy, { metadata as privacyMetadata } from "@/app/privacy/page";
import SignInPage from "@/app/sign-in/page";
import { Landing } from "@/components/landing/Landing";
import { ControlLegalFooter } from "../control-legal-footer";

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
      expect(renderToStaticMarkup(<Page />)).toContain('dateTime="2026-10-21"');
  });
});

describe("legal navigation", () => {
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
