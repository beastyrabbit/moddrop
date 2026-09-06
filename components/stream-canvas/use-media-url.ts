import { useCallback, useEffect, useRef, useState } from "react";
import type { UploadUrlRefreshDelayMs } from "@/lib/stream-canvas/api";

export interface MediaUrlResolver {
  resolveUrl(
    src: string,
    options?: { forceRefresh?: boolean },
  ): Promise<string>;
  getRefreshDelayMs(src: string): UploadUrlRefreshDelayMs;
}

export function useMediaUrl(src: string, resolver: MediaUrlResolver | null) {
  const [resolved, setResolved] = useState({
    src,
    url: resolver ? "" : src,
    reloadVersion: 0,
  });
  const generation = useRef(0);
  const [recovery, setRecovery] = useState(0);
  const recover = useCallback(() => setRecovery((value) => value + 1), []);
  const previousRecovery = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const force = recovery !== previousRecovery.current;
    previousRecovery.current = recovery;
    const refresh = async (forceRefresh = false) => {
      try {
        const url =
          src && resolver
            ? await resolver.resolveUrl(src, { forceRefresh })
            : src;
        if (generation.current !== current) return;
        setResolved((previous) => ({
          src,
          url,
          reloadVersion: previous.reloadVersion + (forceRefresh ? 1 : 0),
        }));
        failures = 0;
        const delay = resolver?.getRefreshDelayMs(src);
        if (delay !== undefined)
          timer = setTimeout(
            () => void refresh(),
            Math.max(100, delay ?? 5_000),
          );
      } catch (error) {
        if (generation.current !== current) return;
        console.error("[media] URL renewal failed", error);
        failures++;
        // Keep mounted OBS sources recoverable through longer API outages.
        // After the quick retries, limit requests to one every 30 seconds.
        timer = setTimeout(
          () => void refresh(forceRefresh),
          failures <= 3 ? failures * 1_000 : 30_000,
        );
      }
    };
    void refresh(force);
    return () => {
      generation.current++;
      clearTimeout(timer);
    };
  }, [src, resolver, recovery]);

  return {
    url: resolved.src === src ? resolved.url : "",
    reloadVersion: resolved.reloadVersion,
    recover,
  };
}
