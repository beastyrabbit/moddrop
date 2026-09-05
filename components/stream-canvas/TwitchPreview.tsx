"use client";

import { useEffect, useRef, useState } from "react";
import { useMediaPreference } from "./media-preferences";

interface TwitchPlayer {
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
}

interface TwitchEmbedInstance {
  addEventListener(event: string, callback: () => void): void;
  getPlayer(): TwitchPlayer;
}

interface TwitchEmbedConstructor {
  new (
    element: HTMLElement,
    options: Record<string, string | string[] | number | boolean>,
  ): TwitchEmbedInstance;
  VIDEO: string;
  VIDEO_READY: string;
}

declare global {
  interface Window {
    Twitch?: { Embed: TwitchEmbedConstructor };
  }
}

let twitchEmbedScriptPromise: Promise<TwitchEmbedConstructor> | null = null;

export function loadTwitchEmbed(): Promise<TwitchEmbedConstructor> {
  if (window.Twitch?.Embed) return Promise.resolve(window.Twitch.Embed);
  if (twitchEmbedScriptPromise) return twitchEmbedScriptPromise;
  const promise = new Promise<TwitchEmbedConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://embed.twitch.tv/embed/v1.js"]',
    );
    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      clearTimeout(timeout);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const fail = (message: string) => {
      cleanup();
      script.remove();
      reject(new Error(message));
    };
    const handleLoad = () => {
      if (window.Twitch?.Embed) {
        cleanup();
        resolve(window.Twitch.Embed);
      } else fail("Twitch embed API did not initialize");
    };
    const handleError = () => fail("Failed to load Twitch embed API");
    const timeout = setTimeout(
      () => fail("Twitch embed API timed out"),
      10_000,
    );
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existing) {
      script.src = "https://embed.twitch.tv/embed/v1.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    twitchEmbedScriptPromise = null;
    throw error;
  });
  twitchEmbedScriptPromise = promise;
  return promise;
}

export function TwitchPreview({
  channel,
  hostname,
  interactive,
}: {
  channel: string;
  hostname: string;
  interactive: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwitchPlayer | null>(null);
  const preference = useMediaPreference("twitch-preview");
  const preferenceRef = useRef({
    enabled: preference.enabled,
    volume: preference.volume,
  });
  preferenceRef.current = {
    enabled: preference.enabled,
    volume: preference.volume,
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries script initialization
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    host.replaceChildren();
    setError(null);
    void loadTwitchEmbed()
      .then((Embed) => {
        if (cancelled || !hostRef.current) return;
        const embed = new Embed(hostRef.current, {
          width: "100%",
          height: "100%",
          channel,
          parent: [hostname],
          layout: Embed.VIDEO,
          autoplay: true,
          muted: true,
        });
        embed.addEventListener(Embed.VIDEO_READY, () => {
          if (cancelled) return;
          playerRef.current = embed.getPlayer();
          playerRef.current.setVolume(preferenceRef.current.volume);
          playerRef.current.setMuted(!preferenceRef.current.enabled);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setError(
            error instanceof Error ? error.message : "Twitch preview failed",
          );
      });
    return () => {
      cancelled = true;
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [channel, hostname, attempt]);

  useEffect(() => {
    playerRef.current?.setVolume(preference.volume);
    playerRef.current?.setMuted(!preference.enabled);
  }, [preference.enabled, preference.volume]);

  return (
    <div className="relative size-full">
      <section
        ref={hostRef}
        className="size-full overflow-hidden rounded-sm"
        style={{ pointerEvents: interactive ? "auto" : "none" }}
        aria-label={`${channel} Twitch stream`}
      />
      {error && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-4 text-center text-sm"
          style={{ pointerEvents: "auto" }}
        >
          <p>{error}</p>
          <button
            type="button"
            className="rounded border px-3 py-2"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry Twitch preview
          </button>
        </div>
      )}
    </div>
  );
}
