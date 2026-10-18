import { useEffect, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useGrokBotSlots } from "../../lib/grok-bot/store";
import type {
  AgentLastEntry,
  GrokBotAgent,
  GrokBotContextMenuState,
  GrokBotViewer,
} from "../../lib/grok-bot/types";
import { AgentAvatar } from "./AgentAvatar";
import {
  openAgentContextMenu,
  openAgentContextMenuFromKeyboard,
} from "./ContextMenu";

export interface MobileChatListProps {
  agents: GrokBotAgent[];
  title: string;
  viewer: GrokBotViewer;
  onOpenAgent: (agentId: string) => void;
  onOpenCreate?: () => void;
  onOpenCompose?: () => void;
  onOpenMenu?: (menu: GrokBotContextMenuState) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  animatedPinned?: boolean;
  activeAgentId?: string;
}

const dayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const formatAgentTime = (timestampMs: number) => {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "";
  const date = new Date(timestampMs);
  const now = new Date();
  const days = Math.round((dayStart(now) - dayStart(date)) / 86_400_000);
  if (days <= 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], {
    month: "numeric",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear()
      ? {}
      : { year: "2-digit" as const }),
  });
};

const formatLastEntryPreview = (entry: AgentLastEntry | null) =>
  entry?.text ?? "";

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const CLICK_SUPPRESSION_MS = 1_000;
const NOOP_MENU = () => undefined;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const unreadLabel = (agent: GrokBotAgent) => {
  if (!agent.hasUnread) return "";
  const count = agent.unreadCount ?? 0;
  return count > 0 ? `${count} unread` : "Unread";
};

const conversationPreview = (agent: GrokBotAgent) => {
  if (agent.isComposingMessage) return "Typing...";
  if (agent.status) return agent.status.label;
  if (agent.lastEntry) return formatLastEntryPreview(agent.lastEntry);
  if (agent.conversationTitle) return agent.name;
  if (agent.isGroup && agent.members?.length) {
    return agent.members.map((member) => member.name).join(", ");
  }
  return "";
};

function useConversationRowInteractions({
  agentId,
  onOpen,
  onOpenMenu,
}: {
  agentId: string;
  onOpen: () => void;
  onOpenMenu: (menu: GrokBotContextMenuState) => void;
}) {
  const timerRef = useRef<number | null>(null);
  const suppressionTimerRef = useRef<number | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);
  const lastLongPressAtRef = useRef(0);

  const clearClickSuppression = () => {
    suppressClickRef.current = false;
    if (suppressionTimerRef.current !== null) {
      window.clearTimeout(suppressionTimerRef.current);
      suppressionTimerRef.current = null;
    }
  };

  const armClickSuppression = () => {
    suppressClickRef.current = true;
    if (suppressionTimerRef.current !== null) {
      window.clearTimeout(suppressionTimerRef.current);
    }
    suppressionTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressionTimerRef.current = null;
    }, CLICK_SUPPRESSION_MS);
  };

  const clearScrollListener = () => {
    scrollCleanupRef.current?.();
    scrollCleanupRef.current = null;
  };

  const cancelPendingPress = (
    keepClickSuppression = suppressClickRef.current,
  ) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearScrollListener();
    pointerIdRef.current = null;
    if (!keepClickSuppression) clearClickSuppression();
  };

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (suppressionTimerRef.current !== null) {
        window.clearTimeout(suppressionTimerRef.current);
      }
      clearScrollListener();
    },
    [],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;

    cancelPendingPress();
    clearClickSuppression();
    pointerIdRef.current = event.pointerId;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };

    const row = event.currentTarget;
    const x = event.clientX;
    const y = event.clientY;
    const handleScroll = () => cancelPendingPress();
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    scrollCleanupRef.current = () => {
      window.removeEventListener("scroll", handleScroll, true);
    };

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      lastLongPressAtRef.current = performance.now();
      armClickSuppression();
      row.focus({ preventScroll: true });
      onOpenMenu({
        target: { kind: "agent", agentId },
        x,
        y,
      });
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - pointerStartRef.current.x;
    const dy = event.clientY - pointerStartRef.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) {
      cancelPendingPress();
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    cancelPendingPress(true);
    if (suppressClickRef.current) armClickSuppression();
  };

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      clearClickSuppression();
      return;
    }
    onOpen();
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    cancelPendingPress();
    if (performance.now() - lastLongPressAtRef.current < LONG_PRESS_MS) return;
    openAgentContextMenu(event, agentId, onOpenMenu);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    openAgentContextMenuFromKeyboard(event, agentId, onOpenMenu);
  };

  return {
    onClick: handleClick,
    onContextMenu: handleContextMenu,
    onKeyDown: handleKeyDown,
    onPointerCancel: () => cancelPendingPress(),
    onPointerDown: handlePointerDown,
    onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (pointerIdRef.current === event.pointerId) cancelPendingPress();
    },
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };
}

