"use client";

import {
  ArrowRight,
  ChevronDown,
  Plus,
  UserPlus,
  Users2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

const canvasLayers = [
  { name: "BRB Card", active: true },
  { name: "Scorebug", active: false },
  { name: "Sponsor Block", active: false },
  { name: "Emote Rain", active: false },
  { name: "Audio Cue", active: false },
];

const modsOnline = [
  { name: "PulsePusher", hue: "#33ff33" },
  { name: "ClipQueen", hue: "#22d3ee" },
  { name: "HypeHazard", hue: "#a855f7" },
  { name: "SoundBoardT", hue: "#f472b6" },
  { name: "StatSavvy", hue: "#fbbf24" },
  { name: "DropBot", hue: "#33ff33" },
];

const liveActivity = [
  { name: "ClipQueen", action: "Queued a Clip", hue: "#22d3ee" },
  { name: "HypeHazard", action: "Updated BRB Card", hue: "#a855f7" },
  { name: "SoundBoardT", action: "Played Audio Cue", hue: "#f472b6" },
  { name: "PulsePusher", action: "Changed Score", hue: "#33ff33" },
];

const triggers = [
  { key: "BRB", label: "BRB Card" },
  { key: "CLIP", label: "Clip Pop" },
  { key: "HYPE", label: "Emote Rain" },
  { key: "SOUND", label: "Audio Cue" },
];

// Base resting tilt (matches the mockup) + how far the cursor can push it.
const BASE_ROT_Y = -6;
const BASE_ROT_X = 3;
const MAX_CURSOR_ROT_Y = 5;
const MAX_CURSOR_ROT_X = 4;
const EASING = 0.08;

export function ProductMockup() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!wrapper || !card || !glow) return;

    // Skip parallax if the user prefers reduced motion.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = 0;
    let active = false;

    const tick = () => {
      currentX += (targetX - currentX) * EASING;
      currentY += (targetY - currentY) * EASING;

      const ry = BASE_ROT_Y + currentX;
      const rx = BASE_ROT_X - currentY;
      card.style.transform = `rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg)`;
      glow.style.transform = `rotateY(${(BASE_ROT_Y + currentX * 0.6).toFixed(3)}deg) rotateX(${(BASE_ROT_X - currentY * 0.6).toFixed(3)}deg)`;

      // Stop the rAF loop when we've settled back to rest.
      const settled =
        !active &&
        Math.abs(currentX) < 0.01 &&
        Math.abs(currentY) < 0.01 &&
        Math.abs(targetX) < 0.01 &&
        Math.abs(targetY) < 0.01;
      if (settled) {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const ensureRaf = () => {
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = wrapper.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      targetX = (px - 0.5) * 2 * MAX_CURSOR_ROT_Y;
      targetY = (py - 0.5) * 2 * MAX_CURSOR_ROT_X;
      active = true;
      ensureRaf();
    };

    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
      active = false;
      ensureRaf();
    };

    wrapper.addEventListener("pointermove", handleMove);
    wrapper.addEventListener("pointerleave", handleLeave);

    return () => {
      wrapper.removeEventListener("pointermove", handleMove);
      wrapper.removeEventListener("pointerleave", handleLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      id="product"
      ref={wrapperRef}
      className="relative [perspective:1800px] [transform-style:preserve-3d]"
    >
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[24px] bg-[radial-gradient(60%_50%_at_45%_50%,rgba(138,63,252,0.18),transparent_70%),radial-gradient(50%_40%_at_80%_80%,rgba(51,255,51,0.14),transparent_70%)] blur-2xl"
        style={{
          transform: `rotateY(${BASE_ROT_Y}deg) rotateX(${BASE_ROT_X}deg)`,
          willChange: "transform",
        }}
      />

      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[14px] border border-white/12 bg-[linear-gradient(180deg,#0a0e14_0%,#070a10_100%)] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.55)] will-change-transform"
        style={{
          transform: `rotateY(${BASE_ROT_Y}deg) rotateX(${BASE_ROT_X}deg)`,
          transformOrigin: "60% 50%",
        }}
      >
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-black/30 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/img/moddrop-icon.svg"
              alt=""
              width={22}
              height={22}
              className="shrink-0"
            />
            <span className="text-[0.82rem] font-black tracking-[0.02em] text-white">
              MODDROP
            </span>
          </div>
          <div className="hidden items-center gap-2 text-[0.7rem] font-semibold text-white/66 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
              Main Canvas
              <ChevronDown className="size-3 opacity-70" />
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-white/56">
              1080p 60fps
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/12 px-2.5 py-1 text-primary">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(51,255,51,0.8)]" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[0.72rem] font-black text-primary"
            >
              <UserPlus className="size-3.5" />
              Invite mods
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[0.7rem] font-semibold text-white/72">
              <Users2 className="size-3" />
              12
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[180px_1fr_210px]">
          <aside className="flex flex-col gap-2.5 rounded-[10px] border border-white/10 bg-black/28 p-3">
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-white/44 uppercase">
              Layers
            </p>
            <div className="flex flex-col gap-1.5">
              {canvasLayers.map((layer) => (
                <button
                  key={layer.name}
                  type="button"
                  className={`flex items-center justify-between gap-2 rounded-[8px] border px-2.5 py-2 text-[0.75rem] font-semibold ${
                    layer.active
                      ? "border-primary/30 bg-primary/12 text-primary"
                      : "border-white/8 bg-white/[0.03] text-white/66 hover:border-white/16 hover:text-white"
                  }`}
                >
                  {layer.name}
                  <ArrowRight className="size-3 opacity-70" />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-white/14 bg-white/[0.02] px-2.5 py-2 text-[0.72rem] font-semibold text-white/64 hover:border-primary/40 hover:text-primary"
            >
              <Plus className="size-3.5" />
              Add layer
            </button>
          </aside>

          <div className="flex flex-col gap-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] border border-white/10 bg-[radial-gradient(80%_60%_at_50%_40%,rgba(138,63,252,0.26),transparent_70%),linear-gradient(180deg,#050911_0%,#02040a_100%)]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="absolute inset-0">
                <div className="absolute left-4 top-4 h-10 w-20 border-l-2 border-t-2 border-primary/60" />
                <div className="absolute right-4 top-4 h-10 w-20 border-r-2 border-t-2 border-primary/60" />
                <div className="absolute bottom-4 left-4 h-10 w-20 border-b-2 border-l-2 border-[#8A3FFC]/70" />
                <div className="absolute bottom-4 right-4 h-10 w-20 border-b-2 border-r-2 border-[#8A3FFC]/70" />
              </div>

              <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-[clamp(1.8rem,4.4vw,3.6rem)] font-black italic leading-[0.95] tracking-tight text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.55)]">
                  BE RIGHT
                </p>
                <p className="mt-1 bg-[linear-gradient(90deg,#33ff33,#7dff8a_50%,#b38bff)] bg-clip-text text-[clamp(2.2rem,5.4vw,4.4rem)] font-black italic leading-[0.9] tracking-tight text-transparent">
                  BACK
                </p>
              </div>

              <div className="absolute inset-x-0 bottom-8 text-center">
                <p className="font-mono text-[clamp(0.62rem,0.9vw,0.82rem)] font-bold tracking-[0.22em] text-white/78 uppercase">
                  Grab a snack.
                </p>
                <p className="font-mono text-[clamp(0.62rem,0.9vw,0.82rem)] font-bold tracking-[0.22em] text-white/78 uppercase">
                  We&apos;ll be right back.
                </p>
              </div>

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 opacity-90">
                <Image
                  src="/img/brands/twitch.svg"
                  alt="Twitch"
                  width={12}
                  height={14}
                />
                <Image
                  src="/img/brands/youtube.svg"
                  alt="YouTube"
                  width={20}
                  height={14}
                />
                <Image
                  src="/img/brands/obs.svg"
                  alt="OBS Studio"
                  width={14}
                  height={14}
                />
              </div>
            </div>

            <div className="rounded-[10px] border border-white/10 bg-black/28 p-3">
              <p className="font-mono text-[0.62rem] tracking-[0.2em] text-white/44 uppercase">
                Triggers
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {triggers.map((trigger) => (
                  <button
                    key={trigger.key}
                    type="button"
                    className="flex flex-col items-center gap-0.5 rounded-[8px] border border-white/10 bg-white/[0.03] px-2 py-2 hover:border-primary/30"
                  >
                    <span className="font-mono text-[0.7rem] font-black tracking-[0.12em] text-primary">
                      {trigger.key}
                    </span>
                    <span className="text-[0.6rem] text-white/56">
                      {trigger.label}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Add trigger"
                  className="grid place-items-center rounded-[8px] border border-dashed border-white/14 bg-white/[0.02] text-white/64 hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-3 rounded-[10px] border border-white/10 bg-black/28 p-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[0.62rem] tracking-[0.2em] text-white/44 uppercase">
                Mods online
              </p>
              <span className="inline-flex items-center gap-1 text-[0.66rem] text-primary">
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(51,255,51,0.8)]" />
                12
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {modsOnline.map((mod) => (
                <div
                  key={mod.name}
                  className="flex items-center gap-2 rounded-[6px] border border-white/8 bg-white/[0.03] px-2 py-1.5"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      background: mod.hue,
                      boxShadow: `0 0 8px ${mod.hue}66`,
                    }}
                  />
                  <span className="truncate text-[0.72rem] font-semibold text-white/78">
                    {mod.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 border-t border-white/8 pt-3">
              <p className="font-mono text-[0.62rem] tracking-[0.2em] text-white/44 uppercase">
                Live activity
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {liveActivity.map((event) => (
                  <div
                    key={`${event.name}-${event.action}`}
                    className="rounded-[6px] border border-white/8 bg-white/[0.03] px-2 py-1.5"
                  >
                    <p
                      className="text-[0.72rem] font-bold"
                      style={{ color: event.hue }}
                    >
                      {event.name}
                    </p>
                    <p className="text-[0.64rem] text-white/54">
                      {event.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
