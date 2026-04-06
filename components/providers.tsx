"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { UserRecordBootstrap } from "@/components/user-record-bootstrap";
import convex from "@/lib/convexClient";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkAppearance = {
  theme: [shadcn, dark],
  variables: {
    colorPrimary: "#33ff33",
    colorDanger: "#ff7c46",
    colorBackground: "#0a0d0b",
    colorText: "#f5f7f2",
    colorTextSecondary: "#aab6aa",
    colorInputBackground: "#f1f1f1",
    colorInputText: "#111111",
    colorNeutral: "#121714",
    colorModalBackdrop: "rgba(2, 4, 3, 0.82)",
    borderRadius: "0.9rem",
  },
  elements: {
    card: "border border-white/10 bg-[#0b100d]/95 text-[#f5f7f2] shadow-2xl",
    modalContent: "border border-white/10 bg-[#0b100d]/95 text-[#f5f7f2] shadow-2xl",
    headerTitle: "text-[#f5f7f2]",
    headerSubtitle: "text-[#c6d0c6]",
    socialButtonsBlockButton:
      "!border-white/12 !bg-[#151b18] !text-[#f5f7f2] hover:!bg-[#1b221e]",
    socialButtonsBlockButtonText: "!text-[#f5f7f2] !opacity-100",
    socialButtonsProviderIcon: "!text-[#f5f7f2] !opacity-100",
    socialButtonsBlockButtonArrow: "!text-[#f5f7f2] !opacity-100",
    identityPreviewText: "!text-[#dce6dc]",
    identityPreviewEditButton:
      "!border-white/10 !bg-[#1a201c] !text-[#dce6dc] hover:!bg-[#222923]",
    dividerText: "text-[#b3beb3]",
    dividerLine: "bg-white/10",
    formFieldLabel: "text-[#c8d2c8]",
    formFieldInput:
      "border border-white/10 bg-[#f2f2f2] text-[#121212] placeholder:text-[#666666]",
    formButtonPrimary:
      "bg-[#33ff33] text-[#041004] hover:bg-[#52ff52] shadow-[0_0_24px_rgba(51,255,51,0.18)]",
    footerActionText: "text-[#c0cbc0]",
    footerActionLink: "text-[#33ff33] hover:text-[#7dff7d]",
    footer: "text-[#c0cbc0]",
    footerText: "text-[#c0cbc0]",
    formHeaderTitle: "text-[#f5f7f2]",
    formHeaderSubtitle: "text-[#c6d0c6]",
    formResendCodeLink: "text-[#33ff33] hover:text-[#7dff7d]",
  },
};

if (!clerkPublishableKey) {
  throw new Error(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be defined. Add it to .env.local or your deployment environment.",
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={clerkAppearance}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserRecordBootstrap />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
