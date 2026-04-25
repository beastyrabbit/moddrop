import {
  AppWindow,
  ArrowRight,
  AudioLines,
  FolderKanban,
  Globe,
  ImagePlay,
  type LucideIcon,
  PlayCircle,
  Trophy,
  Users2,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingFooter } from "@/components/common/LandingFooter";
import { LandingNavActions } from "@/components/landing/LandingNavActions";
import { ProductMockup } from "@/components/landing/ProductMockup";

type FitCard = {
  title: string;
  body: string;
  icon: LucideIcon;
  tintFrom: string;
  tintTo: string;
  iconColor: string;
};

const fitCards: FitCard[] = [
  {
    title: "BRB Cards",
    body: "Timers, designs, and variations.",
    icon: Users2,
    tintFrom: "rgba(51,255,51,0.35)",
    tintTo: "rgba(51,255,51,0.05)",
    iconColor: "#33ff33",
  },
  {
    title: "Emotes & Effects",
    body: "Emote rain, shakes, confetti.",
    icon: ImagePlay,
    tintFrom: "rgba(236,72,153,0.38)",
    tintTo: "rgba(236,72,153,0.05)",
    iconColor: "#f9a8d4",
  },
  {
    title: "Clips & Highlights",
    body: "Queue, preview, and play.",
    icon: PlayCircle,
    tintFrom: "rgba(34,211,238,0.38)",
    tintTo: "rgba(34,211,238,0.05)",
    iconColor: "#67e8f9",
  },
  {
    title: "Sponsor & Panels",
    body: "Sponsor art and promo blocks.",
    icon: FolderKanban,
    tintFrom: "rgba(251,191,36,0.38)",
    tintTo: "rgba(251,191,36,0.05)",
    iconColor: "#fde68a",
  },
  {
    title: "Scorebugs & Stats",
    body: "Scores, timers, leaderboards.",
    icon: Trophy,
    tintFrom: "rgba(168,85,247,0.38)",
    tintTo: "rgba(168,85,247,0.05)",
    iconColor: "#d8b4fe",
  },
  {
    title: "Audio Cues",
    body: "Sounds, TTS, and music.",
    icon: AudioLines,
    tintFrom: "rgba(244,114,182,0.38)",
    tintTo: "rgba(244,114,182,0.05)",
    iconColor: "#fbcfe8",
  },
];

const setupSteps = [
  {
    title: "Create your canvas",
    body: "Pick a template. Invite your mods.",
    icon: AppWindow,
    iconColor: "#33ff33",
    tintFrom: "rgba(51,255,51,0.35)",
    tintTo: "rgba(51,255,51,0.05)",
  },
  {
    title: "Add to OBS",
    body: "Paste one browser-source URL.",
    icon: Globe,
    iconColor: "#67e8f9",
    tintFrom: "rgba(34,211,238,0.38)",
    tintTo: "rgba(34,211,238,0.05)",
  },
  {
    title: "Go live",
    body: "Mods run the layer. You stream.",
    icon: Zap,
    iconColor: "#fde68a",
    tintFrom: "rgba(251,191,36,0.38)",
    tintTo: "rgba(251,191,36,0.05)",
  },
];

