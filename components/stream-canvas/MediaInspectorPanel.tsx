"use client";

import { useContext, useEffect, useRef, useState } from "react";
import {
  DefaultStylePanel,
  type TLShapeId,
  type TLUiStylePanelProps,
  TldrawUiButton,
  TldrawUiButtonLabel,
  TldrawUiIcon,
  TldrawUiInput,
  TldrawUiSlider,
  useEditor,
  usePassThroughWheelEvents,
  useValue,
} from "tldraw";
import { uploadFile } from "@/lib/stream-canvas/api";
import { mediaFilenameFromUrl } from "@/lib/stream-canvas/media-filename";
import { getSyncedMediaPlaybackPosition } from "@/lib/stream-canvas/media-playback";
import { DEFAULT_MEDIA_VOLUME } from "@/lib/stream-canvas/media-volume";
import {
  type AudioPlayerShape,
  AudioUploadCtx,
} from "./shapes/audio/AudioPlayerShape";
import {
  extractYouTubeId,
  type YouTubeEmbedShape,
  YouTubeInteractionCtx,
} from "./shapes/youtube/YouTubeEmbedShape";
import { useMediaPreference } from "./media-preferences";

/**
 * StylePanel override: when a single media element (YouTube embed or audio
 * player) is selected with the select tool, the top-right panel becomes its
 * inspector — URL, volume, and playback settings live here instead of inside
 * the shape, so the element itself stays draggable and uncluttered. Any other
 * selection (or an active non-select tool) falls back to the default style
 * panel.
 */
export function CanvasStylePanel(props: TLUiStylePanelProps) {
  const editor = useEditor();
  const mediaShape = useValue("inspected media shape", () => {
    // While any non-select tool is active the user needs that tool's
    // styles, not the media inspector, even if a media shape is still
    // selected.
    if (editor.getCurrentToolId() !== "select") return null;
    const shape = editor.getOnlySelectedShape();
    if (!shape) return null;
    if (shape.type !== "youtube-embed" && shape.type !== "audio-player") {
      return null;
    }
    return shape;
  }, [editor]);

  if (!mediaShape) {
    return <DefaultStylePanel {...props} />;
  }

  // Key by id so per-shape panel state (upload notices, URL drafts) is
  // isolated when switching directly between two media shapes.
  return (
    <MediaInspectorPanel
      key={mediaShape.id}
      shape={mediaShape}
      isMobile={props.isMobile}
    />
  );
}

function MediaInspectorPanel({
  shape,
  isMobile,
}: {
  shape: YouTubeEmbedShape | AudioPlayerShape;
  isMobile?: boolean;
}) {
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  usePassThroughWheelEvents(ref);

  // Match DefaultStylePanel: swallow Escape while focus is inside the panel
  // so it returns focus to the canvas instead of deselecting the shape (which
  // would close the inspector mid-edit).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        ref.current?.contains(document.activeElement)
      ) {
        event.stopPropagation();
        editor.getContainer().focus();
      }
    }

    const el = ref.current;
    el?.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      el?.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [editor]);

  return (
    <div
      ref={ref}
      className={`tlui-style-panel${isMobile ? "" : " tlui-style-panel__wrapper"}`}
      data-ismobile={isMobile}
      style={isMobile ? { maxWidth: 280 } : { width: 280, maxWidth: 280 }}
    >
      {shape.type === "youtube-embed" ? (
        <YouTubeInspector shape={shape} />
      ) : (
        <AudioInspector shape={shape} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Props payload for pointing a media shape at a new URL: playback resets. */
function freshMediaUrlProps(url: string) {
  return {
    url,
    isPlaying: false,
    playbackPosition: 0,
    playbackUpdatedAt: Date.now(),
  };
}

function InspectorSection({
  divider = true,
  children,
}: {
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 8px",
        borderTop: divider ? "1px solid var(--tl-color-divider)" : "none",
      }}
    >
      {children}
    </div>
  );
}

function InspectorHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px 6px",
        color: "var(--tl-color-text-1)",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <TldrawUiIcon icon={icon} label={title} small />
      {title}
    </div>
  );
}

function InspectorLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "0 4px",
        fontSize: 11,
        color: "var(--tl-color-text-3)",
      }}
    >
      {children}
    </div>
  );
}

