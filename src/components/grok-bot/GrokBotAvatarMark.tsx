import { useEffect, useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { GrokBotAvatarShape } from "../../lib/grok-bot/types";
import { getAvatarShapeData } from "./avatarShapeData";

export type AvatarShape = GrokBotAvatarShape;
export type AvatarState =
  | "idle"
  | "thinking"
  | "working"
  | "listening"
  | "speaking"
  | "done"
  | "alert";
export type AvatarMotionMode = "auto" | "full" | "reduced" | "off";

const AVATAR_CENTER = 114.2705;
const AVATAR_VIEWBOX = "-15 -15 259 259";
const BASE_EYE_X = 29;
const BASE_EYE_Y = -8;
const BASE_EYE_RX = 11;
const BASE_EYE_RY = 16;
const POINTER_GAZE_X = 22;
const POINTER_GAZE_Y = 14;
const POINTER_RANGE = 0.6;
const POINTER_SMOOTHING = 60 * Math.log(0.91);
const POINTER_AUTONOMOUS_GAZE_WEIGHT = 0.2;
const AIM_SPRING_FREQUENCY = 13;
const AIM_SPRING_DAMPING = 1;
const FIXED_STEP = 1 / 120;

export interface GrokBotAvatarMarkProps {
  shape?: AvatarShape;
  state?: AvatarState;
  motion?: AvatarMotionMode;
  size?: number;
  seed?: number;
  foreground?: string;
  background?: string;
  className?: string;
  paused?: boolean;
  emphasis?: boolean;
  followPointer?: boolean;
}

interface EyeGeometry {
  x: number;
  y: number;
  rx: number;
  ry: number;
  angle: number;
}

interface AvatarGeometry {
  head: ReactNode;
  leftEye: EyeGeometry;
  rightEye: EyeGeometry;
  mouth: string;
}

interface AvatarNodes {
  body: SVGGElement | null;
  leftEye: SVGGElement | null;
  rightEye: SVGGElement | null;
  mouth: SVGPathElement | null;
}

interface PointerState {
  active: boolean;
  clientX: number;
  clientY: number;
  x: number;
  y: number;
}

interface AimSpring {
  x: number;
  v: number;
  target: number;
}

type FrameSubscriber = (timestamp: number, deltaSeconds: number) => void;
type VisibilityListener = (visible: boolean) => void;

const frameSubscribers = new Set<FrameSubscriber>();
const visibilityListeners = new Map<Element, Set<VisibilityListener>>();
const documentVisibilityListeners = new Set<(visible: boolean) => void>();
let frameRequest = 0;
let lastFrameTimestamp = 0;
let visibilityObserver: IntersectionObserver | null = null;
let documentVisibilityListening = false;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

function pumpFrame(timestamp: number) {
  frameRequest = 0;
  const deltaSeconds = Math.min(Math.max((timestamp - lastFrameTimestamp) / 1000, 0), 0.05);
  lastFrameTimestamp = timestamp;

  frameSubscribers.forEach((subscriber) => subscriber(timestamp, deltaSeconds));

  if (frameSubscribers.size > 0) {
    frameRequest = window.requestAnimationFrame(pumpFrame);
  }
}

function subscribeSharedFrame(subscriber: FrameSubscriber) {
  frameSubscribers.add(subscriber);
  if (!frameRequest) {
    lastFrameTimestamp = performance.now();
    frameRequest = window.requestAnimationFrame(pumpFrame);
  }

  return () => {
    frameSubscribers.delete(subscriber);
    if (frameSubscribers.size === 0 && frameRequest) {
      window.cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
  };
}

function getVisibilityObserver() {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;

  if (!visibilityObserver) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibilityListeners.get(entry.target)?.forEach((listener) => {
            listener(entry.isIntersecting);
          });
        }
      },
      { rootMargin: "48px", threshold: 0.01 },
    );
  }

  return visibilityObserver;
}

