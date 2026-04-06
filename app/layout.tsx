import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Unbounded,
  Space_Mono,
} from "next/font/google";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers";
import {
  buildClerkScriptProps,
  clerkAppearance,
  getClerkPublishableKey,
} from "@/lib/clerk-config";
import "./globals.css";

const sans = Unbounded({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Moddrop",
  description:
    "Collaborative stream canvases for live overlays and browser-source control.",
  icons: {
    icon: [
      { url: "/img/moddrop-logo-mark.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/img/moddrop-logo-mark.svg",
    apple: "/img/moddrop-logo-mark.svg",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = getClerkPublishableKey();
  const clerkProviderProps = {
    publishableKey: clerkPublishableKey,
    appearance: clerkAppearance,
    ...buildClerkScriptProps(clerkPublishableKey),
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} ${display.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <ClerkProvider {...clerkProviderProps}>
          <AppProviders>
            {children}
            <Toaster richColors position="bottom-right" />
          </AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