function InspectorHint({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "error" | "success";
  children: React.ReactNode;
}) {
  const color =
    tone === "error"
      ? "#e5484d"
      : tone === "success"
        ? "#46a758"
        : "var(--tl-color-text-3)";
  return (
    <div
      style={{
        padding: "0 4px",
        fontSize: 11,
        color,
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span
        style={{
          padding: "0 4px",
          fontSize: 11,
          color: "var(--tl-color-text-1)",
        }}
      >
        {label}
      </span>
      <TldrawUiButton
        type="normal"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        style={{
          minHeight: 28,
          color: checked
            ? "var(--tl-color-selected)"
            : "var(--tl-color-text-3)",
          fontWeight: 600,
        }}
      >
        <TldrawUiButtonLabel>{checked ? "On" : "Off"}</TldrawUiButtonLabel>
      </TldrawUiButton>
    </div>
  );
}

function VolumeSlider({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (volume: number) => void;
}) {
  const editor = useEditor();
  const percent = Math.round(volume * 100);
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0 4px",
          fontSize: 11,
          color: "var(--tl-color-text-3)",
        }}
      >
        <span>OBS volume</span>
        <span>{percent}%</span>
      </div>
      <TldrawUiSlider
        steps={100}
        value={percent}
        label="OBS volume"
        title={`OBS volume ${percent}%`}
        onValueChange={(value) => onChange(value / 100)}
        onHistoryMark={(id) => editor.markHistoryStoppingPoint(id)}
      />
    </>
  );
}

function PlaybackControls({
  isPlaying,
  onTogglePlay,
  onResync,
}: {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResync: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <TldrawUiButton
        type="normal"
        style={{ flexGrow: 1 }}
        onClick={onTogglePlay}
      >
        <TldrawUiButtonLabel>
          {isPlaying ? "Pause" : "Play"}
        </TldrawUiButtonLabel>
      </TldrawUiButton>
      <TldrawUiButton type="normal" style={{ flexGrow: 1 }} onClick={onResync}>
        <TldrawUiButtonLabel>Resync</TldrawUiButtonLabel>
      </TldrawUiButton>
    </div>
  );
}

function InteractToggleButton({
  isInteractive,
  enterLabel,
  exitLabel,
  onToggle,
}: {
  isInteractive: boolean;
  enterLabel: string;
  exitLabel: string;
  onToggle: () => void;
}) {
  return (
    <TldrawUiButton
      type="normal"
      onClick={onToggle}
      style={{
        color: isInteractive ? "var(--tl-color-selected)" : undefined,
      }}
    >
      <TldrawUiButtonLabel>
        {isInteractive ? exitLabel : enterLabel}
      </TldrawUiButtonLabel>
    </TldrawUiButton>
  );
}

// ---------------------------------------------------------------------------
// YouTube inspector
// ---------------------------------------------------------------------------

