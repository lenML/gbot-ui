import type { ReactNode } from "react";
import {
  AgentCursor,
  MINI_BORDER,
  MINI_COLOR,
  MiniBar,
  MiniWindowChrome,
  type DesktopWindow,
} from "../index";

export interface CrmPortalScriptedScreen {
  view?: "login" | "queue";
  emailChars?: number;
  passwordChars?: number;
  focus?: "email" | "password" | null;
  isWorking?: boolean;
}

const HERO_LOGIN_EMAIL = "armand@acme.co";
const CRM_QUEUE_ROWS = [
  { name: 86, memo: 70 },
  { name: 68, memo: 90 },
  { name: 80, memo: 58 },
  { name: 58, memo: 82 },
  { name: 88, memo: 66 },
  { name: 66, memo: 88 },
  { name: 76, memo: 54 },
  { name: 62, memo: 78 },
  { name: 82, memo: 64 },
] as const;
const CRM_SIDEBAR_ROWS = [
  [62, 48, 70],
  [54, 66, 44, 58],
] as const;
const DRAFTS = [
  { name: "Priya Natarajan", opener: 82 },
  { name: "Marcus Webb", opener: 64 },
  { name: "Elena Sorensen", opener: 74 },
  { name: "Daniel Alvarez", opener: 58 },
] as const;
const TERMINAL_LINES = [
  { text: "$ npm run dev", opacity: 0.4 },
  { text: "ready - started on 0.0.0.0:3000", opacity: 0.25 },
  { text: "compiled in 1.2s", opacity: 0.25 },
  { text: "compiling /dashboard...", opacity: 0.25 },
  { text: "compiled in 340ms", opacity: 0.25 },
] as const;
const BROWSER_LIST_WIDTHS = [75, 60, 50, 65] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function charCount(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

export function normalizeCrmPortalScreen(
  scripted: unknown,
): CrmPortalScriptedScreen | null {
  if (!isRecord(scripted)) {
    return null;
  }

  return {
    view:
      scripted.view === "login" || scripted.view === "queue"
        ? scripted.view
        : undefined,
    emailChars: charCount(scripted.emailChars),
    passwordChars: charCount(scripted.passwordChars),
    focus:
      scripted.focus === "email" || scripted.focus === "password"
        ? scripted.focus
        : null,
    isWorking:
      typeof scripted.isWorking === "boolean" ? scripted.isWorking : undefined,
  };
}

export function isCrmPortalScreen(scripted: unknown) {
  if (!isRecord(scripted)) {
    return false;
  }

  return (
    "view" in scripted ||
    "emailChars" in scripted ||
    "passwordChars" in scripted ||
    "focus" in scripted ||
    "isWorking" in scripted
  );
}

function CrmField({
  target,
  text,
  placeholder,
  focused,
}: {
  target: string;
  text: string;
  placeholder: string;
  focused: boolean;
}) {
  return (
    <div
      className="flex h-[12px] w-full items-center rounded-[3px] px-[5px] text-[5px] leading-none"
      data-demo-target={target}
      style={{
        border: focused
          ? `0.5px solid color-mix(in srgb, ${MINI_COLOR} 35%, transparent)`
          : MINI_BORDER,
        backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 3%, transparent)`,
      }}
    >
      <span style={{ color: MINI_COLOR, opacity: text ? 0.8 : 0.3 }}>
        {text || placeholder}
      </span>
      {focused ? (
        <span
          aria-hidden="true"
          className="ml-px h-[6px] w-px animate-pulse"
          style={{ backgroundColor: MINI_COLOR, opacity: 0.7 }}
        />
      ) : null}
    </div>
  );
}

function CrmLogin({ scripted }: { scripted: CrmPortalScriptedScreen }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[7px] px-[22%] pb-[10%]">
      <span
        aria-hidden="true"
        className="mb-[3px] h-[14px] w-[14px] shrink-0 rounded-full"
        style={{ backgroundColor: MINI_COLOR, opacity: 0.12 }}
      />
      <div className="flex w-full flex-col gap-[4px]">
        <CrmField
          focused={scripted.focus === "email"}
          placeholder="Email"
          target="portal-email"
          text={HERO_LOGIN_EMAIL.slice(0, scripted.emailChars ?? 0)}
        />
        <CrmField
          focused={scripted.focus === "password"}
          placeholder="Password"
          target="portal-password"
          text={"*".repeat(scripted.passwordChars ?? 0)}
        />
      </div>
      <button
        className="h-[12px] w-full cursor-default rounded-[3px] text-[5px] leading-none"
        data-demo-target="portal-submit"
        style={{
          backgroundColor: MINI_COLOR,
          color: "var(--color-theme-bg)",
          opacity: 0.85,
        }}
        tabIndex={-1}
        type="button"
      >
        Sign in
      </button>
    </div>
  );
}

type ReceiptState = "pending" | "checking" | "checked";

function CrmReceipt({ state, index }: { state: ReceiptState; index: number }) {
  if (state === "pending") {
    return (
      <span
        aria-hidden="true"
        className="shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          border: `0.5px solid ${MINI_COLOR}`,
          opacity: 0.18,
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={
        state === "checking"
          ? "baby-grok-bot-receipt-check shrink-0"
          : "shrink-0"
      }
      style={{
        color: "var(--grok-bot-text-success)",
        animationDelay: state === "checking" ? `${200 + index * 260}ms` : undefined,
      }}
    >
      <svg fill="none" height="6" viewBox="0 0 12 12" width="6">
        <circle
          cx="6"
          cy="6"
          opacity="0.4"
          r="5.25"
          stroke="currentColor"
          strokeWidth="0.75"
        />
        <path
          d="M3.75 6.25l1.6 1.6 2.9-3.4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </svg>
    </span>
  );
}

function CrmFixedCell({
  width,
  children,
}: {
  width: string;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center" style={{ width }}>
      {children}
    </div>
  );
}

function CrmQueue({ mode }: { mode: "idle" | "working" | "settled" }) {
  const receipt: ReceiptState =
    mode === "settled" ? "checked" : mode === "working" ? "checking" : "pending";

  return (
    <div className="relative flex min-h-0 flex-1">
      {mode === "working" ? (
        <div
          aria-hidden="true"
          className="baby-grok-bot-portal-agent-cursor pointer-events-none absolute z-10 origin-top-left scale-[0.6]"
        >
          <AgentCursor />
        </div>
      ) : null}
      <div
        className="flex w-[19%] shrink-0 flex-col gap-[7px] px-[5px] py-[7px]"
        style={{
          borderRight: MINI_BORDER,
          backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 2%, transparent)`,
        }}
      >
        {CRM_SIDEBAR_ROWS.map((rows, rowIndex) => (
          <div className="flex flex-col gap-[5px]" key={rowIndex}>
            {rows.map((width, widthIndex) => (
              <MiniBar
                key={widthIndex}
                opacity={0.09}
                width={`${width}%`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-[8px] py-[7px]">
        <div className="flex items-center gap-[5px] pb-[7px]">
          <MiniBar opacity={0.16} width="30%" />
          <div
            aria-hidden="true"
            className="ml-auto h-[7px] w-[13%] shrink-0 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 5%, transparent)`,
            }}
          />
          <div
            aria-hidden="true"
            className="h-[7px] w-[17%] shrink-0 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 8%, transparent)`,
            }}
          />
        </div>
        <div
          className="flex items-center gap-[5px] pb-[4px]"
          style={{
            borderBottom: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 8%, transparent)`,
          }}
        >
          <span aria-hidden="true" className="shrink-0" style={{ width: 6 }} />
          <CrmFixedCell width="calc(40% + 11px)">
            <MiniBar opacity={0.14} width="45%" />
          </CrmFixedCell>
          <CrmFixedCell width="28%">
            <MiniBar opacity={0.14} width="50%" />
          </CrmFixedCell>
          <MiniBar className="ml-auto" opacity={0.14} width="11%" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {CRM_QUEUE_ROWS.map((row, index) => (
            <div
              className="flex flex-1 items-center gap-[5px]"
              key={`${row.name}-${row.memo}`}
              style={{
                borderBottom: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 5%, transparent)`,
              }}
            >
              <CrmReceipt index={index} state={receipt} />
              <span
                aria-hidden="true"
                className="shrink-0 rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: MINI_COLOR,
                  opacity: 0.08,
                }}
              />
              <CrmFixedCell width="40%">
                <MiniBar width={`${row.name}%`} />
              </CrmFixedCell>
              <CrmFixedCell width="28%">
                <MiniBar opacity={0.06} width={`${row.memo}%`} />
              </CrmFixedCell>
              <MiniBar className="ml-auto" opacity={0.06} width="11%" />
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-between pt-[6px] text-[5px] leading-none"
          style={{ color: MINI_COLOR }}
        >
          <span style={{ opacity: 0.4 }}>52 accounts</span>
          <span style={{ opacity: 0.55 }}>36 contacts</span>
        </div>
      </div>
    </div>
  );
}

