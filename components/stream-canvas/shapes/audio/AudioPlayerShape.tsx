import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { mediaFilenameFromUrl } from "@/lib/stream-canvas/media-filename";
import { getSyncedMediaPlaybackPosition } from "@/lib/stream-canvas/media-playback";
import {
  DEFAULT_MEDIA_VOLUME,
  getEffectiveMediaVolume,
} from "@/lib/stream-canvas/media-volume";
import { rectIntersectsStreamZone } from "@/lib/stream-canvas/stream-zone";
import { YouTubeInteractionCtx } from "../youtube/YouTubeEmbedShape";

// ---------------------------------------------------------------------------
// Shape type
// ---------------------------------------------------------------------------

type AudioPlayerShapeProps = {
  w: number;
  h: number;
  url: string;
  volume: number;
  loop: boolean;
  editorAudioEnabled?: boolean;
  isPlaying?: boolean;
  playbackPosition?: number;
  playbackUpdatedAt?: number;
};

export type AudioPlayerShape = TLBaseShape<
  "audio-player",
  AudioPlayerShapeProps
>;

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    "audio-player": AudioPlayerShapeProps;
  }
}

// ---------------------------------------------------------------------------
// Props validator
// ---------------------------------------------------------------------------

export const audioPlayerShapeProps: RecordProps<AudioPlayerShape> = {
  w: T.number,
  h: T.number,
  url: T.string,
  volume: T.number,
  loop: T.boolean,
  editorAudioEnabled: T.optional(T.boolean),
  isPlaying: T.optional(T.boolean),
  playbackPosition: T.optional(T.number),
  playbackUpdatedAt: T.optional(T.number),
};

// ---------------------------------------------------------------------------
// Context for file upload (provided by CanvasEditor)
// ---------------------------------------------------------------------------

export interface AudioUploadContext {
  roomId: string;
  getToken: () => Promise<string | null>;
  resolveUrl: (
    src: string,
    options?: { forceRefresh?: boolean },
  ) => Promise<string>;
}

export const AudioUploadCtx = createContext<AudioUploadContext | null>(null);

const MEDIA_URL_REFRESH_INTERVAL_MS = 60_000;

type EventWithStopPropagation = {
  stopPropagation(): void;
};

function clampPlaybackPosition(value: number, max: number | null): number {
  const minClamped = Math.max(0, value);

  if (max == null || !Number.isFinite(max) || max <= 0) {
    return minClamped;
  }

  return Math.min(minClamped, max);
}

function formatPlaybackTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Audio player component (used inside the shape)
// ---------------------------------------------------------------------------

function stopPropagation(event: EventWithStopPropagation) {
  event.stopPropagation();
}

