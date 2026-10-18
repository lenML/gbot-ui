import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import {
  AgentCursor,
  CardBadge,
  LabeledCursor,
} from "../index";
import type {
  ComputerUseStatus,
  GrokBotTranscriptEntry,
  TranscriptComputerUseEntry,
} from "../../lib/grok-bot/types";
import {
  useGrokBotActions,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import { GrokBotIcon } from "./AgentAvatar";
import { ComputerSurface } from "./ComputerSurface";
import { desktopContentWindows } from "./desktopContent";


const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

type DisplayComputerStatus = ComputerUseStatus | "ready";

const STATUS_DETAILS: Record<
  DisplayComputerStatus,
  { label: string; tone: "accent" | "muted" | "success" | "warning"; spinner: boolean }
> = {
  "action-needed": {
    label: "Action needed",
    tone: "warning",
    spinner: true,
  },
  "handed-over": {
    label: "You're in control",
    tone: "warning",
    spinner: false,
  },
  working: {
    label: "Working",
    tone: "accent",
    spinner: true,
  },
  done: {
    label: "Done",
    tone: "success",
    spinner: false,
  },
  ready: {
    label: "Ready",
    tone: "muted",
    spinner: false,
  },
};

interface ResizeState {
  pointerId: number;
  startX: number;
  startWidth: number;
  latestWidth: number;
}

function latestComputerEntry(entries: GrokBotTranscriptEntry[]) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.kind === "computer-use") {
      return entry;
    }
  }
  return null;
}

function DesktopIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <rect
        height="10.5"
        rx="1.7"
        stroke="currentColor"
        strokeWidth="1.35"
        width="14.5"
        x="2.75"
        y="3.25"
      />
      <path
        d="M7 16.75h6M10 13.75v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function ExpandIcon({ close = false }: { close?: boolean }) {
  if (close) {
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

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="M6.25 3.5h-2.5a.25.25 0 0 0-.25.25v2.5M9.75 3.5h2.5a.25.25 0 0 1 .25.25v2.5M6.25 12.5h-2.5a.25.25 0 0 1-.25-.25v-2.5M9.75 12.5h2.5a.25.25 0 0 0 .25-.25v-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={direction === "right" ? "rotate-180" : undefined}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m9.75 3.75-4.25 4.25 4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

export interface GrokBotDesktopPaneProps {
  className?: string;
}

export function GrokBotDesktopPane({
  className,
}: GrokBotDesktopPaneProps) {
  const { state } = useGrokBotStore();
  const actions = useGrokBotActions();
  const reducedMotion = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLElement | null>(null);
  const dividerRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<ResizeState | null>(null);
  const animationFrameRef = useRef(0);
  const [isResizing, setIsResizing] = useState(false);
  const [view, setView] = useState<"computer" | "settings">("computer");

  const finishResize = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsResizing(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (drag) {
      actions.resizeDesktopPane(drag.latestWidth);
    }
  }, [actions]);

  useLayoutEffect(() => {
    const pane = rootRef.current;
    const shell = pane?.parentElement;
    if (!shell) {
      return;
    }

    let frame = 0;
    const measure = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        actions.setShellWidth(shell.getBoundingClientRect().width);
      });
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", measure);
      };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [actions]);

  useEffect(() => {
    if (state.isSettingsOpen) setView("settings");
  }, [state.isSettingsOpen, state.settingsAgentId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        finishResize();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", finishResize);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", finishResize);
      finishResize();
    };
  }, [finishResize]);

  if (!state.isDesktopPaneOpen) {
    return null;
  }

  const activeAgent =
    state.agents.find((agent) => agent.id === state.activeAgentId) ??
    state.agents[0];
  const settingsAgent =
    state.agents.find((agent) => agent.id === state.settingsAgentId) ??
    activeAgent;
  const settingsView = view === "settings";
  const activeTranscript = state.transcripts[state.activeAgentId] ?? [];
  const computerEntry: TranscriptComputerUseEntry | null =
    latestComputerEntry(activeTranscript);
  const status: DisplayComputerStatus =
    computerEntry?.status ?? (activeAgent?.isRunning ? "working" : "ready");
  const statusDetails = STATUS_DETAILS[status];
  const windows = desktopContentWindows(
    computerEntry?.screenKind,
    state.scriptedScreen,
  );
  const screenOpen =
    state.screenOverlay?.origin.kind === "agent" &&
    state.screenOverlay.origin.agentId === state.activeAgentId;
  const previewDescription =
    computerEntry?.ask ??
    computerEntry?.instruction ??
    "Agent desktop is ready for a task.";

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: state.desktopPaneWidth,
      latestWidth: state.desktopPaneWidth,
    };
    setIsResizing(true);
  };

  const handleResizePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    drag.latestWidth = drag.startWidth + drag.startX - event.clientX;
    if (animationFrameRef.current) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = 0;
      const currentDrag = dragRef.current;
      if (currentDrag) {
        actions.resizeDesktopPane(currentDrag.latestWidth);
      }
    });
  };

  const handleResizePointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    finishResize();
  };

  const handleResizeKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    actions.resizeDesktopPane(state.desktopPaneWidth + direction * 16);
  };

  const toggleScreen = () => {
    if (screenOpen) {
      actions.closeScreen();
      return;
    }

    actions.openScreen(
      { kind: "agent", agentId: state.activeAgentId },
      "agent",
    );
  };

  return (
    <aside
      aria-label={settingsView ? "Agent settings" : "Agent computer"}
      className={cn(
        "baby-grok-bot-side-pane group/desktop-pane",
        className,
      )}
      data-computer-status={status}
      data-open="true"
      data-reduced-motion={reducedMotion || undefined}
      data-resizing={isResizing || undefined}
      data-view={view}
      ref={rootRef}
      style={{ width: state.desktopPaneWidth }}
    >
      <div className="baby-grok-bot-side-pane__inner">
        <button
          aria-label="Resize agent computer"
          aria-orientation="vertical"
          aria-valuemax={380}
          aria-valuemin={160}
          aria-valuenow={Math.round(state.desktopPaneWidth)}
          className="absolute inset-y-0 left-0 z-20 w-2 -translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent outline-none focus-visible:bg-[var(--grok-bot-current-agent-accent)]/20"
          onKeyDown={handleResizeKeyDown}
          onPointerCancel={handleResizePointerUp}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          ref={dividerRef}
          role="separator"
          type="button"
        />

        <header className="flex h-11 shrink-0 items-center gap-2 border-b-[0.5px] border-[var(--grok-bot-border-default)] px-3">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--grok-bot-current-agent-tint)]/45 text-[var(--grok-bot-current-agent-accent)]"
          >
            {settingsView ? <GrokBotIcon name="gear" size={15} /> : <DesktopIcon />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-[18px]">
              {settingsView ? "Agent settings" : "Agent computer"}
            </p>
            <p className="truncate text-[11px] leading-[14px] text-[var(--cursor-text-tertiary)]">
              {settingsView
                ? `${settingsAgent?.name ?? "Agent"} - profile, tools, computer`
                : `${activeAgent?.name ?? "Agent"} - ${statusDetails.label}`}
            </p>
          </div>
          {!settingsView ? (
            <button
              aria-label={screenOpen ? "Close full screen" : "Open full screen"}
              className="baby-grok-bot-window-action"
              onClick={toggleScreen}
              title={screenOpen ? "Close full screen" : "Open full screen"}
              type="button"
            >
              <span className="size-4">
                {screenOpen ? <ExpandIcon close /> : <ExpandIcon />}
              </span>
            </button>
          ) : null}
          <button
            aria-label={settingsView ? "Close agent settings" : "Close agent computer"}
            className="baby-grok-bot-window-action"
            onClick={() => {
              setView("computer");
              if (state.isSettingsOpen) actions.closeSettings();
              else actions.setDesktopPaneOpen(false);
            }}
            title={settingsView ? "Close settings" : "Close agent computer"}
            type="button"
          >
            <span className="size-4">
              <ChevronIcon direction="right" />
            </span>
          </button>
        </header>

        <div className="baby-grok-bot-inspector-tabs" role="tablist" aria-label="Agent inspector">
          <button
            aria-selected={!settingsView}
            data-active={!settingsView || undefined}
            onClick={() => setView("computer")}
            role="tab"
            type="button"
          >
            <GrokBotIcon name="device-desktop" size={13} />
            Computer
          </button>
          <button
            aria-selected={settingsView}
            data-active={settingsView || undefined}
            onClick={() => setView("settings")}
            role="tab"
            type="button"
          >
            <GrokBotIcon name="gear" size={13} />
            Settings
          </button>
        </div>

        {settingsView ? (
          <AgentSettingsPanel
            agentId={settingsAgent?.id}
            className="min-h-0 flex-1"
            onOpenComputer={() => setView("computer")}
          />
        ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <div className="relative overflow-hidden rounded-xl border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--grok-bot-bg-editor)] shadow-sm">
            <ComputerSurface
              agent={activeAgent!}
              aspectRatioClass="aspect-[16/10]"
              className="!rounded-none"
              entry={computerEntry}
              onExpand={toggleScreen}
              showDock={false}
              windows={windows}
            />
            {status === "working" || status === "action-needed" ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[57%] top-[42%] z-[26] scale-75 drop-shadow-sm"
              >
                <AgentCursor />
              </div>
            ) : null}
            {status === "handed-over" ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[57%] top-[42%] z-[26] scale-75 drop-shadow-sm"
              >
                <LabeledCursor label="You" />
              </div>
            ) : null}
          </div>

          <section aria-live="polite" className="space-y-2">
            <div className="flex items-center gap-2">
              <CardBadge
                label={statusDetails.label}
                spinner={statusDetails.spinner}
                tone={statusDetails.tone}
              />
              <span className="text-[11px] text-[var(--cursor-text-tertiary)]">
                {windows.length} app{windows.length === 1 ? "" : "s"} open
              </span>
            </div>
            <p className="line-clamp-3 text-[12px] leading-[17px] text-[var(--cursor-text-secondary)]">
              {previewDescription}
            </p>
          </section>

          <div className="mt-auto grid grid-cols-2 gap-2 border-t-[0.5px] border-[var(--grok-bot-border-default)] pt-3">
            <button
              className="baby-grok-bot-card-action justify-center"
              data-variant="secondary"
              onClick={toggleScreen}
              type="button"
            >
              {screenOpen ? "Close screen" : "Open screen"}
            </button>
            <button
              className="baby-grok-bot-card-action justify-center"
              data-variant="primary"
              onClick={() => actions.setDesktopPaneOpen(false)}
              type="button"
            >
              Hide pane
            </button>
          </div>
        </div>
        )}
      </div>
    </aside>
  );
}

export default GrokBotDesktopPane;
