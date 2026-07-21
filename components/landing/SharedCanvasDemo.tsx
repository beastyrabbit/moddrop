"use client";

import { ImagePlay, RotateCcw, Trophy } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

type OverlayId = "brb" | "clip" | "emote" | "score";

type Point = {
  x: number;
  y: number;
};

type DragSession = {
  id: OverlayId;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

const overlayLabels: Record<OverlayId, string> = {
  brb: "be right back card",
  clip: "queued clip",
  emote: "emote",
  score: "scorebug",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function SharedCanvasDemo() {
  const canvasRef = useRef<HTMLFieldSetElement>(null);
  const streamRef = useRef<HTMLElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const [positions, setPositions] = useState<Partial<Record<OverlayId, Point>>>(
    {},
  );
  const [onStream, setOnStream] = useState<Partial<Record<OverlayId, boolean>>>(
    {},
  );
  const [activeOverlay, setActiveOverlay] = useState<OverlayId | null>(null);

  const pointFromElement = (element: HTMLElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) return null;

    return {
      point: {
        x: ((elementRect.left - canvasRect.left) / canvasRect.width) * 100,
        y: ((elementRect.top - canvasRect.top) / canvasRect.height) * 100,
      },
      canvasRect,
      elementRect,
    };
  };

  const updateOnStream = (
    id: OverlayId,
    point: Point,
    width: number,
    height: number,
  ) => {
    const canvas = canvasRef.current;
    const stream = streamRef.current;
    if (!canvas || !stream) return;

    const canvasRect = canvas.getBoundingClientRect();
    const streamRect = stream.getBoundingClientRect();
    const centerX =
      canvasRect.left + (point.x / 100) * canvasRect.width + width / 2;
    const centerY =
      canvasRect.top + (point.y / 100) * canvasRect.height + height / 2;
    const isOnStream =
      centerX >= streamRect.left &&
      centerX <= streamRect.right &&
      centerY >= streamRect.top &&
      centerY <= streamRect.bottom;

    setOnStream((current) =>
      current[id] === isOnStream ? current : { ...current, [id]: isOnStream },
    );
  };

  const handlePointerDown = (
    id: OverlayId,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const layout = pointFromElement(event.currentTarget);
    if (!layout) return;

    dragSessionRef.current = {
      id,
      pointerId: event.pointerId,
      offsetX: event.clientX - layout.elementRect.left,
      offsetY: event.clientY - layout.elementRect.top,
      width: layout.elementRect.width,
      height: layout.elementRect.height,
    };
    setPositions((current) => ({ ...current, [id]: layout.point }));
    setActiveOverlay(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (
    id: OverlayId,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const session = dragSessionRef.current;
    const canvas = canvasRef.current;
    if (!session || !canvas || session.id !== id) return;
    if (session.pointerId !== event.pointerId) return;

    const canvasRect = canvas.getBoundingClientRect();
    const maxX = Math.max(0, 100 - (session.width / canvasRect.width) * 100);
    const maxY = Math.max(0, 100 - (session.height / canvasRect.height) * 100);
    const x =
      ((event.clientX - canvasRect.left - session.offsetX) / canvasRect.width) *
      100;
    const y =
      ((event.clientY - canvasRect.top - session.offsetY) / canvasRect.height) *
      100;

    const nextPoint = {
      x: clamp(x, 0, maxX),
      y: clamp(y, 0, maxY),
    };

    setPositions((current) => ({
      ...current,
      [id]: nextPoint,
    }));
    updateOnStream(id, nextPoint, session.width, session.height);
  };

  const finishPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragSessionRef.current?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragSessionRef.current = null;
    setActiveOverlay(null);
  };

  const handleKeyDown = (
    id: OverlayId,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) return;

    const layout = pointFromElement(event.currentTarget);
    if (!layout) return;

    event.preventDefault();
    const step = event.shiftKey ? 5 : 1.5;
    const maxX = Math.max(
      0,
      100 - (layout.elementRect.width / layout.canvasRect.width) * 100,
    );
    const maxY = Math.max(
      0,
      100 - (layout.elementRect.height / layout.canvasRect.height) * 100,
    );
    const current = positions[id] ?? layout.point;

    const nextPoint = {
      x: clamp(current.x + direction[0] * step, 0, maxX),
      y: clamp(current.y + direction[1] * step, 0, maxY),
    };

    setPositions((allPositions) => ({
      ...allPositions,
      [id]: nextPoint,
    }));
    updateOnStream(
      id,
      nextPoint,
      layout.elementRect.width,
      layout.elementRect.height,
    );
  };

  const dragProps = (id: OverlayId) => {
    const position = positions[id];
    const style: CSSProperties | undefined = position
      ? { left: `${position.x}%`, top: `${position.y}%` }
      : undefined;

    return {
      "aria-label": `Move the ${overlayLabels[id]}. Drag it or use the arrow keys.`,
      "data-dragging": activeOverlay === id,
      "data-on-stream": Boolean(onStream[id]),
      "data-positioned": Boolean(position),
      onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) =>
        handleKeyDown(id, event),
      onPointerCancel: finishPointerDrag,
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) =>
        handlePointerDown(id, event),
      onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) =>
        handlePointerMove(id, event),
      onPointerUp: finishPointerDrag,
      style,
    };
  };

  const hasMovedOverlay = Object.keys(positions).length > 0;
  const liveOverlayCount = Object.values(onStream).filter(Boolean).length;

  const resetLayout = () => {
    setPositions({});
    setOnStream({});
    setActiveOverlay(null);
    dragSessionRef.current = null;
  };

  return (
    <fieldset
      ref={canvasRef}
      className="aa-canvasmock relative aspect-[3/2] overflow-hidden"
      aria-describedby="aa-canvas-instructions"
    >
      <legend className="sr-only">
        Interactive shared canvas preview. Move the be-right-back card, queued
        clip, emote, and scorebug around the stream by dragging them or using
        the arrow keys.
      </legend>
      <span className="aa-cm-tab">shared canvas</span>
      <div className="aa-cm-controls">
        <button
          type="button"
          className="aa-cm-reset"
          disabled={!hasMovedOverlay}
          onClick={resetLayout}
          aria-label="Reset canvas layout"
          title="Reset layout"
        >
          <RotateCcw aria-hidden="true" size={12} strokeWidth={2.25} />
        </button>
        <span className="aa-cm-live">
          <i />
          Live
        </span>
      </div>

      <section
        ref={streamRef}
        className="aa-cm-stream"
        data-has-content={liveOverlayCount > 0}
        aria-label="Stream drop zone"
      >
        <span className="aa-cm-streamlabel">your stream</span>
        <span className="aa-cm-streamstate">
          {liveOverlayCount > 0
            ? `${liveOverlayCount} ${liveOverlayCount === 1 ? "layer" : "layers"} live`
            : "drop zone"}
        </span>
      </section>

      <button
        type="button"
        className="aa-cm-card aa-cm-brb aa-cm-draggable"
        {...dragProps("brb")}
      >
        <em>be right back</em>
        <span>refilling the mug · 4:00</span>
      </button>

      <button
        type="button"
        className="aa-cm-card aa-cm-clip aa-cm-draggable"
        {...dragProps("clip")}
      >
        <span className="aa-cm-thumb">
          <svg
            viewBox="0 0 20 20"
            width="13"
            height="13"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6 4 L15 10 L6 16 Z" />
          </svg>
        </span>
        clip · queued
      </button>

      <button
        type="button"
        className="aa-cm-emote aa-cm-draggable"
        {...dragProps("emote")}
      >
        <ImagePlay aria-hidden="true" width={22} height={22} />
      </button>

      <button
        type="button"
        className="aa-cm-card aa-cm-score aa-cm-draggable"
        {...dragProps("score")}
      >
        <Trophy
          aria-hidden="true"
          width={13}
          height={13}
          className="aa-score-icon"
        />
        2–1
      </button>

      <div className="aa-cm-cur aa-cm-cur--mika" aria-hidden="true">
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 2 L4 16.5 L7.7 13.2 L9.9 18 L12.4 16.9 L10.2 12.2 L15.5 12.2 Z" />
        </svg>
        <span className="aa-cm-curtag">mika · mod</span>
      </div>
      <div className="aa-cm-cur aa-cm-cur--dex" aria-hidden="true">
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 2 L4 16.5 L7.7 13.2 L9.9 18 L12.4 16.9 L10.2 12.2 L15.5 12.2 Z" />
        </svg>
        <span className="aa-cm-curtag">dex · mod</span>
      </div>

      <span id="aa-canvas-instructions" className="aa-cm-hint">
        drop on stream <span aria-hidden="true">·</span> visual only
      </span>
    </fieldset>
  );
}
