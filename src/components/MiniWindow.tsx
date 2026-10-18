import { memo } from "react";
import type { CSSProperties, ReactNode } from "react";

export const MINI_BORDER =
  "0.5px solid color-mix(in srgb, var(--color-theme-fg) 8%, transparent)";
export const MINI_COLOR = "var(--color-theme-fg)";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface MiniWindowChromeProps {
  className?: string;
}

export const MiniWindowChrome = memo(function MiniWindowChrome({
  className,
}: MiniWindowChromeProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-[11px] shrink-0 items-center gap-[2px] px-[4px]",
        className,
      )}
      style={{ borderBottom: MINI_BORDER }}
    >
      {[0, 1, 2].map((dot) => (
        <span
          className="h-[3px] w-[3px] rounded-full"
          key={dot}
          style={{ backgroundColor: MINI_COLOR, opacity: 0.15 }}
        />
      ))}
    </div>
  );
});

MiniWindowChrome.displayName = "MiniWindowChrome";

export interface MiniBarProps {
  width: CSSProperties["width"];
  opacity?: number;
  className?: string;
}

export const MiniBar = memo(function MiniBar({
  width,
  opacity = 0.1,
  className,
}: MiniBarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[3px] shrink-0 rounded-full", className)}
      style={{ width, backgroundColor: MINI_COLOR, opacity }}
    />
  );
});

MiniBar.displayName = "MiniBar";

interface CursorArrowProps {
  fill: string;
  hidden?: boolean;
  className?: string;
}

const CursorArrow = memo(function CursorArrow({
  fill,
  hidden = false,
  className,
}: CursorArrowProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "-scale-x-100 shrink-0 drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.3)] transition-opacity duration-200",
        hidden && "opacity-0",
        className,
      )}
      data-cursor-arrow=""
      fill="none"
      height="18"
      viewBox="0 0 16 16"
      width="18"
    >
      <path
        clipRule="evenodd"
        d="M14.4775 2.375C15.1508 2.37522 15.5719 3.10428 15.2353 3.6875L8.63861 15.1143C8.19099 15.8892 7.00618 15.5716 7.00579 14.6768V7.56348L0.845638 4.00781C0.0708241 3.56015 0.388339 2.37535 1.28314 2.375H14.4775ZM7.69329 6.51758C8.04109 6.7186 8.25579 7.09044 8.25579 7.49219V13.2764L13.8271 3.625H2.68353L7.69329 6.51758Z"
        fill="white"
        fillRule="evenodd"
      />
      <path
        d="M7.69329 6.51758C8.04109 6.7186 8.25579 7.09044 8.25579 7.49219V13.2764L13.8271 3.625H2.68353L7.69329 6.51758Z"
        fill={fill}
      />
    </svg>
  );
});

CursorArrow.displayName = "CursorArrow";

export interface AgentCursorProps {
  className?: string;
  color?: string;
}

export const AgentCursor = memo(function AgentCursor({
  className,
  color = "var(--grok-bot-current-agent-coat, #885cf5)",
}: AgentCursorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-[18px] w-[18px]", className)}
    >
      <CursorArrow fill={color} />
      <span
        className="absolute left-[11px] top-[12px] flex size-[16px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white drop-shadow-[0_0.5px_1px_rgba(0,0,0,0.3)]"
        style={{ "--fg": color, "--bg": "#fff" } as CSSProperties}
      >
        <svg
          className="grok-bot-mark grok-bot-mark--fill"
          viewBox="0 0 16 16"
        >
          <path
            className="grok-bot-mark__head"
            d="M4.15 3.15a1.7 1.7 0 0 1 1.2-.5h5.3a1.7 1.7 0 0 1 1.2.5l1.15 1.15a1.7 1.7 0 0 1 .5 1.2v5.3a1.7 1.7 0 0 1-.5 1.2l-1.15 1.15a1.7 1.7 0 0 1-1.2.5h-5.3a1.7 1.7 0 0 1-1.2-.5L3 12a1.7 1.7 0 0 1-.5-1.2V5.5A1.7 1.7 0 0 1 3 4.3l1.15-1.15Z"
          />
          <ellipse
            className="grok-bot-mark__eye"
            cx="5.9"
            cy="8"
            rx="1.15"
            ry="1.5"
          />
          <ellipse
            className="grok-bot-mark__eye"
            cx="10.1"
            cy="8"
            rx="1.15"
            ry="1.5"
          />
        </svg>
      </span>
    </div>
  );
});

AgentCursor.displayName = "AgentCursor";

export interface LabeledCursorProps {
  label?: ReactNode;
  hideCursor?: boolean;
  className?: string;
}

export const LabeledCursor = memo(function LabeledCursor({
  label,
  hideCursor = false,
  className,
}: LabeledCursorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-start gap-0", className)}
    >
      <CursorArrow fill="#1a1a1a" hidden={hideCursor} />
      {label ? (
        <span className="mt-2.5 -ml-0.5 whitespace-nowrap rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
          {label}
        </span>
      ) : null}
    </div>
  );
});

LabeledCursor.displayName = "LabeledCursor";