import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import { AgentCursor } from "../index";
import type {
  GrokBotTranscriptEntry,
  ScreenOverlay,
  TranscriptComputerUseEntry,
} from "../../lib/grok-bot/types";
import {
  useGrokBotActions,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import {
  desktopContentWindows,
  isCrmPortalScreen,
} from "./desktopContent";
import { ComputerSurface } from "./ComputerSurface";


const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const MOBILE_SHEET_MEDIA_QUERY = "(max-width: 767px)";
const SHEET_CLOSE_DISTANCE_PX = 96;
const SHEET_CLOSE_VELOCITY_PX_PER_MS = 0.55;

interface SheetGesture {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  offset: number;
  velocity: number;
}

interface OverlayTarget {
  agentId: string | null;
  entry: TranscriptComputerUseEntry | null;
}

function resolveOverlayTarget(
  overlay: ScreenOverlay,
  transcripts: Record<string, GrokBotTranscriptEntry[]>,
): OverlayTarget {
  const origin = overlay.origin;
  if (origin.kind === "agent") {
    const entries = transcripts[origin.agentId] ?? [];
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry?.kind === "computer-use") {
        return { agentId: origin.agentId, entry };
      }
    }
    return { agentId: origin.agentId, entry: null };
  }

  for (const [agentId, entries] of Object.entries(transcripts)) {
    const entry = entries.find(
      (candidate): candidate is TranscriptComputerUseEntry =>
        candidate.kind === "computer-use" &&
        candidate.id === origin.entryId,
    );
    if (entry) {
      return { agentId, entry };
    }
  }

  return { agentId: null, entry: null };
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="m4.25 4.25 7.5 7.5m0-7.5-7.5 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

export interface GrokBotScreenOverlayProps {
  className?: string;
}

