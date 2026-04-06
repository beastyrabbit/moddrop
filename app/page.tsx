"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  AudioLines,
  type LucideIcon,
  ImageIcon,
  MonitorPlay,
  MousePointer2,
  Settings2,
  ShieldCheck,
  Sticker,
  Users2,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const stackMarks = ["OBS", "Twitch", "Clerk", "tldraw", "WebSockets", "SQLite"];

const highlightCards: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "One source",
    body: "One browser source in OBS. That is the setup.",
    icon: MonitorPlay,
  },
  {
    title: "Shared room",
    body: "Mods work in one canvas instead of your scene list.",
    icon: Users2,
  },
  {
    title: "Live drop",
    body: "Assets in the stream zone appear on stream.",
    icon: MousePointer2,
  },
  {
    title: "Owner control",
    body: "Permissions stay tied to the streamer room.",
    icon: ShieldCheck,
  },
];

const flowSteps: Array<{
  number: string;
  title: string;
  body: string;
}> = [
  {
    number: "01",
    title: "Load the OBS URL",
    body: "Set it once.",
  },
  {
    number: "02",
    title: "Add your editors",
    body: "Only approved users get in.",
  },
  {
    number: "03",
    title: "Run the live layer",
    body: "Mods place assets. You keep streaming.",
  },
];

const placeholderAssets = [
  { emoji: "🖼️", label: "Art" },
  { emoji: "✨", label: "Emotes" },
  { emoji: "🎬", label: "Clips" },
  { emoji: "🔊", label: "Audio" },
  { emoji: "☕", label: "BRB" },
  { emoji: "🏁", label: "Scorebug" },
];

const mediaTypes: Array<{
  label: string;
  icon: LucideIcon;
}> = [
  { label: "Image", icon: ImageIcon },
  { label: "Emote", icon: Sticker },
  { label: "Video", icon: Video },
  { label: "Audio", icon: AudioLines },
];

function LandingActions({
  isLoaded,
  isSignedIn,
  onSignIn,
}: {
  isLoaded: boolean;
  isSignedIn: boolean;
  onSignIn: () => void;
}) {
  if (isLoaded && isSignedIn) {
    return (
      <>
        <Link href="/app" className="signal-button min-w-[210px]">
          Open app
          <ArrowRight className="size-5" />
        </Link>
        <Link
          href="/app/settings"
          className="signal-button signal-button--ghost min-w-[210px]"
        >
          Go to settings
        </Link>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onSignIn}
        className="signal-button min-w-[210px]"
      >
        Log in
      </button>
      <Link
        href="/app"
        className="signal-button signal-button--ghost min-w-[210px]"
      >
        See the app
      </Link>
    </>
  );
}

