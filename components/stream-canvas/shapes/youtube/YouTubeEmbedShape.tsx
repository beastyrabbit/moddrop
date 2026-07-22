import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  BaseBoxShapeUtil,
  type Editor,
  HTMLContainer,
  type RecordProps,
  Rectangle2d,
  resizeBox,
  T,
  type TLBaseShape,
  type TLResizeInfo,
  useValue,
} from "tldraw";
import { getSyncedMediaPlaybackPosition } from "@/lib/stream-canvas/media-playback";
import {
  DEFAULT_MEDIA_VOLUME,
  getEffectiveMediaVolume,
} from "@/lib/stream-canvas/media-volume";
import { rectIntersectsStreamZone } from "@/lib/stream-canvas/stream-zone";
import type { YouTubePolicy } from "@/lib/stream-canvas/types";
import { useMediaPreference } from "../../media-preferences";

// ---------------------------------------------------------------------------
// Shape type
// ---------------------------------------------------------------------------

type YouTubeEmbedShapeProps = {
  w: number;
  h: number;
  url: string;
  volume?: number;
  isPlaying?: boolean;
  playbackPosition?: number;
  playbackUpdatedAt?: number;
};

export type YouTubeEmbedShape = TLBaseShape<
  "youtube-embed",
  YouTubeEmbedShapeProps
>;

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    "youtube-embed": YouTubeEmbedShapeProps;
  }
}

// ---------------------------------------------------------------------------
// Props validator
// ---------------------------------------------------------------------------

export const youtubeEmbedShapeProps: RecordProps<YouTubeEmbedShape> = {
  w: T.number,
  h: T.number,
  url: T.string,
  volume: T.optional(T.number),
  isPlaying: T.optional(T.boolean),
  playbackPosition: T.optional(T.number),
  playbackUpdatedAt: T.optional(T.number),
};

export interface YouTubeInteractionContextValue {
  interactiveShapeId: string | null;
  setInteractiveShapeId: (shapeId: string | null) => void;
}

export const YouTubeInteractionCtx =
  createContext<YouTubeInteractionContextValue>({
    interactiveShapeId: null,
    setInteractiveShapeId: () => {},
  });

export const YouTubePolicyCtx = createContext<YouTubePolicy>("preview_only");


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a YouTube video ID from various URL formats:
 *  - youtube.com/watch?v=ID
 *  - youtu.be/ID
 *  - youtube.com/embed/ID
 *  - youtube.com/shorts/ID
 *  - youtube.com/live/ID
 */
export function extractYouTubeId(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // youtu.be short link
  const shortMatch = trimmed.match(
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  );
  if (shortMatch) return shortMatch[1];

  // youtube.com variants
  const longMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/,
  );
  if (longMatch) return longMatch[1];

  return null;
}

const YOUTUBE_SYNC_THRESHOLD_PLAYING = 1.5;
const YOUTUBE_SYNC_THRESHOLD_PAUSED = 0.75;
const YOUTUBE_COMMAND_HOLD_MS = 900;

type YouTubePlayer = {
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  destroy: () => void;
  getCurrentTime: () => number;
  getIframe?: () => HTMLIFrameElement;
  getPlayerState: () => number;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume?: (volume: number) => void;
  unMute?: () => void;
};

type YouTubePlayerReadyEvent = {
  target: YouTubePlayer;
};

type YouTubePlayerStateChangeEvent = {
  data: number;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: YouTubePlayerReadyEvent) => void;
        onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

let youtubeIframeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube iframe API requires a browser"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const scriptId = "youtube-iframe-api";
    const existingScript = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;
    const previousReady = window.onYouTubeIframeAPIReady;

    const finish = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }

      youtubeIframeApiPromise = null;
      reject(new Error("YouTube iframe API failed to initialize"));
    };

    // Backstop for the hang cases: an existing script tag that already
    // failed (its onerror belonged to the first attempt), or a script that
    // loads but never initializes. Reject and clear the cache so a later
    // embed can retry.
    const timeoutId = window.setTimeout(() => {
      if (window.YT?.Player) {
        finish();
        return;
      }
      youtubeIframeApiPromise = null;
      reject(new Error("Timed out loading the YouTube iframe API"));
    }, 30_000);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeoutId);
      previousReady?.();
      finish();
    };

    if (existingScript) {
      window.setTimeout(() => {
        if (window.YT?.Player) {
          window.clearTimeout(timeoutId);
          finish();
        }
      }, 0);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      youtubeIframeApiPromise = null;
      reject(new Error("Failed to load YouTube iframe API"));
    };
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