export function GrokBotScreenOverlay({
  className,
}: GrokBotScreenOverlayProps) {
  const { state } = useGrokBotStore();
  const actions = useGrokBotActions();
  const reducedMotion = useReducedMotion() ?? false;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sheetGestureRef = useRef<SheetGesture | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [documentVisible, setDocumentVisible] = useState(
    () =>
      typeof document === "undefined" ||
      document.visibilityState !== "hidden",
  );
  const [renderedOverlay, setRenderedOverlay] = useState<ScreenOverlay | null>(
    state.screenOverlay,
  );
  const [isClosing, setIsClosing] = useState(false);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [sheetDismissStart, setSheetDismissStart] = useState(0);
  const [sheetInteracted, setSheetInteracted] = useState(false);

  const finishClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closingRef.current = false;
    sheetGestureRef.current = null;
    setIsSheetDragging(false);
    setSheetDragOffset(0);
    setSheetDismissStart(0);
    setSheetInteracted(false);
    setIsClosing(false);
    setRenderedOverlay(null);
    actions.closeScreen();
  }, [actions]);

  const closeScreen = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    if (reducedMotion) {
      finishClose();
      return;
    }
    closeTimerRef.current = window.setTimeout(finishClose, 240);
  }, [finishClose, reducedMotion]);

  useEffect(() => {
    if (state.screenOverlay) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      closingRef.current = false;
      sheetGestureRef.current = null;
      setIsSheetDragging(false);
      setSheetDragOffset(0);
      setSheetDismissStart(0);
      setSheetInteracted(false);
      setIsClosing(false);
      setRenderedOverlay(state.screenOverlay);
      return;
    }

    if (renderedOverlay && !closingRef.current) {
      closeScreen();
    }
  }, [closeScreen, renderedOverlay, state.screenOverlay]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const syncVisibility = () => {
      setDocumentVisible(document.visibilityState !== "hidden");
    };

    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (!renderedOverlay) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    let frame = 0;

    if (document.visibilityState !== "hidden") {
      frame = requestAnimationFrame(() => {
        layerRef.current?.focus({ preventScroll: true });
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const layer = layerRef.current;
      if (!layer || layer.getClientRects().length === 0) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeScreen();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        layer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

      if (focusable.length === 0) {
        event.preventDefault();
        layer.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (!layer.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [closeScreen, renderedOverlay]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !renderedOverlay) {
      return;
    }

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      frame.dataset.width = Math.round(entry.contentRect.width).toString();
      frame.dataset.height = Math.round(entry.contentRect.height).toString();
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [renderedOverlay]);

  const isMobileSheetViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_SHEET_MEDIA_QUERY).matches;

  const releaseSheetPointer = (
    target: HTMLDivElement,
    pointerId: number,
  ) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  };

  const endSheetGesture = (
    event: ReactPointerEvent<HTMLDivElement>,
    allowClose: boolean,
  ) => {
    const gesture = sheetGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    sheetGestureRef.current = null;
    releaseSheetPointer(event.currentTarget, event.pointerId);

    if (!allowClose || reducedMotion || !isMobileSheetViewport()) {
      setIsSheetDragging(false);
      setSheetDragOffset(0);
      return;
    }

    const finalOffset = Math.max(
      gesture.offset,
      event.clientY - gesture.startY,
      0,
    );
    const releaseDeltaY = Math.max(0, event.clientY - gesture.lastY);
    const releaseElapsed = event.timeStamp - gesture.lastTime;
    const releaseVelocity =
      releaseDeltaY > 0 && releaseElapsed > 0
        ? releaseDeltaY / releaseElapsed
        : gesture.velocity;

    if (
      finalOffset > SHEET_CLOSE_DISTANCE_PX ||
      releaseVelocity > SHEET_CLOSE_VELOCITY_PX_PER_MS
    ) {
      setSheetDismissStart(finalOffset);
      setIsSheetDragging(false);
      setSheetDragOffset(0);
      closeScreen();
      return;
    }

    setIsSheetDragging(false);
    setSheetDragOffset(0);
  };

  const beginSheetGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      reducedMotion ||
      closingRef.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      !isMobileSheetViewport()
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    sheetGestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      offset: 0,
      velocity: 0,
    };
    setSheetInteracted(true);
    setIsSheetDragging(true);
    setSheetDragOffset(0);
    setSheetDismissStart(0);
  };

  const moveSheetGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = sheetGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (reducedMotion || !isMobileSheetViewport()) {
      endSheetGesture(event, false);
      return;
    }

    const deltaY = event.clientY - gesture.lastY;
    const elapsed = event.timeStamp - gesture.lastTime;
    gesture.velocity =
      deltaY > 0 && elapsed > 0 ? deltaY / elapsed : 0;
    gesture.lastY = event.clientY;
    gesture.lastTime = event.timeStamp;

    const offset = Math.max(0, event.clientY - gesture.startY);
    gesture.offset = offset;
    setSheetDragOffset(offset);
  };

  const handleLostPointerCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const gesture = sheetGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    sheetGestureRef.current = null;
    setIsSheetDragging(false);
    setSheetDragOffset(0);
  };

  if (!renderedOverlay) {
    return null;
  }

  const overlay = renderedOverlay;
  const isTakeover = overlay.mode === "takeover";
  const target = resolveOverlayTarget(overlay, state.transcripts);
  const agent =
    state.agents.find((candidate) => candidate.id === target.agentId) ??
    state.agents.find((candidate) => candidate.id === state.activeAgentId) ??
    state.agents[0];
  const screenKind =
    target.entry?.screenKind ??
    (isCrmPortalScreen(state.scriptedScreen) ? "crm-portal" : undefined);
  const windows = desktopContentWindows(screenKind, state.scriptedScreen);
  const bannerLabel = isTakeover
    ? "You're in control"
    : target.entry?.instruction ?? `${agent?.name ?? "Agent"} is using this computer`;
  const dialogLabel = `${agent?.name ?? "Agent"} computer`;

  const finish = () => {
    if (target.entry) {
      actions.finishComputerTakeOver(target.entry.id);
      return;
    }
    closeScreen();
  };

  const takeOver = () => {
    if (target.entry) {
      actions.takeOverComputer(target.entry.id);
    }
  };

  return (
    <div
      aria-label={dialogLabel}
      aria-modal="true"
      className={cn(
        "baby-grok-bot-screen-layer",
        className,
      )}
      data-document-hidden={!documentVisible || undefined}
      data-mode={overlay.mode}
      data-reduced-motion={reducedMotion || undefined}
      data-state={isClosing ? "closing" : "open"}
      ref={layerRef}
      role="dialog"
      tabIndex={-1}
    >
      <button
        aria-label="Close screen"
        className="baby-grok-bot-screen-scrim border-0 p-0"
        onClick={closeScreen}
        type="button"
      />

      <div
        className="baby-grok-bot-screen-shell"
        data-sheet-interacted={sheetInteracted || undefined}
        onClick={(event) => event.stopPropagation()}
        style={
          {
            "--baby-grok-bot-sheet-offset": `${
              isSheetDragging ? sheetDragOffset : sheetDismissStart
            }px`,
          } as CSSProperties
        }
      >
        <div
          aria-label="Drag down to close"
          className="baby-grok-bot-screen-sheet-handle"
          data-sheet-dragging={isSheetDragging || undefined}
          onLostPointerCapture={handleLostPointerCapture}
          onPointerCancel={(event) => endSheetGesture(event, false)}
          onPointerDown={beginSheetGesture}
          onPointerMove={moveSheetGesture}
          onPointerUp={(event) => endSheetGesture(event, true)}
          ref={sheetRef}
          role="separator"
        >
          <span aria-hidden="true" />
        </div>

        <div className="baby-grok-bot-screen-shell__surface" />

        <div className="baby-grok-bot-screen-banner">
          <span
            aria-hidden="true"
            className="flex size-5 shrink-0 items-center justify-center"
          >
            {isTakeover ? (
              <span className="size-1.5 rounded-full bg-[var(--grok-bot-text-warning)]" />
            ) : (
              <AgentCursor className="scale-75" />
            )}
          </span>
          <span className="baby-grok-bot-screen-banner__label">
            {bannerLabel}
          </span>
          {isTakeover ? (
            <button
              className="baby-grok-bot-screen-banner__done"
              onClick={finish}
              type="button"
            >
              Done
            </button>
          ) : target.entry ? (
            <button
              className="baby-grok-bot-screen-banner__done"
              onClick={takeOver}
              type="button"
            >
              Take over
            </button>
          ) : null}
        </div>

        <div
          className="baby-grok-bot-screen-frame z-[1]"
          ref={frameRef}
        >
          <ComputerSurface
            agent={agent!}
            aspectRatioClass="h-full"
            className="!rounded-none"
            entry={target.entry}
            expanded
            showDock
            windows={windows}
          />
          {!isTakeover ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[58%] top-[44%] z-30"
            >
              <AgentCursor />
            </div>
          ) : null}
        </div>

        <button
          aria-label="Close screen"
          className="baby-grok-bot-screen-close z-10"
          onClick={closeScreen}
          title="Close screen"
          type="button"
        >
          <span className="size-3.5">
            <CloseIcon />
          </span>
        </button>
      </div>
    </div>
  );
}

export default GrokBotScreenOverlay;