function CrmPortalContent({ scripted }: { scripted: unknown }) {
  const state = normalizeCrmPortalScreen(scripted);

  return (
    <div className="flex h-full w-full flex-col">
      <MiniWindowChrome />
      <div
        aria-hidden="true"
        className="flex h-[9px] shrink-0 items-center justify-center"
        style={{ borderBottom: MINI_BORDER }}
      >
        <div
          className="h-[4px] w-[36%] rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 5%, transparent)`,
          }}
        />
      </div>
      {state?.view === "login" ? (
        <CrmLogin scripted={state} />
      ) : (
        <CrmQueue
          mode={
            state === null || state.isWorking === undefined
              ? "settled"
              : state.isWorking
                ? "working"
                : "idle"
          }
        />
      )}
    </div>
  );
}

function DraftRow({ name, opener }: { name: string; opener: number }) {
  return (
    <div
      className="flex flex-1 items-center gap-[5px]"
      style={{
        borderBottom: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 5%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 rounded-full"
        style={{
          width: 7,
          height: 7,
          backgroundColor: MINI_COLOR,
          opacity: 0.1,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[2.5px]">
        <span
          className="truncate text-[5px] leading-none"
          style={{ color: MINI_COLOR, opacity: 0.75 }}
        >
          {name}
        </span>
        <MiniBar opacity={0.08} width={`${opener}%`} />
      </div>
      <span
        className="shrink-0 rounded-full px-[4px] py-[1.5px] text-[4.5px] leading-none"
        style={{
          border: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 22%, transparent)`,
          color: MINI_COLOR,
          opacity: 0.6,
        }}
      >
        Draft
      </span>
    </div>
  );
}

function DraftsQueueContent() {
  return (
    <div className="flex h-full w-full flex-col">
      <MiniWindowChrome />
      <div
        aria-hidden="true"
        className="flex h-[9px] shrink-0 items-center justify-center"
        style={{ borderBottom: MINI_BORDER }}
      >
        <div
          className="h-[4px] w-[36%] rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${MINI_COLOR} 5%, transparent)`,
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-[8px] py-[6px]">
        <div
          className="flex items-center justify-between pb-[5px] text-[5px] leading-none"
          style={{
            borderBottom: `0.5px solid color-mix(in srgb, ${MINI_COLOR} 8%, transparent)`,
            color: MINI_COLOR,
          }}
        >
          <span style={{ opacity: 0.75 }}>Outreach queue</span>
          <MiniBar opacity={0.1} width="18%" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {DRAFTS.map((draft) => (
            <DraftRow key={draft.name} name={draft.name} opener={draft.opener} />
          ))}
        </div>
        <div
          className="flex items-center justify-between pt-[5px] text-[5px] leading-none"
          style={{ color: MINI_COLOR }}
        >
          <span style={{ opacity: 0.55 }}>36 drafts queued</span>
          <span style={{ opacity: 0.4 }}>0 sent</span>
        </div>
      </div>
    </div>
  );
}

function TerminalContent() {
  return (
    <div className="flex h-full w-full flex-col">
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
    </div>
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
    <div className="flex h-full w-full flex-col">
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
    </div>
  );
}

export const terminalWindow: DesktopWindow = {
  id: "terminal",
  dockIcon: "terminal",
  dockLabel: "Terminal",
  defaultTop: 14,
  defaultLeft: 6,
  width: 42,
  height: 44,
  content: <TerminalContent />,
};

export const browserWindow: DesktopWindow = {
  id: "browser",
  dockIcon: "browser",
  dockLabel: "Browser",
  defaultTop: 22,
  defaultLeft: 38,
  width: 52,
  height: 56,
  content: <BrowserContent />,
};

export const draftsQueueWindow: DesktopWindow = {
  id: "drafts-queue",
  dockIcon: "mail",
  dockLabel: "Drafts queue",
  windowStyle: { zIndex: 6 },
  defaultTop: 24,
  defaultLeft: 41,
  width: 44,
  height: 62,
  content: <DraftsQueueContent />,
};

export function crmPortalWindow(scripted: unknown): DesktopWindow {
  return {
    id: "crm-portal",
    dockIcon: "browser",
    dockLabel: "CRM portal",
    windowClassName: "!overflow-visible",
    defaultTop: 11,
    defaultLeft: 25,
    width: 50,
    height: 72,
    content: <CrmPortalContent scripted={scripted} />,
  };
}

export function crmPortalWindows(scripted: unknown): DesktopWindow[] {
  const portal = crmPortalWindow(scripted);
  return scripted === null || scripted === undefined
    ? [portal, draftsQueueWindow]
    : [portal];
}

export function desktopContentWindows(
  screenKind?: string,
  scriptedScreen?: unknown,
): DesktopWindow[] {
  switch (screenKind) {
    case "crm-portal":
      return crmPortalWindows(scriptedScreen);
    case "drafts-queue":
      return [draftsQueueWindow];
    case "terminal":
      return [terminalWindow];
    case "browser":
      return [browserWindow];
    case "terminal-browser":
      return [terminalWindow, browserWindow];
    default:
      return isCrmPortalScreen(scriptedScreen)
        ? crmPortalWindows(scriptedScreen)
        : [terminalWindow, browserWindow];
  }
}
