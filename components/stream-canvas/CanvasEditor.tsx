"use client";

import { useAuth } from "@clerk/nextjs";
import { useSync } from "@tldraw/sync";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToolbarItem,
  ArrowLeftToolbarItem,
  ArrowRightToolbarItem,
  ArrowToolbarItem,
  ArrowUpToolbarItem,
  AssetToolbarItem,
  CheckBoxToolbarItem,
  CloudToolbarItem,
  DefaultContextMenu,
  DefaultContextMenuContent,
  DefaultMainMenu,
  DefaultToolbar,
  DiamondToolbarItem,
  DrawToolbarItem,
  EditSubmenu,
  EllipseToolbarItem,
  EraserToolbarItem,
  ExportFileContentSubMenu,
  FrameToolbarItem,
  HandToolbarItem,
  HeartToolbarItem,
  HexagonToolbarItem,
  HighlightToolbarItem,
  LaserToolbarItem,
  LineToolbarItem,
  NoteToolbarItem,
  OvalToolbarItem,
  PreferencesGroup,
  RectangleToolbarItem,
  RhombusToolbarItem,
  SelectToolbarItem,
  StarToolbarItem,
  TextToolbarItem,
  type TLAssetStore,
  type TLComponents,
  type TLShape,
  type TLUiAssetUrlOverrides,
  type TLUiContextMenuProps,
  type TLUiOverrides,
  Tldraw,
  TldrawUiMenuActionItem,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  ToolbarItem,
  TriangleToolbarItem,
  useEditor,
  useValue,
  ViewSubmenu,
  XBoxToolbarItem,
} from "tldraw";
import "tldraw/tldraw.css";
import {
  buildEditorWsUrl,
  getEditorUploadUrlRefreshDelayMs,
  getEditorWsToken,
  resolveEditorUploadUrl,
  uploadFile,
} from "@/lib/stream-canvas/api";
import { getSyncedMediaPlaybackPosition } from "@/lib/stream-canvas/media-playback";
import {
  getStreamZoneViewportPlacement,
  STREAM_ZONE,
} from "@/lib/stream-canvas/stream-zone";
import type { YouTubePolicy } from "@/lib/stream-canvas/types";
import { readRoomConfigMessage } from "@/lib/stream-canvas/room-config";
import { CanvasStylePanel } from "./MediaInspectorPanel";
import { TwitchPreview } from "./TwitchPreview";
import {
  MediaPreferencesProvider,
  useMediaPreference,
} from "./media-preferences";
import {
  type AudioPlayerShape,
  AudioUploadCtx,
} from "./shapes/audio/AudioPlayerShape";
import {
  CanvasMediaRefreshContext,
  customShapeUtils,
  customTools,
  syncShapeUtils,
} from "./shapes/shared";
import {
  type YouTubeEmbedShape,
  YouTubeInteractionCtx,
  YouTubePolicyCtx,
} from "./shapes/youtube/YouTubeEmbedShape";

const TLDRAW_LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;

const CANVAS_EDITOR_OPTIONS = { maxPages: 1 } as const;

interface CanvasEditorProps {
  roomId: string;
  twitchChannel?: string | null;
  youtubePolicy: YouTubePolicy;
  onMount?: import("tldraw").TLOnMountHandler;
}

/**
 * Custom Background that renders the Twitch embed and stream zone indicator
 * inside tldraw's background layer (behind shapes, moves with camera).
 * OBS mirror sets Background: null, so none of this shows there.
 */