function YouTubeEmbedPlayer({
  editor,
  shape,
  isReadonly,
  onUpdateProps,
  isAudibleInReadonly,
}: {
  editor: Editor;
  shape: YouTubeEmbedShape;
  isReadonly: boolean;
  onUpdateProps: (props: Partial<YouTubeEmbedShape["props"]>) => void;
  isAudibleInReadonly: boolean;
}) {
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerReadyRef = useRef(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const commandHoldUntilRef = useRef(0);
  const interactiveRef = useRef(false);
  const readonlyRef = useRef(isReadonly);
  const syncedVolume = shape.props.volume ?? DEFAULT_MEDIA_VOLUME;
  const previewPreference = useMediaPreference(shape.id);
  const audibleInReadonlyRef = useRef(isAudibleInReadonly);
  const syncedVolumeRef = useRef(syncedVolume);
  const editorAudioEnabledRef = useRef(previewPreference.enabled);
  const editorVolumeRef = useRef(previewPreference.volume);
  const updatePropsRef = useRef(onUpdateProps);
  const syncedStateRef = useRef({
    isPlaying: shape.props.isPlaying ?? false,
    playbackPosition: shape.props.playbackPosition ?? 0,
    playbackUpdatedAt: shape.props.playbackUpdatedAt ?? 0,
  });
  const isInteractive = isReadonly || interactiveShapeId === shape.id;
  const videoId = extractYouTubeId(shape.props.url);
  const syncedIsPlaying = shape.props.isPlaying ?? false;
  const syncedPlaybackPosition = shape.props.playbackPosition ?? 0;
  const syncedPlaybackUpdatedAt = shape.props.playbackUpdatedAt ?? 0;

  const syncLocalAudioState = useEffectEvent((player: YouTubePlayer) => {
    if (!playerReadyRef.current) {
      return;
    }

    const effectiveVolume =
      getEffectiveMediaVolume(syncedVolumeRef.current) *
      editorVolumeRef.current;
    const isVolumeMuted = effectiveVolume <= 0.001;

    player.setVolume?.(Math.round(effectiveVolume * 100));

    if (readonlyRef.current) {
      if (audibleInReadonlyRef.current && !isVolumeMuted) {
        player.unMute?.();
      } else {
        player.mute();
      }
      return;
    }

    if (
      !interactiveRef.current ||
      !editorAudioEnabledRef.current ||
      isVolumeMuted
    ) {
      player.mute();
      return;
    }

    player.unMute?.();
  });

  const applySyncedStateToPlayer = useEffectEvent(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) {
      return;
    }

    const desiredPlaybackPosition = getSyncedMediaPlaybackPosition(
      syncedStateRef.current,
    );
    const currentPlaybackPosition = player.getCurrentTime?.() ?? 0;
    const playerState = player.getPlayerState?.();
    const isPlayerPlaying =
      playerState === window.YT?.PlayerState.PLAYING ||
      playerState === window.YT?.PlayerState.BUFFERING;

    syncLocalAudioState(player);

    if (
      Math.abs(currentPlaybackPosition - desiredPlaybackPosition) >
      YOUTUBE_SYNC_THRESHOLD_PLAYING
    ) {
      commandHoldUntilRef.current = Date.now() + YOUTUBE_COMMAND_HOLD_MS;
      player.seekTo(desiredPlaybackPosition, true);
    }

    if (syncedStateRef.current.isPlaying) {
      if (!isPlayerPlaying) {
        commandHoldUntilRef.current = Date.now() + YOUTUBE_COMMAND_HOLD_MS;
        syncLocalAudioState(player);
        player.playVideo();
      }
      return;
    }

    if (isPlayerPlaying) {
      commandHoldUntilRef.current = Date.now() + YOUTUBE_COMMAND_HOLD_MS;
      player.pauseVideo();
    }
  });

  useEffect(() => {
    interactiveRef.current = isInteractive;
    readonlyRef.current = isReadonly;
    audibleInReadonlyRef.current = isAudibleInReadonly;
    syncedVolumeRef.current = syncedVolume;
    editorAudioEnabledRef.current = previewPreference.enabled;
    editorVolumeRef.current = previewPreference.volume;
    updatePropsRef.current = onUpdateProps;
    syncedStateRef.current = {
      isPlaying: syncedIsPlaying,
      playbackPosition: syncedPlaybackPosition,
      playbackUpdatedAt: syncedPlaybackUpdatedAt,
    };

    const iframe = playerRef.current?.getIframe?.();
    if (iframe) {
      iframe.style.pointerEvents = isInteractive ? "all" : "none";
      iframe.style.zIndex = isInteractive ? "" : "-1";
      iframe.tabIndex = isInteractive ? 0 : -1;
    }

    const player = playerRef.current;
    if (player && playerReadyRef.current) {
      syncLocalAudioState(player);
    }

    applySyncedStateToPlayer();

    const timeoutId = window.setTimeout(() => {
      applySyncedStateToPlayer();
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isAudibleInReadonly,
    isInteractive,
    isReadonly,
    onUpdateProps,
    syncedIsPlaying,
    syncedPlaybackPosition,
    syncedPlaybackUpdatedAt,
    syncedVolume,
    previewPreference.enabled,
    previewPreference.volume,
  ]);

  // Reset load attempts when the video changes so a new URL always gets a
  // fresh set of retries.
  // biome-ignore lint/correctness/useExhaustiveDependencies: videoId is the intentional trigger
  useEffect(() => {
    setLoadAttempt(0);
  }, [videoId]);

  useEffect(() => {
    const host = playerHostRef.current;
    if (!host || !videoId) {
      return;
    }

    let cancelled = false;
    let retryTimeoutId: number | undefined;
    playerReadyRef.current = false;
    host.innerHTML = "";

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !playerHostRef.current) {
          return;
        }

        playerRef.current?.destroy();
        playerRef.current = new YT.Player(playerHostRef.current, {
          videoId,
          playerVars: {
            controls: isReadonly ? 0 : 1,
            playsinline: 1,
            rel: 0,
            autoplay: 0,
            fs: 1,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              playerReadyRef.current = true;
              event.target.cueVideoById(
                videoId,
                syncedStateRef.current.playbackPosition,
              );

              const iframe = event.target.getIframe?.();
              if (iframe) {
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.border = "none";
                const iframeIsInteractive = interactiveRef.current;
                iframe.style.pointerEvents = iframeIsInteractive
                  ? "all"
                  : "none";
                iframe.style.zIndex = iframeIsInteractive ? "" : "-1";
                iframe.tabIndex = iframeIsInteractive ? 0 : -1;
                iframe.allow =
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
              }

              syncLocalAudioState(event.target);

              window.setTimeout(() => {
                applySyncedStateToPlayer();
              }, 100);
            },
            onStateChange: (event) => {
              if (readonlyRef.current || !interactiveRef.current) {
                return;
              }

              if (Date.now() < commandHoldUntilRef.current) {
                return;
              }

              const player = playerRef.current;
              if (!player) {
                return;
              }

              const currentPlaybackPosition = player.getCurrentTime?.() ?? 0;

              if (event.data === YT.PlayerState.PLAYING) {
                updatePropsRef.current({
                  isPlaying: true,
                  playbackPosition: currentPlaybackPosition,
                  playbackUpdatedAt: Date.now(),
                });
              }

              if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.ENDED
              ) {
                updatePropsRef.current({
                  isPlaying: false,
                  playbackPosition: currentPlaybackPosition,
                  playbackUpdatedAt: Date.now(),
                });
              }
            },
          },
        });
      })
      .catch((error) => {
        console.error("[youtube-embed] Failed to initialize player", error);
        // The loader clears its cached promise on failure, so retrying can
        // succeed once the API loads late (slow network, brief outage).
        // Without this, an already-mounted player would stay blank forever.
        if (!cancelled && loadAttempt < 3) {
          retryTimeoutId = window.setTimeout(() => {
            setLoadAttempt((attempt) => attempt + 1);
          }, 10_000);
        }
      });

    return () => {
      cancelled = true;
      if (retryTimeoutId !== undefined) {
        window.clearTimeout(retryTimeoutId);
      }
      playerReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      host.innerHTML = "";
    };
  }, [videoId, isReadonly, loadAttempt]);

  useEffect(() => {
    if (isReadonly || !isInteractive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (Date.now() < commandHoldUntilRef.current) {
        return;
      }

      const player = playerRef.current;
      if (!player || !playerReadyRef.current) {
        return;
      }

      const currentPlaybackPosition = player.getCurrentTime?.() ?? 0;
      const playerState = player.getPlayerState?.();
      const localIsPlaying =
        playerState === window.YT?.PlayerState.PLAYING ||
        playerState === window.YT?.PlayerState.BUFFERING;
      const desiredPlaybackPosition = getSyncedMediaPlaybackPosition(
        syncedStateRef.current,
      );
      const syncThreshold = localIsPlaying
        ? YOUTUBE_SYNC_THRESHOLD_PLAYING
        : YOUTUBE_SYNC_THRESHOLD_PAUSED;

      if (
        Math.abs(currentPlaybackPosition - desiredPlaybackPosition) <=
        syncThreshold
      ) {
        return;
      }

      updatePropsRef.current({
        isPlaying: localIsPlaying,
        playbackPosition: currentPlaybackPosition,
        playbackUpdatedAt: Date.now(),
      });
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isReadonly, isInteractive]);

  if (!videoId) {
    return null;
  }

  const playerContent = (
    <>
      <div
        ref={playerHostRef}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: isInteractive ? "all" : "none",
        }}
      />
      {!isReadonly && isInteractive ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setInteractiveShapeId(null);
            editor.setCurrentTool("select");
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.78)",
            color: "#fff",
            fontSize: 12,
            lineHeight: 1.1,
            cursor: "pointer",
          }}
        >
          Back to drawing
        </button>
      ) : null}
    </>
  );

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onPointerDownCapture={(e) => {
        if (isInteractive) {
          e.stopPropagation();
        }
      }}
      onPointerUpCapture={(e) => {
        if (isInteractive) {
          e.stopPropagation();
        }
      }}
    >
      {playerContent}
      {!isReadonly && !isInteractive ? (
        <button
          type="button"
          style={{
            position: "absolute",
            inset: 0,
            border: "none",
            padding: 0,
            background: "transparent",
            cursor: "pointer",
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setInteractiveShapeId(shape.id);
            editor.setCurrentTool("select");
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") {
              return;
            }

            e.preventDefault();
            e.stopPropagation();
            setInteractiveShapeId(shape.id);
            editor.setCurrentTool("select");
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShapeUtil
// ---------------------------------------------------------------------------

function YouTubeEmbedShapeComponent({
  editor,
  shape,
}: {
  editor: Editor;
  shape: YouTubeEmbedShape;
}) {
  const youtubePolicy = useContext(YouTubePolicyCtx);
  const videoId = extractYouTubeId(shape.props.url);
  const isReadonly = useValue(
    "youtube readonly state",
    () => editor.getInstanceState().isReadonly,
    [editor],
  );
  const pageBounds = useValue(
    "youtube page bounds",
    () => editor.getShapePageBounds(shape),
    [editor, shape],
  );
  const isAudibleInReadonly = Boolean(
    pageBounds && rectIntersectsStreamZone(pageBounds),
  );

  if (isReadonly && youtubePolicy !== "allow_on_air") {
    return null;
  }

  return (
    <HTMLContainer
      id={shape.id}
      style={{
        width: shape.props.w,
        height: shape.props.h,
        overflow: "hidden",
        borderRadius: 8,
        background: "#000",
      }}
    >
      {youtubePolicy === "disabled" ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111827",
            color: "rgba(255,255,255,0.72)",
            fontFamily: "sans-serif",
            fontSize: 13,
            padding: 20,
            textAlign: "center",
          }}
        >
          YouTube is disabled by the room owner.
        </div>
      ) : videoId ? (
        <YouTubeEmbedPlayer
          editor={editor}
          shape={shape}
          isReadonly={isReadonly}
          isAudibleInReadonly={isAudibleInReadonly}
          onUpdateProps={(props) => {
            editor.updateShape<YouTubeEmbedShape>({
              id: shape.id,
              type: "youtube-embed",
              props,
            });
          }}
        />
      ) : (
        // Passive placeholder — no pointer handling, so the empty element
        // can be selected and dragged like any other shape. The URL is set
        // via the media inspector panel.
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "rgba(0,0,0,0.9)",
            color: "#fff",
            fontFamily: "sans-serif",
            padding: 16,
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.6 }}
          >
            <title>YouTube video placeholder</title>
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
            <path d="m10 15 5-3-5-3z" />
          </svg>
          {!isReadonly && (
            <span
              style={{
                fontSize: 13,
                opacity: 0.7,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              Select this element and paste a YouTube URL in the panel
            </span>
          )}
        </div>
      )}
    </HTMLContainer>
  );
}

export class YouTubeEmbedShapeUtil extends BaseBoxShapeUtil<YouTubeEmbedShape> {
  static override type = "youtube-embed" as const;
  static override props = youtubeEmbedShapeProps;

  override getDefaultProps(): YouTubeEmbedShape["props"] {
    return {
      w: 480,
      h: 270,
      url: "",
      volume: DEFAULT_MEDIA_VOLUME,
      isPlaying: false,
      playbackPosition: 0,
      playbackUpdatedAt: 0,
    };
  }

  getGeometry(shape: YouTubeEmbedShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override getIndicatorPath(): undefined {
    return undefined;
  }

  component(shape: YouTubeEmbedShape) {
    return <YouTubeEmbedShapeComponent editor={this.editor} shape={shape} />;
  }

  indicator(shape: YouTubeEmbedShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  override canEdit() {
    return false;
  }

  override onResize(
    shape: YouTubeEmbedShape,
    info: TLResizeInfo<YouTubeEmbedShape>,
  ) {
    return resizeBox(shape, info);
  }
}
