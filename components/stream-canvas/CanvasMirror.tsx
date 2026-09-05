"use client";

import { useSync } from "@tldraw/sync";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type TLAssetStore,
  type TLComponents,
  Tldraw,
  useEditor,
} from "tldraw";
import "tldraw/tldraw.css";
import {
  buildObsWsUrl,
  exchangeObsTokenWithRetry as exchangeObsToken,
  getObsUploadUrlRefreshDelayMs,
  resolveObsUploadUrl,
} from "@/lib/stream-canvas/api";
import { STREAM_ZONE } from "@/lib/stream-canvas/stream-zone";
import type { YouTubePolicy } from "@/lib/stream-canvas/types";
import { readRoomConfigMessage } from "@/lib/stream-canvas/room-config";
import { AudioUploadCtx } from "./shapes/audio/AudioPlayerShape";
import {
  CanvasMediaRefreshContext,
  customShapeUtils,
  syncShapeUtils,
} from "./shapes/shared";
import { YouTubePolicyCtx } from "./shapes/youtube/YouTubeEmbedShape";

const TLDRAW_LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;

interface CanvasMirrorProps {
  /** The long-lived OBS bootstrap secret from the URL. */
  obsSecret: string;
}

/** Disable tldraw's background and grid for OBS transparency. */
const obsComponents: TLComponents = {
  Background: null,
  Grid: null,
};

/** Lock the camera to the stream zone and hide the stream zone frame. */
function OBSSetup() {
  const editor = useEditor();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Lock camera to the stream zone
    editor.setCamera({
      x: -STREAM_ZONE.x,
      y: -STREAM_ZONE.y,
      z: 1,
    });

    const disposeCamera = editor.sideEffects.registerBeforeChangeHandler(
      "camera",
      (_prev, next) => ({
        ...next,
        x: -STREAM_ZONE.x,
        y: -STREAM_ZONE.y,
        z: 1,
      }),
    );

    return () => {
      disposeCamera();
    };
  }, [editor]);

  return null;
}

export function CanvasMirror(props: CanvasMirrorProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ConnectedCanvasMirror
      key={`${props.obsSecret}:${attempt}`}
      {...props}
      retry={() => setAttempt((value) => value + 1)}
    />
  );
}

function ConnectedCanvasMirror({
  obsSecret,
  retry,
}: CanvasMirrorProps & { retry: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [youtubePolicy, setYouTubePolicy] =
    useState<YouTubePolicy>("preview_only");
  const initialTokenExchangeRef = useRef<ReturnType<
    typeof exchangeObsToken
  > | null>(null);

  // Verify the secret is valid on mount
  useEffect(() => {
    let cancelled = false;
    const tokenExchangePromise = exchangeObsToken(obsSecret);
    initialTokenExchangeRef.current = tokenExchangePromise;
    tokenExchangePromise
      .then((data) => {
        if (!cancelled) {
          setRoomId(data.roomId);
          setYouTubePolicy(data.youtubePolicy);
          setReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
      if (initialTokenExchangeRef.current === tokenExchangePromise) {
        initialTokenExchangeRef.current = null;
      }
    };
  }, [obsSecret]);

  // Build the WS URL using a fresh short-lived token on each (re)connection
  const getUri = useCallback(async () => {
    const tokenExchangePromise =
      initialTokenExchangeRef.current ?? exchangeObsToken(obsSecret);
    initialTokenExchangeRef.current = null;
    const data = await tokenExchangePromise;
    setYouTubePolicy(data.youtubePolicy);
    return buildObsWsUrl(data.roomId, data.token);
  }, [obsSecret]);

  // OBS mirror doesn't upload — resolve assets by returning their src
  const assets = useMemo<TLAssetStore>(
    () => ({
      async upload() {
        throw new Error("OBS mirror is read-only");
      },
      resolve(asset) {
        if (!asset.props.src) return null;
        return resolveObsUploadUrl(asset.props.src, obsSecret).catch(
          (error) => {
            console.error("[obs-mirror] asset URL resolution failed:", error);
            return null;
          },
        );
      },
    }),
    [obsSecret],
  );

  const audioUploadCtx = useMemo(
    () =>
      roomId
        ? {
            roomId,
            getToken: async () => null,
            resolveUrl: (src: string, options?: { forceRefresh?: boolean }) =>
              resolveObsUploadUrl(src, obsSecret, options),
            getRefreshDelayMs: (src: string) =>
              getObsUploadUrlRefreshDelayMs(src),
          }
        : null,
    [obsSecret, roomId],
  );
  const mediaRefreshCtx = useMemo(
    () => ({
      getRefreshDelayMs: (src: string) => getObsUploadUrlRefreshDelayMs(src),
    }),
    [],
  );

  const storeWithStatus = useSync({
    uri: getUri,
    assets,
    shapeUtils: syncShapeUtils,
    onCustomMessageReceived(data: unknown) {
      const roomConfig = readRoomConfigMessage(data);
      if (roomConfig) setYouTubePolicy(roomConfig.youtubePolicy);
    },
  });

  if (error) {
    return (
      <div
        role="alert"
        className="flex h-screen flex-col items-center justify-center gap-3 text-red-500 text-sm"
      >
        {error}
        <button
          type="button"
          className="rounded border px-3 py-2"
          onClick={retry}
        >
          Retry OBS connection
        </button>
      </div>
    );
  }

  if (!ready || !audioUploadCtx || storeWithStatus.status === "loading") {
    return null; // Transparent — nothing to show while connecting
  }

  if (storeWithStatus.status === "error") {
    console.error(
      "[obs-mirror] WebSocket connection error:",
      storeWithStatus.error,
    );
    return (
      <div className="flex h-screen items-center justify-center bg-black/70 px-6 text-center text-red-300 text-sm">
        OBS connection error. Refresh the source or regenerate the OBS URL.
        <button
          type="button"
          className="ml-3 rounded border px-3 py-2"
          onClick={retry}
        >
          Retry OBS connection
        </button>
      </div>
    );
  }

  return (
    <div
      className="obs-mirror"
      style={{
        width: STREAM_ZONE.width,
        height: STREAM_ZONE.height,
        background: "transparent",
        overflow: "hidden",
        position: "fixed",
        inset: 0,
      }}
    >
      <CanvasMediaRefreshContext.Provider value={mediaRefreshCtx}>
        <AudioUploadCtx.Provider value={audioUploadCtx}>
          <YouTubePolicyCtx.Provider value={youtubePolicy}>
            <Tldraw
              store={storeWithStatus.store}
              shapeUtils={customShapeUtils}
              licenseKey={TLDRAW_LICENSE_KEY}
              hideUi
              components={obsComponents}
            >
              <OBSSetup />
            </Tldraw>
          </YouTubePolicyCtx.Provider>
        </AudioUploadCtx.Provider>
      </CanvasMediaRefreshContext.Provider>
    </div>
  );
}
