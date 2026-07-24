import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import {
  DM_Sans,
  DM_Serif_Display,
  Space_Mono,
  Unbounded,
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

const productSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const productDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Moddrop",
  description:
    "Collaborative stream canvases for live overlays and browser-source control.",
  icons: {
    icon: [
      { url: "/img/moddrop-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/img/moddrop-icon.svg",
    apple: "/img/moddrop-icon.svg",
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
        className={`${sans.variable} ${mono.variable} ${display.variable} ${productSans.variable} ${productDisplay.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <ClerkProvider {...clerkProviderProps}>
          <AppProviders>
            {children}
            <Toaster position="bottom-right" />
          </AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}