function YouTubeInspector({ shape }: { shape: YouTubeEmbedShape }) {
  const editor = useEditor();
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const previewPreference = useMediaPreference(shape.id);

  const hasVideo = Boolean(extractYouTubeId(shape.props.url));
  const isPlaying = shape.props.isPlaying ?? false;
  const isInteractive = interactiveShapeId === shape.id;

  const updateProps = (props: Partial<YouTubeEmbedShape["props"]>) => {
    editor.updateShape<YouTubeEmbedShape>({
      id: shape.id,
      type: "youtube-embed",
      props,
    });
  };

  const commitUrl = (value: string) => {
    const url = value.trim();
    if (url === shape.props.url) return;
    // Keep the previous (working) video instead of committing a URL that
    // can't be embedded. An empty value intentionally clears the video.
    if (url && !extractYouTubeId(url)) {
      setUrlError("Not a recognized YouTube URL.");
      return;
    }
    setUrlError(null);
    updateProps(freshMediaUrlProps(url));
  };

  const syncedPosition = () => getSyncedMediaPlaybackPosition(shape.props);

  return (
    <>
      <InspectorHeader icon="youtube-embed-icon" title="YouTube" />
      <InspectorSection divider={false}>
        <InspectorLabel>Video URL</InspectorLabel>
        {/* Keyed on the committed URL so external changes (remote edits)
            remount the uncontrolled input — otherwise a stale value would be
            re-committed on blur, and Escape would revert to the mount-time
            URL. */}
        <TldrawUiInput
          key={shape.props.url}
          className="tlui-embed-dialog__input"
          placeholder="https://youtube.com/watch?v=..."
          defaultValue={shape.props.url}
          onComplete={commitUrl}
          onBlur={commitUrl}
        />
        {urlError ? (
          <InspectorHint tone="error">{urlError}</InspectorHint>
        ) : (
          !hasVideo && (
            <InspectorHint>
              Paste a YouTube link to load the video.
            </InspectorHint>
          )
        )}
      </InspectorSection>
      {hasVideo && (
        <>
          <InspectorSection>
            <VolumeSlider
              volume={shape.props.volume ?? DEFAULT_MEDIA_VOLUME}
              onChange={(volume) => updateProps({ volume })}
            />
            {/* Local, per-user monitoring preference — not synced state. */}
            <ToggleRow
              label="Preview audio"
              checked={previewPreference.enabled}
              onToggle={() =>
                previewPreference.setEnabled(!previewPreference.enabled)
              }
            />
          </InspectorSection>
          <InspectorSection>
            <PlaybackControls
              isPlaying={isPlaying}
              onTogglePlay={() =>
                updateProps({
                  isPlaying: !isPlaying,
                  playbackPosition: syncedPosition(),
                  playbackUpdatedAt: Date.now(),
                })
              }
              onResync={() =>
                updateProps({
                  playbackPosition: syncedPosition(),
                  playbackUpdatedAt: Date.now(),
                })
              }
            />
            <InteractToggleButton
              isInteractive={isInteractive}
              enterLabel="Interact with video"
              exitLabel="Exit interact mode"
              onToggle={() => {
                setInteractiveShapeId(isInteractive ? null : shape.id);
                editor.setCurrentTool("select");
              }}
            />
            <InspectorHint>
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Open YouTube sign-in
              </a>
            </InspectorHint>
          </InspectorSection>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Audio inspector
// ---------------------------------------------------------------------------

type UploadOutcome =
  | { ok: true; notice: string }
  | { ok: false; error: string };

interface PendingUpload {
  filename: string;
  token: object;
  promise: Promise<UploadOutcome | null>;
}

// In-flight uploads outlive the (keyed, selection-dependent) panel instance:
// deselecting mid-upload unmounts the inspector, so track uploads per shape
// here. A newer upload for the same shape supersedes an older one — the loser
// drops its result instead of overwriting the shape. Settled outcomes are
// kept in uploadOutcomes so a failure that lands while the panel is unmounted
// is still shown on the next mount.
const pendingUploads = new Map<TLShapeId, PendingUpload>();
const uploadOutcomes = new Map<TLShapeId, UploadOutcome>();

function AudioInspector({ shape }: { shape: AudioPlayerShape }) {
  const editor = useEditor();
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const uploadCtx = useContext(AudioUploadCtx);
  const previewPreference = useMediaPreference(shape.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trackedUpload, setTrackedUpload] = useState<PendingUpload | null>(
    () => pendingUploads.get(shape.id) ?? null,
  );
  const [outcome, setOutcome] = useState<UploadOutcome | null>(
    () => uploadOutcomes.get(shape.id) ?? null,
  );

  // Show the outcome of the tracked upload once it settles — including
  // uploads adopted from a previous panel instance of the same shape.
  useEffect(() => {
    if (!trackedUpload) return;
    let alive = true;
    trackedUpload.promise
      .then((settled) => {
        if (!alive) return;
        setTrackedUpload((current) =>
          current === trackedUpload ? null : current,
        );
        if (settled) setOutcome(settled);
      })
      .catch(() => {
        // The upload chain handles its own errors; this is a guard so a
        // future refactor can never strand the panel on "Uploading...".
        if (!alive) return;
        setTrackedUpload((current) =>
          current === trackedUpload ? null : current,
        );
      });
    return () => {
      alive = false;
    };
  }, [trackedUpload]);

  const uploading = trackedUpload !== null;
  const hasAudio = Boolean(shape.props.url);
  const isPlaying = shape.props.isPlaying ?? false;
  const isInteractive = interactiveShapeId === shape.id;
  const filename = shape.props.url ? mediaFilenameFromUrl(shape.props.url) : "";

  const updateProps = (props: Partial<AudioPlayerShape["props"]>) => {
    editor.updateShape<AudioPlayerShape>({
      id: shape.id,
      type: "audio-player",
      props,
    });
  };

  const setUrl = (url: string) => {
    // A manual URL change supersedes any in-flight upload and clears any
    // previous outcome message.
    pendingUploads.delete(shape.id);
    uploadOutcomes.delete(shape.id);
    setTrackedUpload(null);
    setOutcome(null);
    updateProps(freshMediaUrlProps(url));
  };

  const commitUrl = (value: string) => {
    const url = value.trim();
    if (url === shape.props.url) return;
    setUrl(url);
  };

  const handleFileUpload = (file: File) => {
    if (!uploadCtx) {
      console.warn("[audio-player] upload requested without an upload context");
      return;
    }
    const shapeId = shape.id;
    const { roomId, getToken } = uploadCtx;
    setOutcome(null);
    uploadOutcomes.delete(shapeId);

    const token = {};
    const promise = (async (): Promise<UploadOutcome | null> => {
      try {
        const result = await uploadFile(roomId, file, getToken);
        if (pendingUploads.get(shapeId)?.token !== token) return null;
        editor.updateShape<AudioPlayerShape>({
          id: shapeId,
          type: "audio-player",
          props: freshMediaUrlProps(result.url),
        });
        const settled: UploadOutcome = {
          ok: true,
          notice: `Uploaded ${result.filename}`,
        };
        uploadOutcomes.set(shapeId, settled);
        return settled;
      } catch (err) {
        console.error("[audio-player] Upload failed:", err);
        if (pendingUploads.get(shapeId)?.token !== token) return null;
        const settled: UploadOutcome = {
          ok: false,
          error: err instanceof Error ? err.message : "Upload failed",
        };
        uploadOutcomes.set(shapeId, settled);
        return settled;
      } finally {
        if (pendingUploads.get(shapeId)?.token === token) {
          pendingUploads.delete(shapeId);
        }
      }
    })();
    const entry: PendingUpload = { filename: file.name, token, promise };
    pendingUploads.set(shapeId, entry);
    setTrackedUpload(entry);
  };

  return (
    <>
      <InspectorHeader icon="audio-player-icon" title="Audio" />
      <InspectorSection divider={false}>
        <InspectorLabel>Audio file</InspectorLabel>
        {uploadCtx && (
          <>
            <TldrawUiButton
              type="normal"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <TldrawUiButtonLabel>
                {uploading
                  ? `Uploading ${trackedUpload?.filename ?? "audio"}...`
                  : "Upload audio file"}
              </TldrawUiButtonLabel>
            </TldrawUiButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </>
        )}
        {/* Keyed on the committed URL — see the YouTube input note. */}
        <TldrawUiInput
          key={shape.props.url}
          className="tlui-embed-dialog__input"
          placeholder="or paste an audio URL..."
          defaultValue={shape.props.url}
          onComplete={commitUrl}
          onBlur={commitUrl}
        />
        {outcome && !outcome.ok ? (
          <InspectorHint tone="error">{outcome.error}</InspectorHint>
        ) : outcome?.ok ? (
          <InspectorHint tone="success">{outcome.notice}</InspectorHint>
        ) : hasAudio ? (
          <InspectorHint>Current file: {filename}</InspectorHint>
        ) : (
          <InspectorHint>No audio file selected.</InspectorHint>
        )}
      </InspectorSection>
      {hasAudio && (
        <>
          <InspectorSection>
            <VolumeSlider
              volume={shape.props.volume}
              onChange={(volume) => updateProps({ volume })}
            />
            {/* Local, per-user monitoring preference — not synced state. */}
            <ToggleRow
              label="Preview audio"
              checked={previewPreference.enabled}
              onToggle={() =>
                previewPreference.setEnabled(!previewPreference.enabled)
              }
            />
            <ToggleRow
              label="Loop"
              checked={shape.props.loop}
              onToggle={() => updateProps({ loop: !shape.props.loop })}
            />
          </InspectorSection>
          <InspectorSection>
            <PlaybackControls
              isPlaying={isPlaying}
              onTogglePlay={() => {
                const startPlayback = !isPlaying;
                // Starting playback also opens the in-element player
                // controls: the local <audio> element only plays (and
                // progress only advances) in interact mode, so without this
                // the panel's Play would be silent and look frozen.
                if (startPlayback && !isInteractive) {
                  setInteractiveShapeId(shape.id);
                  editor.setCurrentTool("select");
                }
                updateProps({
                  isPlaying: startPlayback,
                  playbackPosition: getSyncedMediaPlaybackPosition(shape.props),
                  playbackUpdatedAt: Date.now(),
                });
              }}
              onResync={() =>
                updateProps({
                  playbackPosition: getSyncedMediaPlaybackPosition(shape.props),
                  playbackUpdatedAt: Date.now(),
                })
              }
            />
            <InteractToggleButton
              isInteractive={isInteractive}
              enterLabel="Open player controls"
              exitLabel="Exit player controls"
              onToggle={() => {
                setInteractiveShapeId(isInteractive ? null : shape.id);
                editor.setCurrentTool("select");
              }}
            />
            <TldrawUiButton
              type="normal"
              onClick={() => {
                setInteractiveShapeId(null);
                setUrl("");
              }}
            >
              <TldrawUiButtonLabel>Remove audio</TldrawUiButtonLabel>
            </TldrawUiButton>
          </InspectorSection>
        </>
      )}
    </>
  );
}
