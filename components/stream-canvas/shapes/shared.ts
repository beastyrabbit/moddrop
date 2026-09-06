import {
  createContext,
  createElement,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  defaultShapeUtils,
  EmbedShapeUtil,
  ImageShapeUtil,
  type TLEmbedShape,
  type TLImageShape,
  type TLVideoShape,
  useEditor,
  useValue,
  VideoShapeUtil,
} from "tldraw";
import type { UploadUrlRefreshDelayMs } from "@/lib/stream-canvas/api";
import { AudioPlayerShapeUtil } from "./audio/AudioPlayerShape";
import { AudioPlayerTool } from "./audio/AudioPlayerTool";
import {
  isYouTubeUrl,
  YouTubeEmbedShapeUtil,
  YouTubePolicyCtx,
} from "./youtube/YouTubeEmbedShape";
import { YouTubeEmbedTool } from "./youtube/YouTubeEmbedTool";

interface CanvasMediaRefreshController {
  getRefreshDelayMs(src: string): UploadUrlRefreshDelayMs;
}

export const CanvasMediaRefreshContext =
  createContext<CanvasMediaRefreshController | null>(null);

const CACHE_PENDING_RECHECK_MS = 5_000;
const MAX_REFRESH_TIMEOUT_MS = 2 ** 31 - 1;

// Keep legacy records/schema readable while applying owner policy to every
// default YouTube renderer. Newly pasted URLs use the custom shape.
class PolicyEmbedShapeUtil extends EmbedShapeUtil {
  static override type = "embed" as const;
  override component(shape: TLEmbedShape) {
    if (!isYouTubeUrl(shape.props.url)) return super.component(shape);
    return createElement(PolicyEmbed, {}, super.component(shape));
  }
}
function PolicyEmbed({ children }: { children?: ReactNode }) {
  const policy = useContext(YouTubePolicyCtx);
  const editor = useEditor();
  const readonly = useValue(
    "embed readonly",
    () => editor.getInstanceState().isReadonly,
    [editor],
  );
  if (policy === "disabled" || (readonly && policy !== "allow_on_air"))
    return null;
  return children;
}

class RefreshingImageShapeUtil extends ImageShapeUtil {
  static override type = "image" as const;

  override component(shape: TLImageShape) {
    return createElement(
      RefreshingTldrawMedia,
      { shape },
      super.component(shape),
    );
  }
}

class RefreshingVideoShapeUtil extends VideoShapeUtil {
  static override type = "video" as const;

  override component(shape: TLVideoShape) {
    return createElement(
      RefreshingTldrawMedia,
      { shape },
      super.component(shape),
    );
  }
}

function RefreshingTldrawMedia({
  shape,
  children,
}: {
  shape: TLImageShape | TLVideoShape;
  children?: ReactNode;
}) {
  const editor = useEditor();
  const refreshController = useContext(CanvasMediaRefreshContext);
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<{
    time: number;
    paused: boolean;
    rate: number;
    at: number;
  } | null>(null);
  const src = useValue("refreshing media asset src", () => {
    const asset = shape.props.assetId
      ? editor.getAsset(shape.props.assetId)
      : undefined;
    return asset && "src" in asset.props ? asset.props.src : null;
  }, [editor, shape.props.assetId]);

  useEffect(() => {
    playbackRef.current = null;
    if (!src || !refreshController) return;

    let timeoutId: number | undefined;
    let cancelled = false;

    const schedule = (waitForCache = false) => {
      const refreshDelay = waitForCache
        ? null
        : refreshController.getRefreshDelayMs(src);
      if (refreshDelay === undefined) return;

      const timeoutMs =
        refreshDelay === null
          ? CACHE_PENDING_RECHECK_MS
          : Math.min(refreshDelay, MAX_REFRESH_TIMEOUT_MS);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const currentDelay = refreshController.getRefreshDelayMs(src);
        if (currentDelay === undefined) return;
        if (currentDelay !== null && currentDelay > 0) {
          schedule();
          return;
        }
        // A missing cache can mean a failed mint, not only an in-flight one.
        // Remount after the backoff so tldraw actually retries the resolver.
        {
          const video = containerRef.current?.querySelector("video");
          if (video && video.readyState >= 1 && !playbackRef.current)
            playbackRef.current = {
              time: video.currentTime,
              paused: video.paused,
              rate: video.playbackRate,
              at: performance.now(),
            };
          setRefreshKey((value) => value + 1);
          schedule(true);
          return;
        }
      }, timeoutMs);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [refreshController, src]);

  return createElement(
    "div",
    {
      ref: containerRef,
      className: "contents",
      onLoadedMetadataCapture: (event) => {
        const video = event.target;
        const playback = playbackRef.current;
        if (!(video instanceof HTMLVideoElement) || !playback) return;
        playbackRef.current = null;
        const position =
          playback.time +
          (playback.paused
            ? 0
            : ((performance.now() - playback.at) / 1000) * playback.rate);
        video.currentTime =
          video.loop && video.duration > 0
            ? position % video.duration
            : Math.min(position, video.duration || position);
        video.playbackRate = playback.rate;
        if (playback.paused) video.pause();
        else void video.play().catch(() => {});
      },
    },
    createElement(Fragment, { key: refreshKey }, children),
  );
}

const defaultShapeUtilsWithMediaRefresh = defaultShapeUtils.map((ShapeUtil) => {
  if (ShapeUtil.type === "embed") return PolicyEmbedShapeUtil;
  if (ShapeUtil.type === RefreshingImageShapeUtil.type) {
    return RefreshingImageShapeUtil;
  }
  if (ShapeUtil.type === RefreshingVideoShapeUtil.type) {
    return RefreshingVideoShapeUtil;
  }
  return ShapeUtil;
});

/** Custom shape utils — register in both CanvasEditor and CanvasMirror. */
export const customShapeUtils = [
  PolicyEmbedShapeUtil,
  RefreshingImageShapeUtil,
  RefreshingVideoShapeUtil,
  YouTubeEmbedShapeUtil,
  AudioPlayerShapeUtil,
];

/**
 * useSync builds a store schema directly and does not merge defaults the way
 * <Tldraw /> does, so it must receive the full shape util list.
 */
export const syncShapeUtils = [
  ...defaultShapeUtilsWithMediaRefresh,
  YouTubeEmbedShapeUtil,
  AudioPlayerShapeUtil,
];

/** Custom tools — register in CanvasEditor only (mirror is read-only). */
export const customTools = [YouTubeEmbedTool, AudioPlayerTool];
