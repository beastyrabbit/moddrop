"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { ArrowRight, Settings2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const operationalSteps = [
  {
    label: "Step 01",
    title: "Add one browser source to OBS",
    body: "Moddrop only needs a single browser source. That source becomes the live stream zone your mods can control.",
    image: "/img/brb-screen.jpg",
    align: "lg:col-span-5",
  },
  {
    label: "Step 02",
    title: "Sign in and grant your mods access",
    body: "The streamer owns the room. Allowed users join the same canvas and move media without touching your scene collection.",
    image: "/img/mod-cursors.jpg",
    align: "lg:col-span-4 lg:translate-y-20",
  },
  {
    label: "Step 03",
    title: "Drag anything into the stream zone",
    body: "Emotes, stills, GIFs, videos, and audio can all live on the board. If it lands inside the stream zone, it renders on stream.",
    image: "/img/canvas-preview.jpg",
    align: "lg:col-span-3",
  },
];

export default function LandingPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <main className="relative overflow-hidden">
      <div className="signal-grid absolute inset-0 opacity-[0.16]" />
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        <header className="flex items-center justify-between border border-white/6 bg-black/45 px-4 py-3 backdrop-blur-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-[#33ff33] uppercase"
          >
            <span className="inline-flex size-5 items-center justify-center border border-[#33ff33] bg-[#33ff33] text-[0.7rem] font-black text-black">
              ▶
            </span>
            Moddrop
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
                  onClick={() => {
                    if (isSignedIn) {
                      return;
                    }
                    clerk.openSignIn();
                  }}
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

        <section className="relative isolate px-0 pb-16 pt-10 lg:pt-16">
          <div className="absolute inset-x-0 top-10 mx-auto hidden h-[780px] max-w-[1120px] lg:block">
            <svg className="h-full w-full" viewBox="0 0 1120 780" fill="none">
              <title>Signal path between Moddrop landing sections</title>
              <path
                d="M146 158 C 334 154, 446 202, 530 296 C 610 386, 730 486, 928 528"
                stroke="rgba(51,255,51,0.24)"
                strokeDasharray="7 12"
                strokeWidth="2"
              />
              <path
                d="M530 296 C 448 424, 430 546, 498 640 C 566 724, 710 744, 844 670"
                stroke="rgba(51,255,51,0.18)"
                strokeDasharray="7 12"
                strokeWidth="2"
              />
              <circle
                cx="146"
                cy="158"
                r="7"
                fill="#33ff33"
                fillOpacity="0.72"
              />
              <circle
                cx="530"
                cy="296"
                r="7"
                fill="#33ff33"
                fillOpacity="0.72"
              />
              <circle
                cx="928"
                cy="528"
                r="7"
                fill="#33ff33"
                fillOpacity="0.72"
              />
              <circle
                cx="844"
                cy="670"
                r="7"
                fill="#33ff33"
                fillOpacity="0.72"
              />
            </svg>
          </div>

          <div
            data-label="What it is"
            className="signal-frame signal-surface mx-auto max-w-[1120px] rounded-[26px] px-6 py-10 sm:px-10 sm:py-16"
          >
            <div className="mx-auto max-w-[760px] text-center">
              <div className="mb-6 flex items-center justify-center gap-2">
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
              <p className="signal-label text-[#ff4444]/70">
                Incoming transmission
              </p>
              <h1 className="mt-4 text-6xl leading-[0.92] text-white sm:text-7xl lg:text-[6.75rem] [font-family:var(--font-display)] uppercase">
                One browser source.
                <br />
                <span className="text-primary">Infinite possibilities.</span>
              </h1>
              <div className="mt-8 space-y-5">
                <p className="signal-copy text-lg">
                  Moddrop gives your stream one live canvas in OBS. You sign in,
                  give your mods access, and they manage the overlay from a
                  shared board instead of wrestling with scene collections.
                </p>
                <p className="signal-copy">
                  Mods open the canvas, drag media into the stream zone, and it
                  appears live on stream. You keep playing. They handle the live
                  layer.
                </p>
              </div>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                {isLoaded && isSignedIn ? (
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
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSignedIn) {
                          return;
                        }
                        clerk.openSignIn();
                      }}
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
                )}
              </div>
              <p className="mt-7 font-mono text-xs tracking-[0.2em] text-white/24 uppercase">
                Follow the signal path below
              </p>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-[1240px] pb-10">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            {operationalSteps.map((step) => (
              <article
                key={step.title}
                className={`signal-surface rounded-[24px] p-4 ${step.align}`}
              >
                <div className="mb-4 overflow-hidden rounded-[18px] border border-white/8 bg-black/70">
                  <Image
                    src={step.image}
                    alt={step.title}
                    width={1280}
                    height={720}
                    className="h-[220px] w-full object-cover sm:h-[260px]"
                  />
                </div>
                <p className="signal-label">{step.label}</p>
                <h2 className="mt-3 text-3xl leading-none text-white [font-family:var(--font-display)] uppercase">
                  {step.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/62">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1240px] gap-6 pb-18 lg:grid-cols-[1.15fr_0.85fr]">
          <article
            data-label="Room flow"
            className="signal-frame signal-surface rounded-[24px] px-6 py-7"
          >
            <p className="signal-label">How the room works</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                "Create your room once. It stays tied to your Clerk identity.",
                "Set your Twitch channel and allowed users in settings.",
                "Share the OBS URL with the generated secret already embedded.",
                "The OBS page exchanges that secret for a short-lived token on load.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/7 bg-white/[0.03] px-4 py-4"
                >
                  <p className="font-mono text-[0.68rem] tracking-[0.22em] text-primary/72 uppercase">
                    0{index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/68">{item}</p>
                </div>
              ))}
            </div>
          </article>
          <article
            data-label="Mod role"
            className="signal-frame signal-surface rounded-[24px] px-6 py-7"
          >
            <p className="signal-label">Why mods like it</p>
            <div className="mt-5 overflow-hidden rounded-[18px] border border-white/8 bg-black/70">
              <Image
                src="/img/emote-wall.jpg"
                alt="Moddrop media wall"
                width={1280}
                height={720}
                className="h-[230px] w-full object-cover"
              />
            </div>
            <p className="mt-5 text-sm leading-7 text-white/62">
              Mods get one shared workspace with the live stream zone always in
              view. No alt-tabbing through OBS scenes, no relaying assets
              through chat, no guessing whether something will land in frame.
            </p>
          </article>
        </section>

        <section className="mx-auto max-w-[1240px] pb-10">
          <div
            data-label="Ready"
            className="signal-frame signal-surface rounded-[24px] px-6 py-8 text-center sm:px-10"
          >
            <p className="signal-label">Broadcast ready</p>
            <h2 className="mt-4 text-5xl leading-none text-white sm:text-6xl [font-family:var(--font-display)] uppercase">
              Your mods run the canvas.
              <br />
              You stay on stream.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/64">
              Moddrop keeps the setup tight: one browser source in OBS, one room
              for the streamer, one collaborative canvas for the team.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isLoaded && isSignedIn ? (
                <>
                  <Link href="/app" className="signal-button min-w-[220px]">
                    Open app
                  </Link>
                  <Link
                    href="/app/settings"
                    className="signal-button signal-button--ghost min-w-[220px]"
                  >
                    Go to settings
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSignedIn) {
                        return;
                      }
                      clerk.openSignIn();
                    }}
                    className="signal-button min-w-[220px]"
                  >
                    Log in
                  </button>
                  <Link
                    href="/app"
                    className="signal-button signal-button--ghost min-w-[220px]"
                  >
                    See the app
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
