import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useGrokBotSlots, useGrokBotStore } from "../../lib/grok-bot/store";
import {
  openAgentContextMenu,
  openAgentContextMenuFromKeyboard,
} from "./ContextMenu";
import {
  SIDEBAR_COLLAPSE_AT_WIDTH,
  SIDEBAR_EXPAND_AT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "../../lib/grok-bot/types";
import type { GrokBotAgent } from "../../lib/grok-bot/types";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";

const COLLAPSED_WIDTH = 84;
const RESIZE_STEP = 16;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

function formatAgentTime(timestampMs: number) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "";
  const value = new Date(timestampMs);
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const then = new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
  const dayDelta = Math.round((today - then) / 86_400_000);
  if (dayDelta <= 0) {
    return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta < 7) return value.toLocaleDateString([], { weekday: "short" });
  return value.toLocaleDateString([], { month: "numeric", day: "numeric" });
}

function previewText(agent: GrokBotAgent) {
  if (agent.isComposingMessage) return "Typing...";
  if (!agent.lastEntry) {
    return agent.conversationTitle ? agent.name : "No messages yet";
  }
  if (agent.lastEntry.kind === "routine")
    return `Routine: ${agent.lastEntry.text}`;
  return agent.lastEntry.text;
}

function unreadLabel(agent: GrokBotAgent) {
  if (!agent.hasUnread) return "";
  const count = agent.unreadCount ?? 0;
  return count > 0 ? `${count} unread messages` : "Unread messages";
}

function SidebarStatus({ agent }: { agent: GrokBotAgent }) {
  if (agent.isComposingMessage) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="flex items-center gap-0.5" aria-hidden="true">
          <span className="baby-grok-bot-typing-dot scale-75" />
          <span className="baby-grok-bot-typing-dot scale-75 [animation-delay:120ms]" />
          <span className="baby-grok-bot-typing-dot scale-75 [animation-delay:240ms]" />
        </span>
        <span className="truncate">
          {agent.composingBeat?.label ?? "Typing..."}
        </span>
      </span>
    );
  }

  if (agent.status) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <GrokBotIcon className="shrink-0" name={agent.status.icon} size={12} />
        <span className="truncate">{agent.status.label}</span>
      </span>
    );
  }

  return <span className="block truncate">{previewText(agent)}</span>;
}