function ConversationRow({
  agent,
  active,
  animated = false,
  onOpen,
  onOpenMenu,
}: {
  agent: GrokBotAgent;
  active: boolean;
  animated?: boolean;
  onOpen: () => void;
  onOpenMenu: (menu: GrokBotContextMenuState) => void;
}) {
  const working = agent.isRunning || agent.isComposingMessage;
  const unreadCount = agent.hasUnread ? (agent.unreadCount ?? 0) : 0;
  const preview = conversationPreview(agent);
  const displayTitle = agent.conversationTitle ?? agent.name;
  const slots = useGrokBotSlots();
  const interactions = useConversationRowInteractions({
    agentId: agent.id,
    onOpen,
    onOpenMenu,
  });
  const pinned = agent.isPinned === true;
  const label = [
    agent.isGroup ? `Group ${displayTitle}` : displayTitle,
    pinned ? "Pinned" : null,
    unreadLabel(agent),
    working ? "Working" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const ConversationRowSlot = slots.conversationRow;
  if (ConversationRowSlot) {
    return (
      <ConversationRowSlot
        active={active}
        agent={agent}
        collapsed={false}
        onContextMenu={interactions.onContextMenu}
        onKeyDown={interactions.onKeyDown}
        onOpen={onOpen}
        onOpenMenu={onOpenMenu}
      />
    );
  }

  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-haspopup="menu"
      aria-label={label}
      className={cn(
        "baby-grok-bot-conversation-row baby-grok-bot-agent-row rounded-2xl px-2 py-2.5 text-left hover:bg-[var(--grok-bot-bg-hover)] active:bg-[var(--grok-bot-bg-hover)]",
        animated && "baby-grok-bot-agent-row--enter",
      )}
      data-active={active || undefined}
      data-animated={(pinned && animated) || undefined}
      data-chat-kind={agent.isGroup ? "group" : "bot"}
      data-pinned={pinned || undefined}
      data-running={working || undefined}
      data-unread={agent.hasUnread || undefined}
      data-variant="row"
      {...interactions}
      type="button"
    >
      <AgentAvatar
        agent={agent}
        className="baby-grok-bot-agent-row__avatar"
        size={40}
        unread={agent.hasUnread}
        working={working}
      />

      <span className="baby-grok-bot-agent-row__body min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="min-w-0 truncate text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--cursor-text-primary)]">
              {displayTitle}
            </span>
            {pinned ? (
              <svg
                aria-hidden="true"
                className="size-3 shrink-0 text-[color:var(--grok-bot-current-agent-accent)]"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  d="M5.25 1.75h5.5l-.75 3.5 1.75 2.5H4.25L6 5.25l-.75-3.5ZM8 7.75v6.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.25"
                />
              </svg>
            ) : null}
          </span>
          {agent.isGroup ? (
            <span className="baby-grok-bot-chat-kind-badge shrink-0">
              Group
            </span>
          ) : null}
          <span className="shrink-0 text-[11px] leading-4 text-[color:var(--cursor-text-tertiary)]">
            {formatAgentTime(agent.lastActivityAt)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[12px] leading-4 text-[color:var(--cursor-text-secondary)]">
            {working ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-[var(--grok-bot-text-success)]"
              />
            ) : null}
            <span className="truncate">{preview}</span>
          </span>
          {unreadCount > 0 ? (
            <span
              aria-label={`${unreadCount} unread`}
              className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-fill-accent)] px-1.5 text-[11px] leading-none font-medium text-[var(--grok-bot-bubble-user-ink)]"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : agent.hasUnread ? (
            <span
              aria-label="Unread"
              className="size-2 shrink-0 rounded-full bg-[var(--grok-bot-fill-accent)]"
            />
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function MobileChatList({
  agents,
  title,
  viewer,
  onOpenAgent,
  onOpenCreate,
  onOpenCompose,
  onOpenMenu,
  isDark = false,
  onToggleTheme,
  animatedPinned = false,
  activeAgentId,
}: MobileChatListProps) {
  const pinnedAgents = agents.filter((agent) => agent.isPinned === true);
  const unpinnedAgents = agents.filter((agent) => agent.isPinned !== true);
  const orderedAgents = [...pinnedAgents, ...unpinnedAgents];
  const openCreate = onOpenCreate ?? onOpenCompose;
  const openMenu = onOpenMenu ?? NOOP_MENU;

  return (
    <div className="relative h-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-[var(--cursor-bg-editor)] to-transparent"
      />

      <header className="absolute inset-x-3 top-0 z-20 flex h-12 items-center justify-between gap-2">
        <button
          aria-label={`${viewer.name} profile`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--grok-bot-bg-elevated)] text-[11px] font-medium text-[color:var(--cursor-text-secondary)] shadow-sm backdrop-blur-xl"
          type="button"
        >
          {viewer.initials}
        </button>

        <span className="pointer-events-none absolute inset-x-12 truncate text-center text-[15px] leading-5 font-medium tracking-[-0.2px] text-[color:var(--cursor-text-primary)]">
          {title}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {onToggleTheme ? (
            <button
              aria-label={
                isDark ? "Switch to light theme" : "Switch to dark theme"
              }
              className="flex size-8 shrink-0 items-center justify-center rounded-full border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--grok-bot-bg-elevated)] text-[color:var(--cursor-text-secondary)] shadow-sm backdrop-blur-xl hover:text-[color:var(--cursor-text-primary)]"
              onClick={onToggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              type="button"
            >
              {isDark ? (
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="15"
                  viewBox="0 0 16 16"
                  width="15"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="2.75"
                    stroke="currentColor"
                    strokeWidth="1.35"
                  />
                  <path
                    d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.35"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="15"
                  viewBox="0 0 16 16"
                  width="15"
                >
                  <path
                    d="M12.8 10.15A5.4 5.4 0 0 1 5.85 3.2 5.45 5.45 0 1 0 12.8 10.15Z"
                    stroke="currentColor"
                    strokeLinejoin="round"
                    strokeWidth="1.35"
                  />
                </svg>
              )}
            </button>
          ) : null}

          <button
            aria-label="New conversation"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--grok-bot-bg-elevated)] text-[color:var(--cursor-text-secondary)] shadow-sm backdrop-blur-xl hover:text-[color:var(--cursor-text-primary)]"
            onClick={openCreate}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              viewBox="0 0 16 16"
              width="14"
            >
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="baby-grok-bot-transcript h-full overflow-y-auto px-2 pt-12 pb-4">
        <div aria-label="Chats" className="space-y-0.5" role="list">
          {orderedAgents.map((agent) => (
            <div key={agent.id} role="listitem">
              <ConversationRow
                active={agent.id === activeAgentId}
                agent={agent}
                animated={animatedPinned && agent.isPinned === true}
                onOpen={() => onOpenAgent(agent.id)}
                onOpenMenu={openMenu}
              />
            </div>
          ))}
        </div>

        {agents.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] leading-[18px] text-[color:var(--cursor-text-tertiary)]">
            No agents yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