function observeVisibility(element: Element, listener: VisibilityListener) {
  const observer = getVisibilityObserver();
  if (!observer) {
    listener(true);
    return () => {};
  }

  let listeners = visibilityListeners.get(element);
  if (!listeners) {
    listeners = new Set();
    visibilityListeners.set(element, listeners);
    observer.observe(element);
  }
  listeners.add(listener);

  return () => {
    const current = visibilityListeners.get(element);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      visibilityListeners.delete(element);
      observer.unobserve(element);
      if (visibilityListeners.size === 0) {
        observer.disconnect();
        visibilityObserver = null;
      }
    }
  };
}

function notifyDocumentVisibility() {
  const visible = !document.hidden;
  documentVisibilityListeners.forEach((listener) => listener(visible));
}

function subscribeDocumentVisibility(listener: VisibilityListener) {
  if (typeof document === "undefined") {
    listener(true);
    return () => {};
  }

  documentVisibilityListeners.add(listener);
  if (!documentVisibilityListening) {
    document.addEventListener("visibilitychange", notifyDocumentVisibility);
    documentVisibilityListening = true;
  }
  listener(!document.hidden);

  return () => {
    documentVisibilityListeners.delete(listener);
    if (documentVisibilityListeners.size === 0 && documentVisibilityListening) {
      document.removeEventListener("visibilitychange", notifyDocumentVisibility);
      documentVisibilityListening = false;
    }
  };
}

function subscribeReducedMotion(listener: (reduced: boolean) => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    listener(false);
    return () => {};
  }

  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => listener(query.matches);
  query.addEventListener("change", update);
  update();
  return () => query.removeEventListener("change", update);
}