export const metadata: Metadata = {
  title: "Moddrop | The live layer for your stream",
  description:
    "Moddrop is the live layer for your stream. One OBS browser source. Approved mods collaborate in a shared canvas to run BRB cards, emotes, clips, sponsor art, scorebugs, and audio cues—together.",
};

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden bg-[#030507] text-white">
      <div className="pointer-events-none absolute inset-0 z-0 landing-grid opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[720px] landing-beams" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="mx-auto flex max-w-[1320px] items-center justify-between rounded-[10px] border border-white/10 bg-[#070a10]/86 px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur md:px-5">
          <Link
            href="/"
            className="inline-flex min-w-0 items-center gap-2.5"
            aria-label="Moddrop home"
          >
            <Image
              src="/img/moddrop-icon.svg"
              alt=""
              width={32}
              height={32}
              priority
              className="shrink-0"
            />
            <span className="hidden text-[1.02rem] font-black tracking-[0.02em] text-white sm:inline">
              MODDROP
            </span>
          </Link>

          <LandingNavActions />
        </header>

        <section className="mx-auto grid max-w-[1320px] gap-10 pb-6 pt-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:pb-10 lg:pt-14">
          <div>
            <h1 className="max-w-xl text-[clamp(2.85rem,4.6vw,4.1rem)] font-black leading-[1.02] tracking-tight text-white">
              Your mods
              <br />
              handle the board.
              <span className="block bg-[linear-gradient(90deg,#33FF33_0%,#8fffa3_60%,#33FF33_100%)] bg-clip-text text-transparent">
                You stay live.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/70 sm:text-[1.02rem]">
              Moddrop is the live layer for your stream. One OBS browser source.
              Approved mods collaborate in a shared canvas to run BRB cards,
              emotes, clips, sponsor art, scorebugs, and audio cues—together.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-primary/40 bg-[linear-gradient(135deg,#33ff33,#7dff8a_50%,#33ff33)] px-5 py-3 text-sm font-black text-primary-foreground shadow-[0_14px_40px_rgba(51,255,51,0.28)] hover:brightness-110"
              >
                Get started — it&apos;s free
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#product"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/14 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white/84 hover:border-primary/40 hover:text-white"
              >
                See it in action
                <PlayCircle className="size-4" />
              </a>
            </div>
          </div>

          <ProductMockup />
        </section>

        <section id="features" className="mx-auto max-w-[1320px] pt-10 pb-6">
          <SectionHeading
            title="What fits."
            body="Everything your stream needs—controlled together."
            centered
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {fitCards.map((item) => (
              <FitCardView key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section id="setup" className="mx-auto max-w-[1320px] pt-10 pb-6">
          <SectionHeading
            title="Set up in 3 steps."
            body="Get your live layer running in minutes."
            centered
          />
          <div className="relative mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-6 left-[16.66%] right-[16.66%] hidden h-px lg:block"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 8px, transparent 8px 16px)",
                maskImage:
                  "linear-gradient(90deg, transparent, black 15%, black 85%, transparent)",
              }}
            />
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="relative rounded-[14px] border border-white/10 bg-[#080d12]/90 p-6 pt-10 shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
                >
                  <span
                    className="absolute -top-6 left-6 grid size-12 place-items-center rounded-full bg-[linear-gradient(135deg,#8a3ffc_0%,#c084fc_100%)] font-mono text-base font-black text-white shadow-[0_0_32px_rgba(138,63,252,0.5)] ring-4 ring-[#030507]"
                  >
                    {index + 1}
                  </span>
                  <div className="flex items-start gap-5">
                    <div className="relative shrink-0">
                      <div
                        aria-hidden
                        className="absolute -inset-3 rounded-[22px] blur-xl"
                        style={{
                          background: `radial-gradient(60% 60% at 50% 50%, ${step.tintFrom}, transparent 70%)`,
                        }}
                      />
                      <div
                        className="relative grid size-[72px] place-items-center rounded-[16px] border border-white/12"
                        style={{
                          background: `linear-gradient(135deg, ${step.tintFrom}, ${step.tintTo})`,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px ${step.tintFrom}, 0 12px 28px ${step.tintFrom}`,
                        }}
                      >
                        <Icon
                          strokeWidth={1.75}
                          className="size-10"
                          style={{
                            color: step.iconColor,
                            filter: `drop-shadow(0 0 10px ${step.iconColor}66)`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="pt-1">
                      <h3 className="text-lg font-black leading-tight text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-white/62">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1320px] pt-8 pb-4">
          <div className="relative overflow-hidden rounded-[14px] border border-primary/25 bg-[linear-gradient(135deg,rgba(51,255,51,0.18)_0%,rgba(138,63,252,0.22)_60%,rgba(3,5,7,0.2)_100%)] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:px-10 sm:py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 top-1/2 h-[380px] w-[380px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(51,255,51,0.22),transparent_60%)]"
            />
            <div className="relative grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  One source. Infinite possibilities.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/72 sm:text-base">
                  Give your mods the tools to run the show—so you can focus on
                  making great content.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-primary/40 bg-[linear-gradient(135deg,#33ff33,#7dff8a_50%,#33ff33)] px-5 py-3 text-sm font-black text-primary-foreground shadow-[0_14px_40px_rgba(51,255,51,0.28)] hover:brightness-110"
                >
                  Get started — it&apos;s free
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/16 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/84 hover:border-primary/40 hover:text-white"
                >
                  See pricing
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] pt-4 pb-8">
          <div className="grid gap-4 rounded-[12px] border border-white/10 bg-[#080d12]/80 px-6 py-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="font-mono text-[0.7rem] tracking-[0.22em] text-white/48 uppercase">
                Works with
              </p>
              <span
                aria-label="Twitch"
                role="img"
                className="inline-flex h-10 w-12 items-center justify-center rounded-[10px] border border-primary/25 bg-primary/10"
              >
                <Image
                  src="/img/brands/twitch.svg"
                  alt=""
                  width={17}
                  height={20}
                />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/10 pt-4 sm:justify-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
              <p className="font-mono text-[0.7rem] tracking-[0.22em] text-white/48 uppercase">
                Coming soon
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    name: "YouTube Live",
                    src: "/img/brands/youtube.svg",
                    width: 24,
                    height: 17,
                  },
                  {
                    name: "Kick",
                    src: "/img/brands/kick.svg",
                    width: 50,
                    height: 16,
                  },
                  {
                    name: "TikTok Live",
                    src: "/img/brands/tiktok.svg",
                    width: 16,
                    height: 18,
                  },
                  {
                    name: "Rumble",
                    src: "/img/brands/rumble.svg",
                    width: 64,
                    height: 16,
                  },
                ].map((service) => (
                  <span
                    key={service.name}
                    aria-label={service.name}
                    role="img"
                    className="inline-flex h-10 min-w-12 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.04] px-3"
                  >
                    <Image
                      src={service.src}
                      alt=""
                      width={service.width}
                      height={service.height}
                      className="opacity-55 saturate-50"
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  body,
  centered = false,
}: {
  title: string;
  body: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/64 sm:text-base">
        {body}
      </p>
    </div>
  );
}

function FitCardView({ item }: { item: FitCard }) {
  const Icon = item.icon;
  return (
    <article className="group relative flex flex-col items-start rounded-[14px] border border-white/10 bg-[#080d12]/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#0a1116]">
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-3 rounded-[20px] blur-xl"
          style={{
            background: `radial-gradient(60% 60% at 50% 50%, ${item.tintFrom}, transparent 70%)`,
          }}
        />
        <div
          className="relative grid size-16 place-items-center rounded-[14px] border border-white/12"
          style={{
            background: `linear-gradient(135deg, ${item.tintFrom}, ${item.tintTo})`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px ${item.tintFrom}, 0 10px 24px ${item.tintFrom}`,
          }}
        >
          <Icon
            strokeWidth={1.75}
            className="size-9"
            style={{
              color: item.iconColor,
              filter: `drop-shadow(0 0 8px ${item.iconColor}55)`,
            }}
          />
        </div>
      </div>
      <h3 className="mt-5 text-[0.98rem] font-black leading-tight text-white">
        {item.title}
      </h3>
      <p className="mt-1.5 text-[0.82rem] leading-5 text-white/58">
        {item.body}
      </p>
    </article>
  );
}