export default function LandingPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  const handleSignIn = () => {
    if (isSignedIn) {
      return;
    }
    clerk.openSignIn();
  };

  return (
    <main className="relative overflow-hidden">
      <div className="signal-grid absolute inset-0 opacity-[0.14]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(51,255,51,0.09),transparent_20%),radial-gradient(circle_at_84%_12%,rgba(255,124,70,0.08),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(40,120,70,0.12),transparent_30%)]" />

      <div className="mx-auto max-w-[1440px] px-4 pb-18 pt-4 sm:px-6 sm:pt-6">
        <header className="signal-surface flex items-center justify-between rounded-[20px] px-4 py-3 sm:px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.16em] text-[#33ff33] uppercase"
          >
            <Image
              src="/img/moddrop-logo-mark.svg"
              alt="Moddrop"
              width={26}
              height={26}
              className="size-[26px]"
            />
            <span className="text-white">Moddrop</span>
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && isSignedIn ? (
              <>
                <Link href="/app" className="signal-button px-4 py-2 text-sm">
                  Open app
                </Link>
                <Link
                  href="/app/settings"
                  className="signal-button signal-button--ghost px-4 py-2 text-sm"
                >
                  <Settings2 className="size-4" />
                  Go to settings
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="signal-button px-4 py-2 text-sm"
                >
                  Log in
                </button>
                <Link
                  href="/app"
                  className="signal-button signal-button--ghost px-4 py-2 text-sm"
                >
                  See the app
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="mx-auto max-w-[1280px] pb-8 pt-10 lg:pt-14">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article
              data-label="Live overlay control"
              className="signal-frame signal-surface rounded-[30px] px-6 py-7 sm:px-8 sm:py-9"
            >
              <div className="mb-6 flex flex-wrap gap-2">
                {[
                  "#8d2929",
                  "#807d2b",
                  "#25852c",
                  "#2a7d80",
                  "#30308e",
                  "#8a318c",
                ].map((color) => (
                  <span
                    key={color}
                    className="h-[7px] w-10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <p className="signal-label">Streamer setup, mod-operated</p>
              <h1 className="mt-4 max-w-4xl text-5xl leading-[0.94] text-white sm:text-6xl lg:text-[5.3rem] [font-family:var(--font-display)] uppercase">
                One browser source.
                <br />
                Mods run the live layer.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                Moddrop gives your team one shared canvas for BRB cards, emotes,
                clips, sponsor art, and quick stream drops.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <LandingActions
                  isLoaded={isLoaded}
                  isSignedIn={Boolean(isSignedIn)}
                  onSignIn={handleSignIn}
                />
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  "1 source",
                  "shared room",
                  "approved editors",
                  "no AI art",
                ].map((chip) => (
                  <span key={chip} className="signal-chip">
                    {chip}
                  </span>
                ))}
              </div>
            </article>

            <div className="grid gap-6">
              <article
                data-label="Placeholder pack"
                className="signal-frame signal-surface rounded-[30px] px-5 py-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Use placeholders until the real pack is ready.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      No generated art. Just clean stand-ins.
                    </p>
                  </div>
                  <Image
                    src="/img/moddrop-logo-mark.svg"
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 opacity-85"
                  />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {placeholderAssets.map((asset) => (
                    <div
                      key={asset.label}
                      className="signal-placeholder rounded-[18px] px-4 py-4 text-center"
                    >
                      <p className="text-2xl leading-none">{asset.emoji}</p>
                      <p className="mt-3 text-sm font-semibold text-white">
                        {asset.label}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article
                data-label="Actual stack"
                className="signal-frame signal-surface rounded-[26px] px-5 py-5"
              >
                <div className="flex flex-wrap gap-2">
                  {stackMarks.map((mark) => (
                    <span key={mark} className="signal-chip">
                      {mark}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] pb-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {highlightCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="signal-stat signal-surface rounded-[24px] px-5 py-5"
                >
                  <div className="flex size-11 items-center justify-center rounded-[16px] border border-primary/16 bg-primary/8 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] pb-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <article
              data-label="How it works"
              className="signal-frame signal-surface rounded-[28px] px-6 py-7"
            >
              <h2 className="text-4xl leading-none text-white sm:text-5xl [font-family:var(--font-display)] uppercase">
                Three steps.
              </h2>
              <div className="mt-6 space-y-5">
                {flowSteps.map((step, index) => (
                  <div key={step.number}>
                    <div className="flex gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-[16px] border border-primary/16 bg-primary/8 font-mono text-sm tracking-[0.2em] text-primary">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/62">
                          {step.body}
                        </p>
                      </div>
                    </div>
                    {index < flowSteps.length - 1 ? (
                      <div className="signal-divider mt-5" />
                    ) : null}
                  </div>
                ))}
              </div>
            </article>

            <article
              data-label="What can live there"
              className="signal-frame signal-surface rounded-[28px] px-6 py-7"
            >
              <h2 className="text-4xl leading-none text-white sm:text-5xl [font-family:var(--font-display)] uppercase">
                What fits.
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/64">
                Anything simple, fast, and useful on stream.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {mediaTypes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="signal-stat rounded-[18px] px-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-[14px] border border-white/10 bg-black/30 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <p className="text-sm font-semibold text-white">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-sm leading-7 text-white/56">
                Real assets later. Clean placeholders now.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] pb-8">
          <div
            data-label="Broadcast ready"
            className="signal-frame signal-surface rounded-[30px] px-6 py-8 text-center sm:px-10 sm:py-10"
          >
            <h2 className="text-5xl leading-[0.94] text-white sm:text-6xl [font-family:var(--font-display)] uppercase">
              Your mods handle the board.
              <br />
              You stay live.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/64">
              One room. One source. One clear job.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <LandingActions
                isLoaded={isLoaded}
                isSignedIn={Boolean(isSignedIn)}
                onSignIn={handleSignIn}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