function CanvasBackground({ channel }: { channel?: string | null }) {
  const editor = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const streamChipRef = useRef<HTMLButtonElement>(null);
  const streamMenuRef = useRef<HTMLDivElement>(null);
  const [interactMode, setInteractMode] = useState(false);
  const twitchPreference = useMediaPreference("twitch-preview");
  const [streamMenu, setStreamMenu] = useState<{ x: number; y: number } | null>(
    null,
  );

  const closeStreamMenu = useCallback(() => {
    setStreamMenu(null);
  }, []);

  const openStreamMenu = useCallback(
    (x: number, y: number) => {
      if (!channel) return;
      setStreamMenu({ x, y });
    },
    [channel],
  );

  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const camera = editor.getCamera();
      const { transform } = getStreamZoneViewportPlacement(
        (point) => editor.pageToViewport(point),
        camera,
      );
      containerRef.current.style.transform = transform;
    }

    const dispose = editor.store.listen(update, {
      source: "all",
      scope: "session",
    });
    update();
    return dispose;
  }, [editor]);

  useEffect(() => {
    if (!streamMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (streamMenuRef.current?.contains(target) ||
          streamChipRef.current?.contains(target))
      ) {
        return;
      }

      closeStreamMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeStreamMenu();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [closeStreamMenu, streamMenu]);

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = hostname.endsWith(".localhost") || hostname === "localhost";

  return (
    <>
      {/* Default background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "var(--tl-color-background)",
        }}
      />
      {/* Stream zone + Twitch embed — positioned in canvas coordinates */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: STREAM_ZONE.width,
          height: STREAM_ZONE.height,
          transformOrigin: "0 0",
          pointerEvents: "none",
        }}
      >
        {/* Twitch embed */}
        {channel && (
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              inset: 0,
            }}
          >
            {isLocal ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.85)",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "14px",
                  fontFamily: "sans-serif",
                  borderRadius: "4px",
                }}
              >
                Twitch embed disabled on localhost
                <span style={{ fontSize: "12px", opacity: 0.6 }}>
                  twitch.tv/{channel}
                </span>
              </div>
            ) : (
              <TwitchPreview
                channel={channel}
                hostname={hostname}
                interactive={interactMode}
              />
            )}
          </div>
        )}
        {/* Stream zone border */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "2px dashed rgba(59, 130, 246, 0.5)",
            borderRadius: "4px",
          }}
        />
        {/* Stream zone label */}
        <span
          style={{
            position: "absolute",
            top: "-24px",
            left: "8px",
            fontSize: "12px",
            color: "rgba(59, 130, 246, 0.8)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          Stream Zone (1920×1080)
        </span>
        {channel && (
          <button
            ref={streamChipRef}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openStreamMenu(event.clientX, event.clientY);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openStreamMenu(event.clientX, event.clientY);
            }}
            aria-label="Open stream controls"
            style={{
              position: "absolute",
              top: "-26px",
              right: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              background: interactMode ? "#1e3a5f" : "#0f172a",
              color: "rgba(255, 255, 255, 0.9)",
              cursor: "context-menu",
              pointerEvents: "auto",
              userSelect: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "999px",
                background: interactMode
                  ? "rgb(34, 197, 94)"
                  : "rgba(255, 255, 255, 0.45)",
                boxShadow: interactMode
                  ? "0 0 8px rgba(34, 197, 94, 0.65)"
                  : "none",
              }}
            />
            Stream
          </button>
        )}
      </div>
      {streamMenu ? (
        <div
          ref={streamMenuRef}
          role="menu"
          aria-label="Stream menu"
          style={{
            position: "fixed",
            top: streamMenu.y,
            left: streamMenu.x,
            zIndex: 1000,
            minWidth: "200px",
            padding: "6px",
            borderRadius: "10px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            background: "#0f172a",
            boxShadow: "0 18px 40px rgba(2, 6, 23, 0.45)",
            pointerEvents: "auto",
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={() => {
              setInteractMode((prev) => !prev);
              closeStreamMenu();
            }}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.92)",
              fontSize: "13px",
              textAlign: "left",
              padding: "9px 10px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {interactMode ? "Back to drawing" : "Enter interact mode"}
          </button>
          <button
            type="button"
            onClick={() =>
              twitchPreference.setEnabled(!twitchPreference.enabled)
            }
            className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-white/90 hover:bg-white/10"
          >
            Personal audio: {twitchPreference.enabled ? "On" : "Muted"}
          </button>
          <a
            href={`https://www.twitch.tv/${encodeURIComponent(channel ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-2.5 py-2 text-[13px] text-white/90 hover:bg-white/10"
          >
            Open Twitch sign-in
          </a>
        </div>
      ) : null}
    </>
  );
}

/** Clean up leftover stream zone frame shapes from pre-release prototype. */
function LegacyCleanup() {
  const editor = useEditor();

  useEffect(() => {
    for (const shape of editor.getCurrentPageShapes()) {
      if (shape.meta?.isStreamZone) {
        editor.deleteShape(shape.id);
      }
    }
  }, [editor]);

  return null;
}

// ---------------------------------------------------------------------------
// UI overrides — media-first toolbar, custom tool icons, decluttered chrome
// ---------------------------------------------------------------------------

const canvasAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    "youtube-embed-icon": "/tldraw-icons/youtube.svg",
    "audio-player-icon": "/tldraw-icons/audio.svg",
  },
};

function createEditorOverrides(youtubePolicy: YouTubePolicy): TLUiOverrides {
  return {
    tools(editor, tools) {
      if (youtubePolicy !== "disabled") {
        tools["youtube-embed"] = {
          id: "youtube-embed",
          icon: "youtube-embed-icon",
          label: "YouTube",
          onSelect: () => {
            editor.setCurrentTool("youtube-embed");
          },
        };
      }
      tools["audio-player"] = {
        id: "audio-player",
        icon: "audio-player-icon",
        label: "Audio",
        onSelect: () => {
          editor.setCurrentTool("audio-player");
        },
      };
      return tools;
    },
  };
}

/**
 * Media-first toolbar: adding images/GIFs/videos and embeds is the primary
 * workflow on the stream canvas, so those buttons come right after select and
 * hand. Drawing and shape tools keep their default relative order behind them
 * (overflowing into the "more" dropdown on narrow toolbars).
 */
function CanvasToolbar() {
  const youtubePolicy = useContext(YouTubePolicyCtx);
  return (
    <DefaultToolbar>
      <SelectToolbarItem />
      <HandToolbarItem />
      <AssetToolbarItem />
      {youtubePolicy !== "disabled" ? (
        <ToolbarItem tool="youtube-embed" />
      ) : null}
      <ToolbarItem tool="audio-player" />
      <DrawToolbarItem />
      <EraserToolbarItem />
      <ArrowToolbarItem />
      <TextToolbarItem />
      <NoteToolbarItem />
      <RectangleToolbarItem />
      <EllipseToolbarItem />
      <TriangleToolbarItem />
      <DiamondToolbarItem />
      <HexagonToolbarItem />
      <OvalToolbarItem />
      <RhombusToolbarItem />
      <StarToolbarItem />
      <CloudToolbarItem />
      <HeartToolbarItem />
      <XBoxToolbarItem />
      <CheckBoxToolbarItem />
      <ArrowLeftToolbarItem />
      <ArrowUpToolbarItem />
      <ArrowDownToolbarItem />
      <ArrowRightToolbarItem />
      <LineToolbarItem />
      <HighlightToolbarItem />
      <LaserToolbarItem />
      <FrameToolbarItem />
    </DefaultToolbar>
  );
}

/**
 * Default main menu (as of tldraw 4.x) minus the extras group (insert
 * embed / upload media),
 * which duplicates toolbar buttons.
 */
function CanvasMainMenu() {
  return (
    <DefaultMainMenu>
      <TldrawUiMenuGroup id="basic">
        <EditSubmenu />
        <ViewSubmenu />
        <ExportFileContentSubMenu />
      </TldrawUiMenuGroup>
      <PreferencesGroup />
    </DefaultMainMenu>
  );
}

function isMediaShape(
  shape: TLShape | null | undefined,
): shape is YouTubeEmbedShape | AudioPlayerShape {
  return shape?.type === "youtube-embed" || shape?.type === "audio-player";
}

function MediaShapeContextMenuContent() {
  const editor = useEditor();
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const selectedShape = useValue(
    "selected media shape",
    () => editor.getOnlySelectedShape(),
    [editor],
  );
  const previewPreference = useMediaPreference(selectedShape?.id ?? "none");

  if (!selectedShape || !isMediaShape(selectedShape)) {
    return null;
  }

  const hasUrl = Boolean(selectedShape.props.url);
  const isYouTubeShape = selectedShape.type === "youtube-embed";
  const isAudioShape = selectedShape.type === "audio-player";
  const canInteract = (isYouTubeShape || isAudioShape) && hasUrl;
  const isInteractive = interactiveShapeId === selectedShape.id;

  return (
    <>
      <TldrawUiMenuGroup id="media-shape-actions">
        {canInteract ? (
          <>
            <TldrawUiMenuItem
              id="media-shape-interact"
              icon="external-link"
              label={
                isInteractive ? "Exit interact mode" : "Enter interact mode"
              }
              onSelect={() => {
                if (isInteractive) {
                  setInteractiveShapeId(null);
                  editor.setCurrentTool("select");
                  editor.setEditingShape(null);
                  return;
                }

                setInteractiveShapeId(selectedShape.id);
                editor.setCurrentTool("select");
                editor.setEditingShape(null);
              }}
            />
            <TldrawUiMenuItem
              id="media-shape-editor-audio"
              label={`Personal audio: ${previewPreference.enabled ? "On" : "Muted"}`}
              onSelect={() =>
                previewPreference.setEnabled(!previewPreference.enabled)
              }
            />
            <TldrawUiMenuItem
              id="media-shape-resync"
              label="Resync player"
              onSelect={() => {
                if (isYouTubeShape) {
                  const playbackPosition = getSyncedMediaPlaybackPosition(
                    selectedShape.props,
                  );
                  editor.updateShape({
                    id: selectedShape.id,
                    type: "youtube-embed",
                    props: {
                      playbackPosition,
                      playbackUpdatedAt: Date.now(),
                    },
                  });
                }

                if (isAudioShape) {
                  const playbackPosition = getSyncedMediaPlaybackPosition(
                    selectedShape.props,
                  );
                  editor.updateShape({
                    id: selectedShape.id,
                    type: "audio-player",
                    props: {
                      playbackPosition,
                      playbackUpdatedAt: Date.now(),
                    },
                  });
                }
              }}
            />
          </>
        ) : null}
      </TldrawUiMenuGroup>
      <TldrawUiMenuGroup id="media-shape-edit-actions">
        <TldrawUiMenuActionItem actionId="duplicate" />
        <TldrawUiMenuActionItem actionId="delete" />
      </TldrawUiMenuGroup>
    </>
  );
}

function CanvasContextMenu(props: TLUiContextMenuProps) {
  const editor = useEditor();
  const selectedShape = useValue(
    "selected context menu shape",
    () => editor.getOnlySelectedShape(),
    [editor],
  );
  const showMediaMenu = Boolean(selectedShape && isMediaShape(selectedShape));

  return (
    <DefaultContextMenu {...props}>
      {showMediaMenu ? (
        <MediaShapeContextMenuContent />
      ) : (
        <DefaultContextMenuContent />
      )}
    </DefaultContextMenu>
  );
}

function YouTubeInteractionController() {
  const editor = useEditor();
  const { interactiveShapeId, setInteractiveShapeId } = useContext(
    YouTubeInteractionCtx,
  );
  const selectedShape = useValue(
    "selected youtube shape",
    () => editor.getOnlySelectedShape(),
    [editor],
  );

  useEffect(() => {
    if (!interactiveShapeId) return;

    if (
      !selectedShape ||
      selectedShape.id !== interactiveShapeId ||
      (selectedShape.type !== "youtube-embed" &&
        selectedShape.type !== "audio-player")
    ) {
      setInteractiveShapeId(null);
      editor.setCurrentTool("select");
      editor.setEditingShape(null);
    }
  }, [editor, interactiveShapeId, selectedShape, setInteractiveShapeId]);

  useEffect(() => {
    if (!interactiveShapeId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setInteractiveShapeId(null);
      editor.setCurrentTool("select");
      editor.setEditingShape(null);
      editor.getContainer().focus();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [editor, interactiveShapeId, setInteractiveShapeId]);

  return null;
}

export function CanvasEditor({
  roomId,
  twitchChannel: initialTwitchChannel,
  youtubePolicy: initialYouTubePolicy,
  onMount,
}: CanvasEditorProps) {
  const [{ twitchChannel, youtubePolicy }, setRoomConfig] = useState({
    twitchChannel: initialTwitchChannel ?? null,
    youtubePolicy: initialYouTubePolicy,
  });
  const { getToken, userId } = useAuth();
  const [interactiveShapeId, setInteractiveShapeId] = useState<string | null>(
    null,
  );

  const getUri = useCallback(async () => {
    const data = await getEditorWsToken(roomId, getToken);
    return buildEditorWsUrl(data.roomId, data.token);
  }, [roomId, getToken]);

  const assets = useMemo<TLAssetStore>(
    () => ({
      async upload(_asset, file) {
        const result = await uploadFile(roomId, file, getToken);
        return { src: result.url };
      },
      resolve(asset) {
        if (!asset.props.src) return null;
        return resolveEditorUploadUrl(roomId, asset.props.src, getToken).catch(
          (error) => {
            console.error(
              "[stream-canvas] asset URL resolution failed:",
              error,
            );
            return null;
          },
        );
      },
    }),
    [roomId, getToken],
  );

  const components = useMemo<TLComponents>(
    () => ({
      Background: () => <CanvasBackground channel={twitchChannel} />,
      ContextMenu: CanvasContextMenu,
      Toolbar: CanvasToolbar,
      MainMenu: CanvasMainMenu,
      StylePanel: CanvasStylePanel,
      // Rooms are single-canvas; multiple pages would also break the OBS
      // mirror, which always renders its own current page's stream zone.
      PageMenu: null,
      Minimap: null,
    }),
    [twitchChannel],
  );

  const audioUploadCtx = useMemo(
    () => ({
      roomId,
      getToken,
      resolveUrl: (src: string, options?: { forceRefresh?: boolean }) =>
        resolveEditorUploadUrl(roomId, src, getToken, options),
      getRefreshDelayMs: (src: string) =>
        getEditorUploadUrlRefreshDelayMs(roomId, src),
    }),
    [roomId, getToken],
  );
  const mediaRefreshCtx = useMemo(
    () => ({
      getRefreshDelayMs: (src: string) =>
        getEditorUploadUrlRefreshDelayMs(roomId, src),
    }),
    [roomId],
  );
  const youtubeInteractionCtx = useMemo(
    () => ({
      interactiveShapeId,
      setInteractiveShapeId,
    }),
    [interactiveShapeId],
  );
  const editorOverrides = useMemo(
    () => createEditorOverrides(youtubePolicy),
    [youtubePolicy],
  );
  const editorTools = useMemo(
    () =>
      youtubePolicy === "disabled"
        ? customTools.filter((Tool) => Tool.id !== "youtube-embed")
        : customTools,
    [youtubePolicy],
  );

  const storeWithStatus = useSync({
    uri: getUri,
    assets,
    shapeUtils: syncShapeUtils,
    onCustomMessageReceived(data: unknown) {
      const roomConfig = readRoomConfigMessage(data);
      if (roomConfig) setRoomConfig(roomConfig);
    },
  });

  if (storeWithStatus.status === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Connecting…
      </div>
    );
  }

  if (storeWithStatus.status === "error") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-400">
        Connection error: {storeWithStatus.error.message}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MediaPreferencesProvider roomId={roomId} userId={userId}>
        <CanvasMediaRefreshContext.Provider value={mediaRefreshCtx}>
          <AudioUploadCtx.Provider value={audioUploadCtx}>
            <YouTubeInteractionCtx.Provider value={youtubeInteractionCtx}>
              <YouTubePolicyCtx.Provider value={youtubePolicy}>
                <Tldraw
                  onMount={onMount}
                  store={storeWithStatus.store}
                  shapeUtils={customShapeUtils}
                  tools={editorTools}
                  overrides={editorOverrides}
                  assetUrls={canvasAssetUrls}
                  licenseKey={TLDRAW_LICENSE_KEY}
                  components={components}
                  // Belt and suspenders with SinglePageGuard: maxPages
                  // blocks local page creation; the guard cleans up pages
                  // that arrive via sync and re-pins the canonical page.
                  options={CANVAS_EDITOR_OPTIONS}
                >
                  <LegacyCleanup />
                  <SinglePageGuard />
                  <YouTubeInteractionController />
                </Tldraw>
              </YouTubePolicyCtx.Provider>
            </YouTubeInteractionCtx.Provider>
          </AudioUploadCtx.Provider>
        </CanvasMediaRefreshContext.Provider>
      </MediaPreferencesProvider>
    </div>
  );
}

/** OBS always mirrors the one canonical page, so additional pages are removed. */
function SinglePageGuard() {
  const editor = useEditor();

  useEffect(() => {
    let scheduled = false;
    let disposed = false;

    const enforce = () => {
      if (disposed || scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (disposed) return;
        const [canonicalPage, ...extraPages] = editor.getPages();
        if (!canonicalPage) return;
        if (editor.getCurrentPageId() !== canonicalPage.id) {
          editor.setCurrentPage(canonicalPage.id);
        }
        for (const page of extraPages) editor.deletePage(page.id);
      });
    };

    const dispose = editor.store.listen(enforce, {
      source: "all",
      scope: "document",
    });
    enforce();
    return () => {
      disposed = true;
      dispose();
    };
  }, [editor]);

  return null;
}
