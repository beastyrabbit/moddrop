import {
  createContext,
  createElement,
  Fragment,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  defaultShapeUtils,
  ImageShapeUtil,
  type TLImageShape,
  type TLVideoShape,
  useEditor,
  useValue,
  VideoShapeUtil,
} from "tldraw";
import type { UploadUrlRefreshDelayMs } from "@/lib/stream-canvas/api";
import { AudioPlayerShapeUtil } from "./audio/AudioPlayerShape";
import { AudioPlayerTool } from "./audio/AudioPlayerTool";
import { YouTubeEmbedShapeUtil } from "./youtube/YouTubeEmbedShape";
import { YouTubeEmbedTool } from "./youtube/YouTubeEmbedTool";

interface CanvasMediaRefreshController {
  getRefreshDelayMs(src: string): UploadUrlRefreshDelayMs;
}

export const CanvasMediaRefreshContext =
  createContext<CanvasMediaRefreshController | null>(null);

const CACHE_PENDING_RECHECK_MS = 5_000;
const MAX_REFRESH_TIMEOUT_MS = 2 ** 31 - 1;

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
  const src = useValue(
    "refreshing media asset src",
    () => {
      const asset = shape.props.assetId
        ? editor.getAsset(shape.props.assetId)
        : undefined;
      return asset && "src" in asset.props ? asset.props.src : null;
    },
    [editor, shape.props.assetId],
  );

  useEffect(() => {
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
        if (refreshDelay !== null) {
          setRefreshKey((value) => value + 1);
          schedule(true);
          return;
        }
        schedule();
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

  return createElement(Fragment, { key: refreshKey }, children);
}

const defaultShapeUtilsWithMediaRefresh = defaultShapeUtils.map((ShapeUtil) => {
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