function AgentRow({
  agent,
  active,
  entered,
  collapsed,
  onOpen,
  onContextMenu,
  onKeyDown,
}: {
  agent: GrokBotAgent;
  active: boolean;
  entered: boolean;
  collapsed: boolean;
  onOpen: () => void;
  onContextMenu: MouseEventHandler<HTMLButtonElement>;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
}) {
  const unread = agent.hasUnread;
  const unreadCount = unread ? (agent.unreadCount ?? 0) : 0;
  const working = agent.isRunning || agent.isComposingMessage;
  const displayTitle = agent.conversationTitle ?? agent.name;

  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-haspopup="menu"
      aria-label={[
        agent.isGroup ? `Group ${displayTitle}` : displayTitle,
        unreadLabel(agent),
      ]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "baby-grok-bot-agent-row group my-0.5 hover:bg-[var(--grok-bot-sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)] motion-reduce:transition-none",
        entered && "baby-grok-bot-agent-row--enter",
      )}
      data-active={active || undefined}
      data-chat-kind={agent.isGroup ? "group" : "bot"}
      data-pinned={agent.isPinned || undefined}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      title={collapsed ? displayTitle : undefined}
      type="button"
    >
      <span className="baby-grok-bot-agent-row__avatar">
        <AgentAvatar
          agent={agent}
          size={collapsed ? 38 : 36}
          working={working}
        />
      </span>
      <span className="baby-grok-bot-agent-row__body min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--grok-bot-sidebar-text-primary)]">
            {displayTitle}
          </span>
          {agent.isGroup ? (
            <span className="baby-grok-bot-chat-kind-badge">Group</span>
          ) : null}
          <span className="shrink-0 text-[11px] leading-4 text-[color:var(--grok-bot-sidebar-text-tertiary)]">
            {formatAgentTime(agent.lastActivityAt)}
          </span>
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] leading-4 text-[color:var(--grok-bot-sidebar-text-secondary)]">
          <span className="min-w-0 flex-1">
            <SidebarStatus agent={agent} />
          </span>
          {unread ? (
            <span
              aria-label={unreadLabel(agent)}
              className="baby-grok-bot-agent-row__unread flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-fill-accent)] px-1.5 text-[11px] leading-none font-medium text-[color:var(--grok-bot-bubble-user-ink)]"
            >
              {unreadCount > 0 ? (
                unreadCount
              ) : (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>
          ) : null}
        </span>
        {agent.isGroup && agent.members?.length ? (
          <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] leading-4 text-[color:var(--grok-bot-sidebar-text-tertiary)]">
            <GrokBotIcon className="shrink-0" name="people" size={11} />
            <span className="truncate">
              {agent.members.map((member) => member.name).join(", ")}
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

function NewConversationMenu({
  collapsed,
  onNewChat,
  onNewBot,
  onNewGroup,
}: {
  collapsed: boolean;
  onNewChat: () => void;
  onNewBot: () => void;
  onNewGroup: () => void;
}) {
  return (
    <div
      aria-label="Open or create conversation"
      className={cn(
        "baby-grok-bot-new-chat-menu",
        collapsed && "baby-grok-bot-new-chat-menu--collapsed",
      )}
      role="menu"
    >
      <button onClick={onNewChat} role="menuitem" type="button">
        <GrokBotIcon name="plus" size={14} />
        <span>
          <strong>Open chat</strong>
          <small>Open a bot's private conversation</small>
        </span>
      </button>
      <button onClick={onNewBot} role="menuitem" type="button">
        <GrokBotIcon name="person" size={14} />
        <span>
          <strong>New bot</strong>
          <small>Create a reusable agent profile</small>
        </span>
      </button>
      <button onClick={onNewGroup} role="menuitem" type="button">
        <GrokBotIcon name="people" size={14} />
        <span>
          <strong>New group</strong>
          <small>Bring up to six bots together</small>
        </span>
      </button>
    </div>
  );
}

export function Sidebar() {
  const store = useGrokBotStore();
  const slots = useGrokBotSlots();
  const { state, actions } = store;
  const [query, setQuery] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);
  const previousBodyStyle = useRef<{
    cursor: string;
    userSelect: string;
  } | null>(null);

  const collapsed = state.isSidebarCollapsed;
  const renderedWidth = collapsed ? COLLAPSED_WIDTH : state.sidebarWidth;
  const activeAgent =
    state.agents.find((agent) => agent.id === state.activeAgentId) ?? null;
  const activeBotProfile = activeAgent?.isGroup
    ? activeAgent
    : (state.botProfiles.find(
        (profile) => profile.id === (activeAgent?.botId ?? activeAgent?.id),
      ) ?? activeAgent);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleAgents = state.agents
    .filter((agent) => {
      if (state.hiddenAgentIds.has(agent.id)) return false;
      if (!normalizedQuery) return true;
      return [
        agent.conversationTitle,
        agent.name,
        agent.title,
        agent.description,
        ...(agent.members?.map((member) => member.name) ?? []),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      if (Boolean(left.isPinned) !== Boolean(right.isPinned)) {
        return left.isPinned ? -1 : 1;
      }
      return right.lastActivityAt - left.lastActivityAt;
    });

  useEffect(() => {
    return () => {
      if (!previousBodyStyle.current) return;
      document.body.style.cursor = previousBodyStyle.current.cursor;
      document.body.style.userSelect = previousBodyStyle.current.userSelect;
    };
  }, []);

  useEffect(() => {
    if (!newMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (newMenuRef.current?.contains(event.target as Node)) return;
      setNewMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNewMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [newMenuOpen]);

  const finishResize = (pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (pointerId !== undefined && drag.pointerId !== pointerId) return;
    dragRef.current = null;
    actions.setPanelResizing(false);
    if (previousBodyStyle.current) {
      document.body.style.cursor = previousBodyStyle.current.cursor;
      document.body.style.userSelect = previousBodyStyle.current.userSelect;
      previousBodyStyle.current = null;
    }
  };

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startWidth: renderedWidth,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    previousBodyStyle.current = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    actions.setPanelResizing(true);
  };

  const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    actions.resizeSidebar(drag.startWidth + event.clientX - drag.startX);
  };

  const endResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishResize(event.pointerId);
  };

  const handleResizeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    let nextWidth: number | null = null;
    switch (event.key) {
      case "ArrowLeft":
        nextWidth = collapsed
          ? COLLAPSED_WIDTH
          : Math.max(
              SIDEBAR_COLLAPSE_AT_WIDTH - 1,
              state.sidebarWidth - RESIZE_STEP,
            );
        break;
      case "ArrowRight":
        nextWidth = collapsed
          ? SIDEBAR_EXPAND_AT_WIDTH
          : Math.min(SIDEBAR_MAX_WIDTH, state.sidebarWidth + RESIZE_STEP);
        break;
      case "Home":
        actions.setSidebarCollapsed(true);
        break;
      case "End":
        actions.resizeSidebar(SIDEBAR_MAX_WIDTH);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (nextWidth !== null) actions.resizeSidebar(nextWidth);
  };

  const focusSearch = () => {
    if (collapsed) actions.setSidebarCollapsed(false);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const openCompose = () => {
    setNewMenuOpen(false);
    if (collapsed) actions.setSidebarCollapsed(false);
    actions.openCompose();
  };

  const openGroup = () => {
    setNewMenuOpen(false);
    actions.openCreateGroup();
  };

  const openBot = () => {
    setNewMenuOpen(false);
    if (collapsed) actions.setSidebarCollapsed(false);
    actions.openCompose("bot");
  };

  const openSettings = () => {
    actions.openSettings(activeBotProfile?.id);
  };

  return (
    <div
      className="baby-grok-bot-sidebar-slot"
      data-collapsed={collapsed || undefined}
      style={{ width: renderedWidth }}
    >
      <aside
        aria-label="Agents"
        className="baby-grok-bot-sidebar"
        data-collapsed={collapsed || undefined}
        style={{ width: renderedWidth }}
      >
        <div className="baby-grok-bot-sidebar-header">
          <div className="baby-grok-bot-sidebar-header__lead">
            {!collapsed ? (
              <span className="truncate text-[13px] leading-4 font-medium tracking-[-0.1px] text-[color:var(--grok-bot-sidebar-text-primary)]">
                {state.content.appName}
              </span>
            ) : (
              <span className="flex size-6 items-center justify-center rounded-lg bg-[var(--grok-bot-sidebar-hover)] text-[11px] font-semibold text-[color:var(--grok-bot-sidebar-text-primary)]">
                {state.content.appName.slice(0, 1)}
              </span>
            )}
          </div>
          <div className="baby-grok-bot-sidebar-header__actions">
            {collapsed ? (
              <button
                aria-label="Search chats"
                className="baby-grok-bot-sidebar-header__action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
                onClick={focusSearch}
                title="Search chats"
                type="button"
              >
                <GrokBotIcon name="search" size={14} />
              </button>
            ) : null}
            <div className="relative" ref={newMenuRef}>
              <button
                aria-expanded={newMenuOpen}
                aria-haspopup="menu"
                aria-label="Open chat or create bot or group"
                className="baby-grok-bot-sidebar-header__action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
                onClick={() => setNewMenuOpen((open) => !open)}
                title="Open chat or create bot or group"
                type="button"
              >
                <GrokBotIcon name="plus" size={14} />
              </button>
              {newMenuOpen ? (
                <NewConversationMenu
                  collapsed={collapsed}
                  onNewChat={openCompose}
                  onNewBot={openBot}
                  onNewGroup={openGroup}
                />
              ) : null}
            </div>
            <button
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="baby-grok-bot-sidebar-header__action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
              onClick={() => actions.setSidebarCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              <GrokBotIcon
                className={cn(
                  "transition-transform motion-reduce:transition-none",
                  collapsed && "rotate-180",
                )}
                name="chevron-left"
                size={14}
              />
            </button>
          </div>
        </div>

        {!collapsed ? (
          <label className="baby-grok-bot-chat-search">
            <GrokBotIcon className="shrink-0" name="search" size={13} />
            <input
              aria-label="Search chats"
              className="baby-grok-bot-chat-search__input"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search chats"
              ref={searchRef}
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="flex size-5 shrink-0 items-center justify-center rounded-md hover:bg-[var(--grok-bot-sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                type="button"
              >
                <GrokBotIcon name="close" size={11} />
              </button>
            ) : null}
          </label>
        ) : null}

        <nav className="baby-grok-bot-sidebar-list min-h-0 flex-1 overflow-y-auto pb-2">
          <section aria-label="Chats">
            {visibleAgents.map((agent) => {
              const active = agent.id === state.activeAgentId;
              const onOpen = () => actions.openAgent(agent.id);
              const onContextMenu: MouseEventHandler<HTMLButtonElement> = (
                event,
              ) =>
                openAgentContextMenu(event, agent.id, actions.openContextMenu);
              const onKeyDown: KeyboardEventHandler<HTMLButtonElement> = (
                event,
              ) =>
                openAgentContextMenuFromKeyboard(
                  event,
                  agent.id,
                  actions.openContextMenu,
                );
              const ConversationRow = slots.conversationRow;

              return ConversationRow ? (
                <ConversationRow
                  active={active}
                  agent={agent}
                  collapsed={collapsed}
                  key={agent.id}
                  onContextMenu={onContextMenu}
                  onKeyDown={onKeyDown}
                  onOpen={onOpen}
                  onOpenMenu={actions.openContextMenu}
                />
              ) : (
                <AgentRow
                  active={active}
                  agent={agent}
                  collapsed={collapsed}
                  entered={state.recentlyRevealedIds.has(agent.id)}
                  key={agent.id}
                  onContextMenu={onContextMenu}
                  onKeyDown={onKeyDown}
                  onOpen={onOpen}
                />
              );
            })}
          </section>

          {visibleAgents.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] leading-5 text-[color:var(--grok-bot-sidebar-text-tertiary)]">
              No chats match "{query}".
            </div>
          ) : null}
        </nav>

        <footer className="baby-grok-bot-sidebar-footer">
          <button
            aria-expanded={state.isSettingsOpen}
            aria-label="Open agent settings"
            className="baby-grok-bot-sidebar-footer__action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
            disabled={!activeAgent}
            onClick={openSettings}
            title="Agent settings"
            type="button"
          >
            <GrokBotIcon name="gear" size={15} />
          </button>
          <button
            aria-label="Open private chat"
            className="baby-grok-bot-sidebar-footer__action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
            onClick={openCompose}
            title="Open private chat"
            type="button"
          >
            <GrokBotIcon name="plus" size={15} />
          </button>
          {!collapsed ? (
            <button
              className="baby-grok-bot-sidebar-footer__name ml-auto flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-[var(--grok-bot-sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
              onClick={openSettings}
              type="button"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-sidebar-selected)] text-[10px] font-medium">
                {state.content.viewer.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] leading-4 text-[color:var(--grok-bot-sidebar-text-primary)]">
                  {state.content.viewer.name}
                </span>
                <span className="block truncate text-[10px] leading-3 text-[color:var(--grok-bot-sidebar-text-tertiary)]">
                  Personal workspace
                </span>
              </span>
            </button>
          ) : null}
        </footer>
      </aside>

      <div
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuenow={Math.round(renderedWidth)}
        className="absolute top-0 right-0 bottom-0 z-30 w-2 translate-x-1/2 cursor-col-resize touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
        onDoubleClick={() => actions.setSidebarCollapsed(!collapsed)}
        onKeyDown={handleResizeKey}
        onPointerCancel={endResize}
        onPointerDown={beginResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        role="separator"
        tabIndex={0}
        title="Drag to resize"
      />
    </div>
  );
}

export default Sidebar;
