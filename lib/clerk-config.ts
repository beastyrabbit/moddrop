import { dark, shadcn } from "@clerk/themes";

export const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export type ClerkScriptProps = {
  __internal_clerkJSUrl?: string;
  __internal_clerkUIUrl?: string;
};

function decodeBase64Url(value: string) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(base64);
  }

  return Buffer.from(base64, "base64").toString("utf8");
}

function decodeClerkFrontendApi(publishableKey: string) {
  const parts = publishableKey.split("_");
  if (parts.length < 3) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(parts[2]).replace(/\$/g, "");
    return decoded || null;
  } catch {
    return null;
  }
}

export function buildClerkScriptProps(
  publishableKey: string,
): ClerkScriptProps {
  const frontendApi = decodeClerkFrontendApi(publishableKey);
  if (!frontendApi) {
    return {};
  }

  const scriptHost = `https://${frontendApi}`;
  return {
    __internal_clerkJSUrl: `${scriptHost}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,
    __internal_clerkUIUrl: `${scriptHost}/npm/@clerk/ui@1/dist/ui.browser.js`,
  };
}

export const clerkAppearance = {
  theme: [shadcn, dark],
  variables: {
    colorPrimary: "#C69A58",
    colorDanger: "#D9704F",
    colorBackground: "#1F362C",
    colorText: "#F2E9D8",
    colorTextSecondary: "#C8BFAF",
    colorInputBackground: "#F2E9D8",
    colorInputText: "#241B10",
    colorNeutral: "#2C4A3C",
    colorModalBackdrop: "rgba(18, 29, 24, 0.84)",
    borderRadius: "0.625rem",
  },
  elements: {
    card: "border border-[#C69A58]/25 bg-[#1F362C] text-[#F2E9D8] shadow-2xl",
    modalContent:
      "border border-[#C69A58]/25 bg-[#1F362C] text-[#F2E9D8] shadow-2xl",
    headerTitle: "text-[#F2E9D8]",
    headerSubtitle: "text-[#C8BFAF]",
    socialButtonsBlockButton:
      "!border-[#C69A58]/25 !bg-[#2C4A3C] !text-[#F2E9D8] hover:!bg-[#35564A]",
    socialButtonsBlockButtonText: "!text-[#F2E9D8] !opacity-100",
    socialButtonsProviderIcon: "!text-[#F2E9D8] !opacity-100",
    socialButtonsBlockButtonArrow: "!text-[#F2E9D8] !opacity-100",
    identityPreviewText: "!text-[#F2E9D8]",
    identityPreviewEditButton:
      "!border-[#C69A58]/25 !bg-[#2C4A3C] !text-[#F2E9D8] hover:!bg-[#35564A]",
    dividerText: "text-[#C8BFAF]",
    dividerLine: "bg-[#C69A58]/20",
    formFieldLabel: "text-[#F2E9D8]",
    formFieldInput:
      "border border-[#C69A58]/35 bg-[#F2E9D8] text-[#241B10] placeholder:text-[#6F6557]",
    formButtonPrimary:
      "bg-[#C69A58] text-[#241B10] hover:bg-[#D8B274] shadow-none",
    footerActionText: "text-[#C8BFAF]",
    footerActionLink: "text-[#D8B274] hover:text-[#F2E9D8]",
    footer: "text-[#C8BFAF]",
    footerText: "text-[#C8BFAF]",
    formHeaderTitle: "text-[#F2E9D8]",
    formHeaderSubtitle: "text-[#C8BFAF]",
    formResendCodeLink: "text-[#D8B274] hover:text-[#F2E9D8]",
  },
};

export function getClerkPublishableKey() {
  if (!clerkPublishableKey) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be defined. Add it to .env.local or your deployment environment.",
    );
  }

  return clerkPublishableKey;
}
