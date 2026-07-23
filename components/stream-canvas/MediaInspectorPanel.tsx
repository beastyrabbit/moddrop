"use client";

import { useContext, useEffect, useRef, useState } from "react";
import {
  DefaultStylePanel,
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
import { DEFAULT_MEDIA_VOLUME } from "@/lib/stream-canvas/media-volume";
import {
  type AudioPlayerShape,
  AudioUploadCtx,
  getAudioSyncedPlaybackPosition,
} from "./shapes/audio/AudioPlayerShape";
import {
  extractYouTubeId,
  getSyncedPlaybackPosition,
  type YouTubeEmbedShape,
  YouTubeInteractionCtx,
} from "./shapes/youtube/YouTubeEmbedShape";

/**
 * StylePanel override: when a single media element (YouTube embed or audio
 * player) is selected with the select tool, the top-right panel becomes its
 * inspector — URL, volume, and playback settings live here instead of inside
 * the shape, so the element itself stays draggable and uncluttered. Any other
 * selection (or an active drawing tool) falls back to the default style panel.
 */
export function CanvasStylePanel(props: TLUiStylePanelProps) {
  const editor = useEditor();
  const mediaShape = useValue("inspected media shape", () => {
    // While a drawing tool is active the user needs pen styles, not the
    // media inspector, even if a media shape is still selected.
    if (editor.getCurrentToolId() !== "select") return null;
    const shape = editor.getOnlySelectedShape();
    if (!shape) return null;
    if (shape.type !== "youtube-embed" && shape.type !== "audio-player") {
      return null;
    }
    return shape as YouTubeEmbedShape | AudioPlayerShape;
  }, [editor]);

  if (!mediaShape) {
    return <DefaultStylePanel {...props} />;
  }

  // Key by id so per-shape draft state (URL input) resets on reselection.
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

/** Filename display for an uploaded media URL; tolerant of malformed escapes. */
function mediaFilename(url: string) {
  const last = url.split("/").pop() ?? "audio";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

// ---------------------------------------------------------------------------
// YouTube inspector
// ---------------------------------------------------------------------------

function YouTubeInspector({ shape }: { shape: YouTubeEmbedShape }) {
  const editor = useEditor();
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );

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
    updateProps({
      url,
      isPlaying: false,
      playbackPosition: 0,
      playbackUpdatedAt: Date.now(),
    });
  };

  const syncedPosition = () => getSyncedPlaybackPosition(shape.props);

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
        {!hasVideo && (
          <InspectorHint>Paste a YouTube link to load the video.</InspectorHint>
        )}
      </InspectorSection>
      {hasVideo && (
        <>
          <InspectorSection>
            <VolumeSlider
              volume={shape.props.volume ?? DEFAULT_MEDIA_VOLUME}
              onChange={(volume) => updateProps({ volume })}
            />
            <ToggleRow
              label="Editor audio"
              checked={shape.props.editorAudioEnabled ?? false}
              onToggle={() =>
                updateProps({
                  editorAudioEnabled: !(
                    shape.props.editorAudioEnabled ?? false
                  ),
                })
              }
            />
          </InspectorSection>
          <InspectorSection>
            <div style={{ display: "flex", gap: 4 }}>
              <TldrawUiButton
                type="normal"
                style={{ flexGrow: 1 }}
                onClick={() =>
                  updateProps({
                    isPlaying: !isPlaying,
                    playbackPosition: syncedPosition(),
                    playbackUpdatedAt: Date.now(),
                  })
                }
              >
                <TldrawUiButtonLabel>
                  {isPlaying ? "Pause" : "Play"}
                </TldrawUiButtonLabel>
              </TldrawUiButton>
              <TldrawUiButton
                type="normal"
                style={{ flexGrow: 1 }}
                onClick={() =>
                  updateProps({
                    playbackPosition: syncedPosition(),
                    playbackUpdatedAt: Date.now(),
                  })
                }
              >
                <TldrawUiButtonLabel>Resync</TldrawUiButtonLabel>
              </TldrawUiButton>
            </div>
            <TldrawUiButton
              type="normal"
              onClick={() => {
                setInteractiveShapeId(isInteractive ? null : shape.id);
                editor.setCurrentTool("select");
              }}
              style={{
                color: isInteractive ? "var(--tl-color-selected)" : undefined,
              }}
            >
              <TldrawUiButtonLabel>
                {isInteractive ? "Exit interact mode" : "Interact with video"}
              </TldrawUiButtonLabel>
            </TldrawUiButton>
          </InspectorSection>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Audio inspector
// ---------------------------------------------------------------------------

interface UploadOutcome {
  notice: string | null;
  error: string | null;
}

interface PendingUpload {
  filename: string;
  promise: Promise<UploadOutcome | null>;
}

// In-flight uploads outlive the (keyed, selection-dependent) panel instance:
// deselecting mid-upload unmounts the inspector, so track uploads per shape
// here. A newer upload for the same shape supersedes an older one — the loser
// drops its result instead of overwriting the shape.
const pendingUploads = new Map<string, PendingUpload>();

function AudioInspector({ shape }: { shape: AudioPlayerShape }) {
  const editor = useEditor();
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const uploadCtx = useContext(AudioUploadCtx);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trackedUpload, setTrackedUpload] = useState<PendingUpload | null>(
    () => pendingUploads.get(shape.id) ?? null,
  );
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Show the outcome of the tracked upload once it settles — including
  // uploads adopted from a previous panel instance of the same shape.
  useEffect(() => {
    if (!trackedUpload) return;
    let alive = true;
    void trackedUpload.promise.then((outcome) => {
      if (!alive) return;
      setTrackedUpload((current) =>
        current === trackedUpload ? null : current,
      );
      if (outcome) {
        setUploadNotice(outcome.notice);
        setUploadError(outcome.error);
      }
    });
    return () => {
      alive = false;
    };
  }, [trackedUpload]);

  const uploading = trackedUpload !== null;
  const hasAudio = Boolean(shape.props.url);
  const isPlaying = shape.props.isPlaying ?? false;
  const isInteractive = interactiveShapeId === shape.id;
  const filename = shape.props.url ? mediaFilename(shape.props.url) : "";

  const updateProps = (props: Partial<AudioPlayerShape["props"]>) => {
    editor.updateShape<AudioPlayerShape>({
      id: shape.id,
      type: "audio-player",
      props,
    });
  };

  const setUrl = (url: string) => {
    // A manual URL change supersedes any in-flight upload.
    pendingUploads.delete(shape.id);
    setTrackedUpload(null);
    setUploadNotice(null);
    setUploadError(null);
    updateProps({
      url,
      isPlaying: false,
      playbackPosition: 0,
      playbackUpdatedAt: Date.now(),
    });
  };

  const commitUrl = (value: string) => {
    const url = value.trim();
    if (url === shape.props.url) return;
    setUrl(url);
  };

  const handleFileUpload = (file: File) => {
    if (!uploadCtx) return;
    const shapeId = shape.id;
    const { roomId, getToken } = uploadCtx;
    setUploadNotice(null);
    setUploadError(null);

    let entry!: PendingUpload;
    const promise = (async (): Promise<UploadOutcome | null> => {
      try {
        const result = await uploadFile(roomId, file, getToken);
        if (pendingUploads.get(shapeId) !== entry) return null;
        editor.updateShape<AudioPlayerShape>({
          id: shapeId,
          type: "audio-player",
          props: {
            url: result.url,
            isPlaying: false,
            playbackPosition: 0,
            playbackUpdatedAt: Date.now(),
          },
        });
        return { notice: `Uploaded ${result.filename}`, error: null };
      } catch (err) {
        console.error("[audio-player] Upload failed:", err);
        if (pendingUploads.get(shapeId) !== entry) return null;
        return {
          notice: null,
          error: err instanceof Error ? err.message : "Upload failed",
        };
      } finally {
        if (pendingUploads.get(shapeId) === entry) {
          pendingUploads.delete(shapeId);
        }
      }
    })();
    entry = { filename: file.name, promise };
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
        {uploadError ? (
          <InspectorHint tone="error">{uploadError}</InspectorHint>
        ) : uploadNotice ? (
          <InspectorHint tone="success">{uploadNotice}</InspectorHint>
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
            <ToggleRow
              label="Editor audio"
              checked={shape.props.editorAudioEnabled ?? false}
              onToggle={() =>
                updateProps({
                  editorAudioEnabled: !(
                    shape.props.editorAudioEnabled ?? false
                  ),
                })
              }
            />
            <ToggleRow
              label="Loop"
              checked={shape.props.loop}
              onToggle={() => updateProps({ loop: !shape.props.loop })}
            />
          </InspectorSection>
          <InspectorSection>
            <div style={{ display: "flex", gap: 4 }}>
              <TldrawUiButton
                type="normal"
                style={{ flexGrow: 1 }}
                onClick={() => {
                  const startPlayback = !isPlaying;
                  // Starting playback also opens the in-element player
                  // controls: the local <audio> element only plays (and
                  // progress only advances) in interact mode, so without
                  // this the panel's Play would be silent and look frozen.
                  if (startPlayback && !isInteractive) {
                    setInteractiveShapeId(shape.id);
                    editor.setCurrentTool("select");
                  }
                  updateProps({
                    isPlaying: startPlayback,
                    playbackPosition: getAudioSyncedPlaybackPosition(
                      shape.props,
                    ),
                    playbackUpdatedAt: Date.now(),
                  });
                }}
              >
                <TldrawUiButtonLabel>
                  {isPlaying ? "Pause" : "Play"}
                </TldrawUiButtonLabel>
              </TldrawUiButton>
              <TldrawUiButton
                type="normal"
                style={{ flexGrow: 1 }}
                onClick={() =>
                  updateProps({
                    playbackPosition: getAudioSyncedPlaybackPosition(
                      shape.props,
                    ),
                    playbackUpdatedAt: Date.now(),
                  })
                }
              >
                <TldrawUiButtonLabel>Resync</TldrawUiButtonLabel>
              </TldrawUiButton>
            </div>
            <TldrawUiButton
              type="normal"
              onClick={() => {
                setInteractiveShapeId(isInteractive ? null : shape.id);
                editor.setCurrentTool("select");
              }}
              style={{
                color: isInteractive ? "var(--tl-color-selected)" : undefined,
              }}
            >
              <TldrawUiButtonLabel>
                {isInteractive
                  ? "Exit player controls"
                  : "Open player controls"}
              </TldrawUiButtonLabel>
            </TldrawUiButton>
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
