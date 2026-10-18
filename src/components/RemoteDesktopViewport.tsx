import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";

import {
  LabeledCursor,
  MINI_BORDER,
  MINI_COLOR,
  MiniWindowChrome,
} from "./MiniWindow";

const DESIGN_WIDTH = 360;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const SCALE_EPSILON = 0.001;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const DEFAULT_WALLPAPER_URL = `${import.meta.env.BASE_URL}wallpapers/cloud-agents-2.webp`;

const TERMINAL_LINES = [
  { text: "$ npm run dev", opacity: 0.4 },
  { text: "ready - started on 0.0.0.0:3000", opacity: 0.25 },
  { text: "✓ compiled in 1.2s", opacity: 0.25 },
  { text: "○ compiling /dashboard...", opacity: 0.25 },
  { text: "✓ compiled in 340ms", opacity: 0.25 },
];

const BROWSER_LIST_WIDTHS = [75, 60, 50, 65];

function TerminalContent() {
  return (
    <>
      <MiniWindowChrome />
      <div
        className="flex-1 px-[4px] pb-0 pt-[3px]"
        style={{
          color: MINI_COLOR,
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          fontSize: "5px",
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
        }}
      >
        <div className="space-y-[1px] whitespace-nowrap">
          {TERMINAL_LINES.map((line) => (
            <div key={line.text} style={{ opacity: line.opacity }}>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BrowserCard({ lineWidth }: { lineWidth: number }) {
  return (
    <div
      className="flex-1 rounded-[2px] p-[3px]"
      style={{
        border: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 8%, transparent)`,
      }}
    >
      <div
        className="mb-[2px] h-[1.5px] w-[50%] rounded-sm"
        style={{ backgroundColor: MINI_COLOR, opacity: 0.08 }}
      />
      <div
        className="h-[2px] rounded-sm"
        style={{
          backgroundColor: MINI_COLOR,
          opacity: 0.12,
          width: `${lineWidth}%`,
        }}
      />
    </div>
  );
}

function BrowserContent() {
  return (
    <>
      <MiniWindowChrome />
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex w-[22%] shrink-0 flex-col gap-[3px] p-[4px]"
          style={{ borderRight: MINI_BORDER }}
        >
          {[70, 50, 60, 45].map((width, index) => (
            <div
              className="h-[2px] rounded-sm"
              key={width}
              style={{
                backgroundColor: MINI_COLOR,
                opacity: index === 0 ? 0.12 : 0.06,
                width: `${width}%`,
              }}
            />
          ))}
        </div>
        <div className="flex-1 p-[5px]">
          <div className="mb-[4px] flex gap-[3px]">
            <BrowserCard lineWidth={70} />
            <BrowserCard lineWidth={60} />
            <BrowserCard lineWidth={65} />
          </div>
          <div
            className="mb-[4px] rounded-[2px]"
            style={{
              backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 4%, transparent)`,
              border: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 6%, transparent)`,
              height: "40%",
            }}
          />
          <div className="flex flex-col gap-[2px]">
            {BROWSER_LIST_WIDTHS.map((width) => (
              <div
                className="flex items-center gap-[3px]"
                key={width}
                style={{
                  borderBottom: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 5%, transparent)`,
                }}
              >
                <div
                  className="h-[1.5px] w-[8px] shrink-0 rounded-sm"
                  style={{ backgroundColor: MINI_COLOR, opacity: 0.08 }}
                />
                <div
                  className="h-[1.5px] rounded-sm"
                  style={{
                    backgroundColor: MINI_COLOR,
                    opacity: 0.06,
                    width: `${width}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function TerminalIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 22 22">
      <path
        d="m5.1 6.6 4.2 4.1-4.2 4.2M11.2 15h5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BrowserIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="7.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M11 3.8c2.1 2.1 3.1 4.5 3.1 7.2s-1 5.1-3.1 7.2C8.9 16.1 7.9 13.7 7.9 11s1-5.1 3.1-7.2ZM4.1 11h13.8M5.4 7.2h11.2M5.4 14.8h11.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 22 22">
      <rect
        height="10.5"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.4"
        width="14"
        x="4"
        y="5.7"
      />
      <path
        d="m5 7 6 4.5L17 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function renderDockIcon(icon: ReactNode) {
  switch (icon) {
    case "browser":
      return <BrowserIcon />;
    case "mail":
      return <MailIcon />;
    case "terminal":
      return <TerminalIcon />;
    default:
      return icon;
  }
}

export interface DesktopWindow {
  id: string;
  dockIcon?: ReactNode;
  dockLabel: string;
  defaultTop: number;
  defaultLeft: number;
  width: number;
  height: number;
  content: ReactNode;
  windowClassName?: string;
  windowStyle?: CSSProperties;
}

export interface RemoteDesktopViewportProps {
  expanded?: boolean;
  onExpand?: () => void;
  wallpaperUrl?: string;
  wallpaperUrlDark?: string;
  showDock?: boolean;
  windows?: DesktopWindow[];
  className?: string;
  aspectRatioClass?: string;
}

interface WindowFrameProps {
  expanded: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  defaultTop: number;
  defaultLeft: number;
  width: number;
  height: number;
  zIndex: number;
  windowClassName?: string;
  windowStyle?: CSSProperties;
  onActivate: () => void;
  children: ReactNode;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startTop: number;
  startLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  lastX: number;
  lastY: number;
}

const WindowFrame = memo(function WindowFrame({
  expanded,
  viewportRef,
  defaultTop,
  defaultLeft,
  width,
  height,
  zIndex,
  windowClassName,
  windowStyle,
  onActivate,
  children,
}: WindowFrameProps) {
  const [position, setPosition] = useState({
    top: defaultTop,
    left: defaultLeft,
  });
  const dragStateRef = useRef<DragState | null>(null);
  const animationFrameRef = useRef(0);

  useEffect(
    () => () => cancelAnimationFrame(animationFrameRef.current),
    [],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onActivate();

    if (!expanded || !viewportRef.current || event.button !== 0) {
      return;
    }

    const viewportRect = viewportRef.current.getBoundingClientRect();
    if (viewportRect.width <= 0 || viewportRect.height <= 0) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startTop: position.top,
      startLeft: position.left,
      pointerId: event.pointerId,
      viewportWidth: viewportRect.width,
      viewportHeight: viewportRect.height,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;

    if (animationFrameRef.current) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = 0;
      const currentDrag = dragStateRef.current;
      if (!currentDrag) {
        return;
      }

      const deltaLeft =
        ((currentDrag.lastX - currentDrag.startX) /
          currentDrag.viewportWidth) *
        100;
      const deltaTop =
        ((currentDrag.lastY - currentDrag.startY) /
          currentDrag.viewportHeight) *
        100;

      setPosition({
        left: currentDrag.startLeft + deltaLeft,
        top: currentDrag.startTop + deltaTop,
      });
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  return (
    <div
      className={cn(
        "rd-interactive absolute touch-none overflow-hidden rounded-[5px] bg-theme-bg",
        expanded && "cursor-grab active:cursor-grabbing",
        windowClassName,
      )}
      onPointerCancel={endDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      style={{
        top: `${position.top}%`,
        left: `${position.left}%`,
        width: `${width}%`,
        height: `${height}%`,
        zIndex,
        boxShadow:
          "0 3px 12px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.1)",
        ...windowStyle,
      }}
    >
      <div
        className="flex origin-top-left flex-col"
        style={{
          width: `calc(var(--rd-base-width, 100%) * ${width / 100})`,
          height: `calc(var(--rd-base-height, 100%) * ${height / 100})`,
          transform: "scale(var(--rd-content-scale, 1))",
        }}
      >
        {children}
      </div>
    </div>
  );
});

const DEFAULT_WINDOWS: DesktopWindow[] = [
  {
    id: "terminal",
    dockIcon: "terminal",
    dockLabel: "Terminal",
    defaultTop: 14,
    defaultLeft: 6,
    width: 42,
    height: 44,
    content: <TerminalContent />,
  },
  {
    id: "browser",
    dockIcon: "browser",
    dockLabel: "Browser",
    defaultTop: 22,
    defaultLeft: 38,
    width: 52,
    height: 56,
    content: <BrowserContent />,
  },
];

export function RemoteDesktopViewport({
  expanded = false,
  onExpand,
  wallpaperUrl = DEFAULT_WALLPAPER_URL,
  wallpaperUrlDark,
  showDock = true,
  windows = DEFAULT_WINDOWS,
  className,
  aspectRatioClass = "aspect-[4/3]",
}: RemoteDesktopViewportProps) {
  const [activeWindowId, setActiveWindowId] = useState(
    () => windows[windows.length - 1]?.id ?? "",
  );
  const [hiddenWindowIds, setHiddenWindowIds] = useState<Set<string>>(
    () => new Set(),
  );
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const cursorViewportRectRef = useRef<DOMRect | null>(null);
  const lastScaleRef = useRef<number | null>(null);

  const toggleWindow = useCallback((id: string) => {
    setHiddenWindowIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setActiveWindowId(id);
  }, []);

  const activateWindow = useCallback((id: string) => {
    setActiveWindowId(id);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const updateScale = (entry?: ResizeObserverEntry) => {
      const { width, height } =
        entry?.contentRect ?? viewport.getBoundingClientRect();

      if (width <= 0 || height <= 0) {
        return;
      }

      cursorViewportRectRef.current = null;
      const scale = Math.max(
        MIN_SCALE,
        Math.min(width / DESIGN_WIDTH, MAX_SCALE),
      );
      const baseHeight = height / scale;

      viewport.style.setProperty("--rd-base-width", `${DESIGN_WIDTH}px`);
      viewport.style.setProperty("--rd-base-height", `${baseHeight}px`);

      if (
        lastScaleRef.current !== null &&
        Math.abs(lastScaleRef.current - scale) < SCALE_EPSILON
      ) {
        return;
      }

      lastScaleRef.current = scale;
      viewport.style.setProperty("--rd-content-scale", scale.toString());
    };

    updateScale();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => updateScale(entry));
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const handleCursorMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const viewportRect =
        cursorViewportRectRef.current ??
        (cursorViewportRectRef.current =
          viewportRef.current?.getBoundingClientRect() ?? null);
      const cursor = cursorRef.current;

      if (!viewportRect || !cursor) {
        return;
      }

      cursor.style.left = `${event.clientX - viewportRect.left}px`;
      cursor.style.top = `${event.clientY - viewportRect.top}px`;
      cursor.style.display = "";
    },
    [],
  );

  const handleCursorLeave = useCallback(() => {
    cursorViewportRectRef.current = null;
    if (cursorRef.current) {
      cursorRef.current.style.display = "none";
    }
  }, []);

  return (
    <div
      className={cn(
        "group/desktop relative max-h-full w-full overflow-hidden rounded-md",
        aspectRatioClass,
        className,
      )}
      onMouseLeave={expanded ? handleCursorLeave : undefined}
      onMouseMove={expanded ? handleCursorMove : undefined}
      ref={viewportRef}
    >
      <img
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          wallpaperUrlDark &&
            "remote-desktop-wallpaper remote-desktop-wallpaper--light",
        )}
        draggable={false}
        src={wallpaperUrl}
      />
      {wallpaperUrlDark ? (
        <img
          alt=""
          className="remote-desktop-wallpaper remote-desktop-wallpaper--dark absolute inset-0 h-full w-full object-cover"
          draggable={false}
          src={wallpaperUrlDark}
        />
      ) : null}

      {windows.map((window) =>
        hiddenWindowIds.has(window.id) ? null : (
          <WindowFrame
            key={window.id}
            defaultLeft={window.defaultLeft}
            defaultTop={window.defaultTop}
            expanded={expanded}
            height={window.height}
            onActivate={() => activateWindow(window.id)}
            viewportRef={viewportRef}
            width={window.width}
            windowClassName={window.windowClassName}
            windowStyle={window.windowStyle}
            zIndex={activeWindowId === window.id ? 4 : 2}
          >
            {window.content}
          </WindowFrame>
        ),
      )}

      {expanded ? (
        <div
          className="pointer-events-none absolute z-30"
          ref={cursorRef}
          style={{ display: "none", left: "50%", top: "50%" }}
        >
          <LabeledCursor hideCursor label="You" />
        </div>
      ) : null}

      {!expanded && onExpand ? (
        <div
          aria-label="Open screen"
          className="absolute inset-0 z-[25] cursor-pointer"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onExpand();
            }
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onExpand();
          }}
          role="button"
          tabIndex={0}
        />
      ) : null}

      {showDock ? (
        <div
          className="absolute bottom-1.5 left-1/2 z-10"
          style={{
            transform: "translateX(-50%) scale(var(--rd-content-scale, 1))",
            transformOrigin: "bottom center",
          }}
        >
          <div
            aria-hidden={!expanded || undefined}
            aria-label={expanded ? "Applications" : undefined}
            className="rd-interactive remote-desktop-dock flex items-end"
            role={expanded ? "toolbar" : undefined}
          >
            {windows.map((window) => {
              const visible = !hiddenWindowIds.has(window.id);
              return (
                <button
                  aria-label={`${visible ? "Hide" : "Show"} ${window.dockLabel}`}
                  className="remote-desktop-dock-item"
                  data-icon={
                    typeof window.dockIcon === "string"
                      ? window.dockIcon
                      : undefined
                  }
                  data-visible={visible || undefined}
                  disabled={!expanded}
                  key={window.id}
                  onClick={expanded ? () => toggleWindow(window.id) : undefined}
                  type="button"
                >
                  <span className="remote-desktop-dock-app-icon">
                    {renderDockIcon(window.dockIcon)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="remote-desktop-dock-running-indicator"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}