function AudioPlayerComponent({
  editor,
  shape,
  isReadonly,
  onUpdateProps,
}: {
  editor: Editor;
  shape: AudioPlayerShape;
  isReadonly: boolean;
  onUpdateProps: (props: Partial<AudioPlayerShape["props"]>) => void;
}) {
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSharedPlaybackRef = useRef(0);
  const lastObservedPlaybackRef = useRef(0);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState(shape.props.url);
  const [displayTime, setDisplayTime] = useState(
    shape.props.playbackPosition ?? 0,
  );
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const mediaErrorCountRef = useRef(0);
  const uploadCtx = useContext(AudioUploadCtx);
  const syncedIsPlaying = shape.props.isPlaying ?? false;
  const syncedPlaybackPosition = shape.props.playbackPosition ?? 0;
  const syncedPlaybackUpdatedAt = shape.props.playbackUpdatedAt ?? 0;
  const pageBounds = useValue(
    "audio page bounds",
    () => editor.getShapePageBounds(shape),
    [editor, shape],
  );
  const isAudibleInReadonly = Boolean(
    pageBounds && rectIntersectsStreamZone(pageBounds),
  );
  const isInteractive = isReadonly || interactiveShapeId === shape.id;
  const editorAudioEnabled = shape.props.editorAudioEnabled ?? false;
  const effectiveVolume = getEffectiveMediaVolume(shape.props.volume);
  const isVolumeMuted = effectiveVolume <= 0.001;
  const shouldOutputAudio = isReadonly
    ? isAudibleInReadonly
    : isInteractive && editorAudioEnabled;
  const currentSyncedTime = getSyncedMediaPlaybackPosition(shape.props);
  const seekPreviewTime = scrubTime ?? displayTime;
  const maxTimelineTime = Math.max(duration, displayTime, currentSyncedTime, 0);
  const passiveProgressRatio =
    maxTimelineTime > 0 ? Math.min(displayTime / maxTimelineTime, 1) : 0;

  // Reset scrub and error state when the audio source changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: shape.props.url is the intentional trigger
  useEffect(() => {
    setScrubTime(null);
    setMediaFailed(false);
    mediaErrorCountRef.current = 0;
  }, [shape.props.url]);

  const resolveMediaUrl = useCallback(
    async (options: { forceRefresh?: boolean } = {}) => {
      if (!shape.props.url) return "";
      return uploadCtx?.resolveUrl
        ? uploadCtx.resolveUrl(shape.props.url, options)
        : shape.props.url;
    },
    [shape.props.url, uploadCtx],
  );

  useEffect(() => {
    let cancelled = false;
    if (!shape.props.url) {
      setResolvedMediaUrl("");
      return;
    }

    const refresh = (forceRefresh = false) => {
      resolveMediaUrl({ forceRefresh })
        .then((url) => {
          if (!cancelled) setResolvedMediaUrl(url);
        })
        .catch((error) => {
          console.error("[audio-player] media URL resolution failed:", error);
          if (!cancelled) setResolvedMediaUrl(shape.props.url);
        });
    };

    refresh();
    const refreshInterval = window.setInterval(() => {
      refresh(true);
    }, MEDIA_URL_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, [shape.props.url, resolveMediaUrl]);

  const refreshResolvedMediaUrl = useCallback(() => {
    resolveMediaUrl({ forceRefresh: true })
      .then((url) => {
        setResolvedMediaUrl(url);
        audioRef.current?.load();
      })
      .catch((error) => {
        console.error("[audio-player] media URL refresh failed:", error);
      });
  }, [resolveMediaUrl]);

  useEffect(() => {
    if (!shape.props.url) {
      setDisplayTime(0);
      setDuration(0);
      return;
    }

    if (scrubTime !== null) {
      return;
    }

    const nextDisplayTime = getSyncedMediaPlaybackPosition({
      isPlaying: syncedIsPlaying,
      playbackPosition: syncedPlaybackPosition,
      playbackUpdatedAt: syncedPlaybackUpdatedAt,
    });

    setDisplayTime((previousTime) =>
      Math.abs(previousTime - nextDisplayTime) < 0.01
        ? previousTime
        : nextDisplayTime,
    );
  }, [
    scrubTime,
    shape.props.url,
    syncedIsPlaying,
    syncedPlaybackPosition,
    syncedPlaybackUpdatedAt,
  ]);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = effectiveVolume;
    audioRef.current.loop = shape.props.loop;
    audioRef.current.muted = !shouldOutputAudio || isVolumeMuted;
  }, [effectiveVolume, isVolumeMuted, shape.props.loop, shouldOutputAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !shape.props.url || !resolvedMediaUrl) return;

    const desiredTime = clampPlaybackPosition(
      syncedPlaybackPosition +
        (syncedIsPlaying
          ? Math.max(0, Date.now() - syncedPlaybackUpdatedAt) / 1000
          : 0),
      Number.isFinite(audio.duration) ? audio.duration : null,
    );

    if (Math.abs(audio.currentTime - desiredTime) > 0.5) {
      audio.currentTime = desiredTime;
    }
    lastObservedPlaybackRef.current = desiredTime;

    if (!isReadonly && !isInteractive) {
      audio.pause();
      return;
    }

    if (syncedIsPlaying) {
      void audio.play().catch(() => {
        // Browser may block playback without a user gesture.
      });
      return;
    }

    audio.pause();
  }, [
    shape.props.url,
    resolvedMediaUrl,
    isInteractive,
    isReadonly,
    syncedIsPlaying,
    syncedPlaybackPosition,
    syncedPlaybackUpdatedAt,
  ]);

  const filename = shape.props.url ? mediaFilenameFromUrl(shape.props.url) : "";

  const syncPlayback = (
    nextIsPlaying: boolean,
    nextPosition = audioRef.current?.currentTime ?? syncedPlaybackPosition,
  ) => {
    const clampedPosition = clampPlaybackPosition(
      nextPosition,
      Number.isFinite(duration) ? duration : null,
    );

    const now = Date.now();
    lastSharedPlaybackRef.current = now;
    setDisplayTime(clampedPosition);
    onUpdateProps({
      isPlaying: nextIsPlaying,
      playbackPosition: clampedPosition,
      playbackUpdatedAt: now,
    });
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (syncedIsPlaying) {
      audioRef.current.pause();
      syncPlayback(false, audioRef.current.currentTime);
      return;
    }

    void audioRef.current
      .play()
      .then(() => {
        syncPlayback(true, audioRef.current?.currentTime ?? 0);
      })
      .catch((error) => {
        console.error("[audio-player] play() failed:", error);
      });
  };

  const updateScrubPosition = (nextPosition: number) => {
    const clampedPosition = clampPlaybackPosition(
      nextPosition,
      Number.isFinite(duration) ? duration : null,
    );

    setScrubTime(clampedPosition);
    setDisplayTime(clampedPosition);

    if (audioRef.current) {
      audioRef.current.currentTime = clampedPosition;
    }
  };

  const commitScrubPosition = (nextPosition?: number) => {
    const resolvedPosition =
      nextPosition ??
      scrubTime ??
      audioRef.current?.currentTime ??
      syncedPlaybackPosition;
    syncPlayback(syncedIsPlaying, resolvedPosition);
    setScrubTime(null);
  };

  const cancelScrubPosition = () => {
    setScrubTime(null);
    const restoredPosition = getSyncedMediaPlaybackPosition(shape.props);
    setDisplayTime(restoredPosition);

    if (audioRef.current) {
      audioRef.current.currentTime = clampPlaybackPosition(
        restoredPosition,
        Number.isFinite(duration) ? duration : null,
      );
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    mediaErrorCountRef.current = 0;
    setMediaFailed(false);
    setDuration(
      Number.isFinite(audioRef.current.duration)
        ? audioRef.current.duration
        : 0,
    );
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const currentTime = audioRef.current.currentTime;
    const previousTime = lastObservedPlaybackRef.current;
    lastObservedPlaybackRef.current = currentTime;
    if (scrubTime !== null) return;
    setDisplayTime(currentTime);

    const didLoopWrap =
      !isReadonly &&
      syncedIsPlaying &&
      shape.props.loop &&
      currentTime + Math.max(0.5, duration * 0.25) < previousTime;

    if (didLoopWrap) {
      const now = Date.now();
      lastSharedPlaybackRef.current = now;
      onUpdateProps({
        playbackPosition: currentTime,
        playbackUpdatedAt: now,
      });
      return;
    }

    if (!isReadonly && isInteractive && syncedIsPlaying) {
      const now = Date.now();
      if (now - lastSharedPlaybackRef.current >= 750) {
        lastSharedPlaybackRef.current = now;
        onUpdateProps({
          playbackPosition: currentTime,
          playbackUpdatedAt: now,
        });
      }
    }
  };

  const handleEnded = () => {
    const nextPosition = audioRef.current?.currentTime ?? duration;
    setDisplayTime(nextPosition);
    if (!shape.props.loop) {
      syncPlayback(false, nextPosition);
    }
  };

  const handleMediaError = () => {
    const mediaError = audioRef.current?.error;
    console.error("[audio-player] media error", {
      code: mediaError?.code,
      message: mediaError?.message,
      url: shape.props.url,
      resolved: Boolean(resolvedMediaUrl),
    });
    // Retry with a freshly minted access URL a bounded number of times, then
    // surface the failure instead of refresh-looping forever.
    mediaErrorCountRef.current += 1;
    if (mediaErrorCountRef.current <= 2) {
      refreshResolvedMediaUrl();
    } else {
      setMediaFailed(true);
    }
  };

  const sharedAudioElement = shape.props.url ? (
    // biome-ignore lint/a11y/useMediaCaption: audio-only controls in the editor do not support caption tracks
    <audio
      ref={audioRef}
      src={resolvedMediaUrl}
      loop={shape.props.loop}
      style={{ display: "none" }}
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      onError={handleMediaError}
    />
  ) : null;

  if (isReadonly) {
    if (!shape.props.url) return null;

    return (
      <>
        {sharedAudioElement}
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            borderRadius: 8,
            background:
              isAudibleInReadonly && !isVolumeMuted
                ? "linear-gradient(135deg, rgba(24,24,27,0.88), rgba(30,64,175,0.68))"
                : "linear-gradient(135deg, rgba(24,24,27,0.88), rgba(63,63,70,0.72))",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            fontFamily: "sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              textAlign: "center",
              maxWidth: "100%",
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                opacity: isAudibleInReadonly && !isVolumeMuted ? 1 : 0.72,
              }}
            >
              <title>Audio source</title>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <div
              style={{ fontSize: 11, letterSpacing: "0.18em", opacity: 0.72 }}
            >
              {isAudibleInReadonly && !isVolumeMuted ? "LIVE AUDIO" : "AUDIO"}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={filename}
            >
              {filename}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!shape.props.url) {
    // Passive placeholder — no pointer handling, so the empty element can be
    // selected and dragged like any other shape. Audio is added via the
    // media inspector panel.
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "rgba(30,30,30,0.95)",
          borderRadius: 8,
          color: "#fff",
          fontFamily: "sans-serif",
          padding: 12,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.6 }}
        >
          <title>Audio player placeholder</title>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <span
          style={{
            fontSize: 12,
            opacity: 0.65,
            textAlign: "center",
            maxWidth: 220,
          }}
        >
          Select this element and add audio in the panel
        </span>
      </div>
    );
  }

  if (isInteractive) {
    return (
      <>
        {sharedAudioElement}
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "rgba(30,30,30,0.95)",
            borderRadius: 8,
            color: "#fff",
            fontFamily: "sans-serif",
            padding: 12,
            position: "relative",
            pointerEvents: "all",
            zIndex: 1,
            userSelect: "text",
          }}
          onPointerDownCapture={stopPropagation}
          onPointerUpCapture={stopPropagation}
          onPointerMoveCapture={stopPropagation}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.72)",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={filename}
          >
            {filename}
          </div>
          {mediaFailed && (
            <div style={{ fontSize: 11, color: "#fca5a5" }}>
              Audio failed to load — check the file in the panel
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              pointerEvents: "all",
            }}
            onPointerDownCapture={stopPropagation}
            onPointerUpCapture={stopPropagation}
            onPointerMoveCapture={stopPropagation}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayback();
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                togglePlayback();
              }}
              style={{
                width: 48,
                height: 48,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                color: "#fff",
                cursor: "pointer",
                padding: 0,
                fontSize: 24,
                lineHeight: 1,
              }}
              title={syncedIsPlaying ? "Pause" : "Play"}
            >
              {syncedIsPlaying ? "⏸" : "▶"}
            </button>
            <span
              style={{
                flex: 1,
                fontSize: 11,
                opacity: 0.72,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPlaybackTime(seekPreviewTime)} /{" "}
              {formatPlaybackTime(maxTimelineTime)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              pointerEvents: "all",
            }}
            onPointerDownCapture={stopPropagation}
            onPointerUpCapture={stopPropagation}
            onPointerMoveCapture={stopPropagation}
          >
            <input
              type="range"
              min={0}
              max={Math.max(maxTimelineTime, 1)}
              step={0.1}
              value={Math.min(seekPreviewTime, Math.max(maxTimelineTime, 1))}
              onPointerDown={() => {
                setScrubTime(seekPreviewTime);
              }}
              onPointerCancel={() => {
                cancelScrubPosition();
              }}
              onInput={(e) => {
                updateScrubPosition(
                  Number.parseFloat((e.target as HTMLInputElement).value),
                );
              }}
              onChange={(e) => {
                commitScrubPosition(Number.parseFloat(e.target.value));
              }}
              style={{
                flex: 1,
                accentColor: "#60a5fa",
                height: 4,
                cursor: "pointer",
              }}
              title="Seek"
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {sharedAudioElement}
      <button
        type="button"
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          background: "rgba(30,30,30,0.95)",
          borderRadius: 8,
          color: "#fff",
          fontFamily: "sans-serif",
          padding: "8px 14px",
          border: "none",
          textAlign: "left",
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
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={filename}
        >
          {mediaFailed ? (
            <span style={{ color: "#fca5a5", opacity: 1 }}>
              Audio failed to load — {filename}
            </span>
          ) : (
            filename
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${passiveProgressRatio * 100}%`,
                height: "100%",
                background: "rgba(96,165,250,0.9)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              opacity: 0.6,
              minWidth: 72,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatPlaybackTime(displayTime)} /{" "}
            {formatPlaybackTime(maxTimelineTime)}
          </span>
        </div>
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// ShapeUtil
// ---------------------------------------------------------------------------

export class AudioPlayerShapeUtil extends BaseBoxShapeUtil<AudioPlayerShape> {
  static override type = "audio-player" as const;
  static override props = audioPlayerShapeProps;

  override getDefaultProps(): AudioPlayerShape["props"] {
    return {
      w: 300,
      h: 96,
      url: "",
      volume: DEFAULT_MEDIA_VOLUME,
      loop: false,
      editorAudioEnabled: false,
      isPlaying: false,
      playbackPosition: 0,
      playbackUpdatedAt: 0,
    };
  }

  getGeometry(shape: AudioPlayerShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: AudioPlayerShape) {
    const isReadonly = this.editor.getInstanceState().isReadonly;

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        <AudioPlayerComponent
          editor={this.editor}
          shape={shape}
          isReadonly={isReadonly}
          onUpdateProps={(props) => {
            this.editor.updateShape<AudioPlayerShape>({
              id: shape.id,
              type: "audio-player",
              props,
            });
          }}
        />
      </HTMLContainer>
    );
  }

  indicator(shape: AudioPlayerShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
  }

  override canResize() {
    return true;
  }

  override canEdit() {
    return false;
  }

  override onResize(
    shape: AudioPlayerShape,
    info: TLResizeInfo<AudioPlayerShape>,
  ) {
    return resizeBox(shape, info);
  }
}