function hashSeed(seed: number) {
  let value = Math.abs(Math.trunc(seed)) || 1;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function getBlinkScale(time: number, seed: number) {
  const hashed = hashSeed(seed);
  const cycle = 4.6 + (hashed % 19) * 0.1;
  const offset = (hashed % 31) * 0.13;
  const phase = (time + offset) % cycle;

  if (phase < 0.055) return 1 - phase / 0.055;
  if (phase < 0.11) return (phase - 0.055) / 0.055;
  if (hashed % 7 === 0 && phase > 0.25 && phase < 0.34) {
    return phase < 0.295
      ? 1 - (phase - 0.25) / 0.045
      : (phase - 0.295) / 0.045;
  }
  return 1;
}

function getGeometry(shape: AvatarShape): AvatarGeometry {
  const { face, path } = getAvatarShapeData(shape);
  const eyeX = BASE_EYE_X * face.sx;
  const eyeY = AVATAR_CENTER + face.y + BASE_EYE_Y * face.sy;
  const eyeScale = face.eye;

  return {
    head: <path className="grok-bot-avatar-mark__head" d={path} />,
    leftEye: {
      x: AVATAR_CENTER + face.x - eyeX,
      y: eyeY,
      rx: BASE_EYE_RX * eyeScale,
      ry: BASE_EYE_RY * eyeScale,
      angle: -8,
    },
    rightEye: {
      x: AVATAR_CENTER + face.x + eyeX,
      y: eyeY,
      rx: BASE_EYE_RX * eyeScale,
      ry: BASE_EYE_RY * eyeScale,
      angle: 8,
    },
    mouth: "M91 128 Q114.27 138 137.54 128",
  };
}

function setEyeTransform(element: SVGGElement | null, eye: EyeGeometry, gazeX: number, gazeY: number, scale: number) {
  element?.setAttribute(
    "transform",
    `translate(${gazeX.toFixed(2)} ${gazeY.toFixed(2)}) translate(${eye.x} ${eye.y}) rotate(${eye.angle}) scale(1 ${scale.toFixed(3)})`,
  );
}

function setBodyTransform(
  element: SVGGElement | null,
  x: number,
  y: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
) {
  element?.setAttribute(
    "transform",
    `translate(${x.toFixed(2)} ${y.toFixed(2)}) translate(${AVATAR_CENTER} ${AVATAR_CENTER}) rotate(${rotation.toFixed(2)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)}) translate(${-AVATAR_CENTER} ${-AVATAR_CENTER})`,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stepAimSpring(spring: AimSpring, deltaSeconds: number) {
  const steps = Math.max(1, Math.ceil(deltaSeconds / FIXED_STEP));
  const step = deltaSeconds / steps;

  for (let index = 0; index < steps; index += 1) {
    spring.v += (
      -2 * AIM_SPRING_DAMPING * AIM_SPRING_FREQUENCY * spring.v
      - AIM_SPRING_FREQUENCY ** 2 * (spring.x - spring.target)
    ) * step;
    spring.x += spring.v * step;

    if (!Number.isFinite(spring.x) || !Number.isFinite(spring.v)) {
      spring.x = spring.target;
      spring.v = 0;
    }
  }
}

function updatePointerGaze(
  pointer: PointerState,
  svg: SVGSVGElement,
  deltaSeconds: number,
) {
  let targetX = 0;
  let targetY = 0;

  if (pointer.active) {
    const bounds = svg.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) {
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      targetX = POINTER_GAZE_X * clamp(
        (pointer.clientX - centerX) / bounds.width,
        -POINTER_RANGE,
        POINTER_RANGE,
      );
      targetY = POINTER_GAZE_Y * clamp(
        (pointer.clientY - centerY) / bounds.height,
        -POINTER_RANGE,
        POINTER_RANGE,
      );
    }
  }

  const smoothing = 1 - Math.exp(POINTER_SMOOTHING * deltaSeconds);
  pointer.x += (targetX - pointer.x) * smoothing;
  pointer.y += (targetY - pointer.y) * smoothing;
}

function renderAvatarFrame(
  nodes: AvatarNodes,
  state: AvatarState,
  time: number,
  reduced: boolean,
) {
  let x = 0;
  let y = 0;
  let rotation = 0;
  let scaleX = 1;
  let scaleY = 1;
  let mouthY = 0;
  let mouthScaleY = 1;

  if (reduced) {
    switch (state) {
      case "thinking":
        x = -2;
        y = -1;
        rotation = -7;
        break;
      case "working":
        y = -2;
        rotation = 4;
        break;
      case "listening":
        x = 2;
        rotation = 7;
        break;
      case "speaking":
        y = -1;
        scaleX = 1.02;
        scaleY = 1.02;
        mouthScaleY = 1.25;
        break;
      case "done":
        y = -2;
        rotation = 1;
        break;
      case "alert":
        scaleX = 1.04;
        scaleY = 1.04;
        mouthScaleY = 1.4;
        break;
      default:
        break;
    }
  } else {
    switch (state) {
      case "thinking": {
        rotation = -7 + Math.sin(time * 2.7) * 3.4;
        x = Math.sin(time * 2.1) * 3.2;
        y = Math.sin(time * 3.8) * 1.2 - 1;
        break;
      }
      case "working": {
        rotation = 4 + Math.sin(time * 7.2) * 2.4;
        x = 2.2 + Math.sin(time * 3.4) * 1.1;
        y = Math.abs(Math.sin(time * 4.8)) * -2.8;
        scaleY = 1 + Math.sin(time * 5.1) * 0.012;
        break;
      }
      case "listening": {
        rotation = 7 + Math.sin(time * 1.6) * 1.4;
        x = 2.4;
        y = Math.sin(time * 2.2) * 1.2;
        break;
      }
      case "speaking": {
        const voice = Math.sin(time * 10.5);
        scaleX = 1 - voice * 0.018;
        scaleY = 1 + voice * 0.026;
        y = Math.sin(time * 5.2) * 1.9 - 0.8;
        rotation = Math.sin(time * 2.4) * 1.2;
        mouthY = Math.sin(time * 11.5) * 1.2;
        mouthScaleY = 0.9 + Math.abs(Math.sin(time * 10.5)) * 0.85;
        break;
      }
      case "done": {
        const settle = (Math.sin(time * 2.4) + 1) * 0.5;
        y = -5 * settle;
        rotation = Math.sin(time * 2.4) * 1.8;
        scaleX = 1.025;
        scaleY = 0.98;
        break;
      }
      case "alert": {
        x = Math.sin(time * 25) * 2.2;
        rotation = Math.sin(time * 20) * 3.2;
        scaleX = 1.045;
        scaleY = 1.045;
        mouthScaleY = 1.3 + Math.abs(Math.sin(time * 8)) * 0.25;
        break;
      }
      case "idle":
      default:
        x = Math.sin(time * 0.7) * 0.8;
        y = Math.sin(time * 1.35) * 1.35;
        rotation = Math.sin(time * 0.85) * 1.25;
        scaleY = 1 + Math.sin(time * 1.35) * 0.006;
        break;
    }
  }

  setBodyTransform(nodes.body, x, y, rotation, scaleX, scaleY);
  nodes.mouth?.setAttribute(
    "transform",
    `translate(0 ${mouthY.toFixed(2)}) translate(${AVATAR_CENTER} 0) scale(1 ${mouthScaleY.toFixed(3)}) translate(${-AVATAR_CENTER} 0)`,
  );
}

function renderAnimatedFrame(
  nodes: AvatarNodes,
  geometry: AvatarGeometry,
  state: AvatarState,
  time: number,
  seed: number,
  deltaSeconds: number,
  pointer: PointerState,
  aimX: AimSpring,
  aimY: AimSpring,
  pointerEnabled: boolean,
) {
  renderAvatarFrame(nodes, state, time, false);

  let autonomousGazeX = 0;
  let autonomousGazeY = 0;
  let eyeScale = 1;
  switch (state) {
    case "thinking": {
      autonomousGazeX = -2.5 + Math.sin(time * 1.9) * 1.5;
      autonomousGazeY = -3.5;
      eyeScale = 0.88;
      break;
    }
    case "working": {
      autonomousGazeX = Math.sin(time * 5.4) * 3.2;
      autonomousGazeY = 0.8;
      break;
    }
    case "listening": {
      autonomousGazeY = -1.4;
      eyeScale = 1.05;
      break;
    }
    case "done": {
      eyeScale = 0.74;
      break;
    }
    case "alert": {
      eyeScale = 1.18;
      break;
    }
    default:
      autonomousGazeX = Math.sin(time * 0.52) * 1.4;
      autonomousGazeY = Math.sin(time * 0.37) * 0.7;
      break;
  }

  aimX.target = autonomousGazeX;
  aimY.target = autonomousGazeY;
  stepAimSpring(aimX, deltaSeconds);
  stepAimSpring(aimY, deltaSeconds);

  const autonomousWeight = pointerEnabled && pointer.active
    ? POINTER_AUTONOMOUS_GAZE_WEIGHT
    : 1;
  const gazeX = (pointerEnabled ? pointer.x : 0) + aimX.x * autonomousWeight;
  const gazeY = (pointerEnabled ? pointer.y : 0) + aimY.x * autonomousWeight;
  const blink = getBlinkScale(time, seed);
  setEyeTransform(nodes.leftEye, geometry.leftEye, gazeX, gazeY, blink * eyeScale);
  setEyeTransform(nodes.rightEye, geometry.rightEye, gazeX, gazeY, blink * eyeScale);
}

export function GrokBotAvatarMark({
  shape = "grok",
  state = "idle",
  motion = "auto",
  size = 36,
  seed = 1,
  foreground = "var(--grok-bot-current-agent-coat, #885cf5)",
  background = "var(--grok-bot-bg-editor, #ffffff)",
  className,
  paused = false,
  emphasis = false,
  followPointer = true,
}: GrokBotAvatarMarkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);
  const mouthRef = useRef<SVGPathElement>(null);
  const renderedOnceRef = useRef(false);
  const gradientId = `grok-avatar-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const geometry = getGeometry(shape);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const nodes: AvatarNodes = {
      body: bodyRef.current,
      leftEye: leftEyeRef.current,
      rightEye: rightEyeRef.current,
      mouth: mouthRef.current,
    };
    const pointer: PointerState = {
      active: false,
      clientX: 0,
      clientY: 0,
      x: 0,
      y: 0,
    };
    const aimX: AimSpring = { x: 0, v: 0, target: 0 };
    const aimY: AimSpring = { x: 0, v: 0, target: 0 };
    const coarsePointer = typeof window.matchMedia === "function"
      ? window.matchMedia("(pointer: coarse)")
      : null;
    const pointerEnabled = followPointer
      && motion !== "off"
      && motion !== "reduced"
      && !coarsePointer?.matches;
    const handlePointerMove = (event: PointerEvent) => {
      pointer.active = true;
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
    };
    const handlePointerLeave = () => {
      pointer.active = false;
    };

    if (pointerEnabled) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", handlePointerLeave);
    }

    let visible = true;
    let documentVisible = !document.hidden;
    let reduced = false;
    let frameUnsubscribe: (() => void) | null = null;
    let elapsed = 0;
    let lastPaint = 0;

    const stopFrames = () => {
      frameUnsubscribe?.();
      frameUnsubscribe = null;
      svg.dataset.animating = "false";
    };

    const drawReducedFrame = () => {
      stopFrames();
      renderAvatarFrame(nodes, state, 0.8, true);
      const blink = state === "done" ? 0.72 : 1;
      const eyeScale = state === "thinking"
        ? 0.86
        : state === "done"
          ? 0.72
          : state === "alert"
            ? 1.18
            : state === "listening"
              ? 1.05
              : 1;
      setEyeTransform(nodes.leftEye, geometry.leftEye, 0, state === "thinking" ? -3 : 0, blink * eyeScale);
      setEyeTransform(nodes.rightEye, geometry.rightEye, 0, state === "thinking" ? -3 : 0, blink * eyeScale);
    };

    const syncAnimation = () => {
      const forceStatic = reduced || motion === "off" || motion === "reduced";
      if (forceStatic) {
        drawReducedFrame();
        return;
      }
      if (paused) {
        stopFrames();
        return;
      }
      if (!visible || !documentVisible) {
        stopFrames();
        return;
      }
      if (frameUnsubscribe) return;

      frameUnsubscribe = subscribeSharedFrame((timestamp, deltaSeconds) => {
        elapsed += deltaSeconds;
        if (timestamp - lastPaint < 1000 / 30) return;
        lastPaint = timestamp;
        const pointerTrackingEnabled = pointerEnabled && !reduced;
        if (pointerTrackingEnabled) {
          updatePointerGaze(pointer, svg, deltaSeconds);
        }
        renderAnimatedFrame(
          nodes,
          geometry,
          state,
          elapsed,
          seed,
          deltaSeconds,
          pointer,
          aimX,
          aimY,
          pointerTrackingEnabled,
        );
      });
      svg.dataset.animating = "true";
    };

    if (!renderedOnceRef.current) {
      drawReducedFrame();
      renderedOnceRef.current = true;
    }

    const stopObserving = observeVisibility(svg, (nextVisible) => {
      visible = nextVisible;
      syncAnimation();
    });
    const stopDocumentVisibility = subscribeDocumentVisibility((nextVisible) => {
      documentVisible = nextVisible;
      syncAnimation();
    });
    const stopReducedMotion = subscribeReducedMotion((nextReduced) => {
      reduced = nextReduced;
      syncAnimation();
    });

    syncAnimation();
    return () => {
      stopObserving();
      stopDocumentVisibility();
      stopReducedMotion();
      stopFrames();
      if (pointerEnabled) {
        window.removeEventListener("pointermove", handlePointerMove);
        document.documentElement.removeEventListener("mouseleave", handlePointerLeave);
      }
    };
  }, [followPointer, shape, motion, paused, seed, state]);

  return (
    <svg
      aria-hidden="true"
      className={cn("grok-bot-avatar-mark", className)}
      data-animating="false"
      data-emphasis={emphasis || undefined}
      data-pointer-follow={followPointer ? "true" : undefined}
      data-shape={shape}
      data-state={state}
      focusable="false"
      overflow="visible"
      ref={svgRef}
      role="presentation"
      style={
        {
          "--avatar-bg": background,
          "--avatar-fg": foreground,
          "--avatar-size": `${size}px`,
        } as CSSProperties
      }
      viewBox={AVATAR_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="34" x2="172" y1="24" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={foreground} />
          <stop offset="1" stopColor={foreground} stopOpacity="0.84" />
        </linearGradient>
      </defs>

      <circle className="grok-bot-avatar-mark__halo" cx={AVATAR_CENTER} cy={AVATAR_CENTER} r="104" />
      <g className="grok-bot-avatar-mark__state grok-bot-avatar-mark__thinking" aria-hidden="true">
        <circle cx={AVATAR_CENTER - 28} cy="28" r="3.5" />
        <circle cx={AVATAR_CENTER} cy="21" r="3.5" />
        <circle cx={AVATAR_CENTER + 28} cy="28" r="3.5" />
      </g>
      <g className="grok-bot-avatar-mark__state grok-bot-avatar-mark__working" aria-hidden="true">
        <circle cx={AVATAR_CENTER} cy={AVATAR_CENTER} pathLength="100" r="104" />
        <circle className="grok-bot-avatar-mark__working-dot" cx={AVATAR_CENTER} cy="16" r="5" />
      </g>
      <g className="grok-bot-avatar-mark__state grok-bot-avatar-mark__listening" aria-hidden="true">
        <path d="M34 82C23 95 23 113 34 126" />
        <path d="M21 71C5 92 5 116 21 137" />
        <path d="M194 82C205 95 205 113 194 126" />
        <path d="M207 71C223 92 223 116 207 137" />
      </g>
      <g className="grok-bot-avatar-mark__state grok-bot-avatar-mark__speaking" aria-hidden="true">
        <path d="M37 80C28 95 28 113 37 128" />
        <path d="M191 80C200 95 200 113 191 128" />
      </g>
      <g className="grok-bot-avatar-mark__state grok-bot-avatar-mark__done" aria-hidden="true">
        <circle cx={AVATAR_CENTER} cy={AVATAR_CENTER} r="104" />
        <path d="M87 113L105 131L144 90" />
      </g>
      <g className="grok-bot-avatar-mark__state grok-bot-avatar-mark__alert" aria-hidden="true">
        <circle cx={AVATAR_CENTER} cy={AVATAR_CENTER} r="104" />
        <path d="M114.27 5V17M114.27 211.54V223.54M5 114.27H17M211.54 114.27H223.54" />
      </g>

      <g className="grok-bot-avatar-mark__body" ref={bodyRef}>
        <g fill={`url(#${gradientId})`}>{geometry.head}</g>
        <path
          className="grok-bot-avatar-mark__shine"
          d="M67 60C79 43 94 35 113 33"
        />
        <g className="grok-bot-avatar-mark__eye" ref={leftEyeRef}>
          <ellipse cx="0" cy="0" rx={geometry.leftEye.rx} ry={geometry.leftEye.ry} />
          <circle className="grok-bot-avatar-mark__eye-glint" cx="-4" cy="-6" r="2.5" />
        </g>
        <g className="grok-bot-avatar-mark__eye" ref={rightEyeRef}>
          <ellipse cx="0" cy="0" rx={geometry.rightEye.rx} ry={geometry.rightEye.ry} />
          <circle className="grok-bot-avatar-mark__eye-glint" cx="-4" cy="-6" r="2.5" />
        </g>
        <path className="grok-bot-avatar-mark__mouth" d={geometry.mouth} ref={mouthRef} />
      </g>
    </svg>
  );
}

export default GrokBotAvatarMark;