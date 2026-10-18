import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useGrokBotStore } from "../../lib/grok-bot/store";
import type {
  GrokBotContextMenuState,
  GrokBotContextMenuTarget,
  GrokBotTranscriptEntry,
} from "../../lib/grok-bot/types";

const MENU_MARGIN = 8;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface ContextMenuAction {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
}

export interface ContextMenuProps {
  className?: string;
}

export interface OpenGrokBotContextMenuInput {
  target: GrokBotContextMenuTarget;
  x: number;
  y: number;
}

export function openGrokBotContextMenu(
  listener: (menu: GrokBotContextMenuState) => void,
  input: OpenGrokBotContextMenuInput,
) {
  listener(input);
}

export function openAgentContextMenu(
  event: ReactMouseEvent<HTMLElement>,
  agentId: string,
  listener: (menu: GrokBotContextMenuState) => void,
) {
  event.preventDefault();
  event.currentTarget.focus({ preventScroll: true });
  listener({
    target: { kind: "agent", agentId },
    x: event.clientX,
    y: event.clientY,
  });
}

export function openAgentContextMenuFromKeyboard(
  event: ReactKeyboardEvent<HTMLElement>,
  agentId: string,
  listener: (menu: GrokBotContextMenuState) => void,
) {
  if (!(event.shiftKey && event.key === "F10") && event.key !== "ContextMenu") {
    return false;
  }

  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  listener({
    target: { kind: "agent", agentId },
    x: Math.min(rect.right - 8, window.innerWidth - 16),
    y: Math.min(rect.top + 28, window.innerHeight - 16),
  });
  return true;
}

export function entryMenuText(entry: GrokBotTranscriptEntry): string {
  switch (entry.kind) {
    case "message":
      return entry.content;
    case "send-message":
      return entry.message.content;
    case "system":
      return `System event: ${entry.event.type}`;
    case "multiple-choice":
      return entry.question;
    case "computer-use":
      return [entry.instruction, entry.ask].filter(Boolean).join("\n");
    case "pull-request":
      return [entry.title, entry.repository, entry.url]
        .filter(Boolean)
        .join("\n");
    case "outbound-message":
      return [entry.subject, entry.body].filter(Boolean).join("\n\n");
  }
}

async function copyText(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall through to the selection fallback.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function quoteForReply(value: string): string {
  return `> ${value.replace(/\n/g, "\n> ")}\n\n`;
}

function ContextMenuItem({
  action,
  onSelect,
}: {
  action: ContextMenuAction;
  onSelect: () => void;
}) {
  return (
    <>
      {action.separatorBefore ? (
        <div className="baby-grok-bot-context-menu__separator" />
      ) : null}
      <button
        className="baby-grok-bot-context-menu__item"
        data-danger={action.danger || undefined}
        disabled={action.disabled}
        onClick={onSelect}
        role="menuitem"
        tabIndex={-1}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {action.label}
        </span>
        {action.shortcut ? (
          <span className="baby-grok-bot-context-menu__shortcut">
            {action.shortcut}
          </span>
        ) : null}
      </button>
    </>
  );
}

export function ContextMenu({ className }: ContextMenuProps) {
  const { state, actions } = useGrokBotStore();
  const contextMenu = state.contextMenu;
  const hostRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });

  useLayoutEffect(() => {
    const host = hostRef.current;
    setPortalTarget(host?.closest<HTMLElement>(".baby-grok-bot") ?? null);
  }, []);

  useLayoutEffect(() => {
    if (!contextMenu) {
      setPosition({ left: 0, top: 0, ready: false });
      return;
    }

    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const left = Math.max(
      MENU_MARGIN,
      Math.min(contextMenu.x, window.innerWidth - rect.width - MENU_MARGIN),
    );
    const top = Math.max(
      MENU_MARGIN,
      Math.min(contextMenu.y, window.innerHeight - rect.height - MENU_MARGIN),
    );
    setPosition({ left, top, ready: true });
  }, [contextMenu]);

  const target = contextMenu?.target ?? null;
  const agent =
    target?.kind === "agent" || target?.kind === "message"
      ? (state.agents.find((candidate) => candidate.id === target.agentId) ??
        null)
      : null;
  const messageEntry =
    target?.kind === "message"
      ? (state.transcripts[target.agentId]?.find(
          (entry) => entry.id === target.entryId,
        ) ?? null)
      : null;

  const close = (restoreFocus = true) => {
    const returnTarget = focusReturnRef.current;
    actions.closeContextMenu();
    if (restoreFocus) {
      queueMicrotask(() => {
        if (returnTarget?.isConnected)
          returnTarget.focus({ preventScroll: true });
      });
    }
  };

  useEffect(() => {
    if (!contextMenu) return;

    const active = document.activeElement;
    focusReturnRef.current = active instanceof HTMLElement ? active : null;
    const frame = requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".baby-grok-bot-context-menu")) return;
      close(true);
    };
    const handleViewportChange = () => close(true);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [contextMenu, actions]);

  if (!contextMenu) {
    return <span aria-hidden="true" className="hidden" ref={hostRef} />;
  }

  const menuActions: ContextMenuAction[] = [];
  let label = "Actions";

  if (target?.kind === "agent") {
    label = agent?.isGroup ? "Group actions" : "Chat actions";
    if (agent) {
      menuActions.push({
        id: "open",
        label: "Open chat",
        onSelect: () => actions.openAgent(agent.id),
      });
      menuActions.push({
        id: "settings",
        label: agent.isGroup ? "Group info" : "Edit profile",
        shortcut: "Enter",
        onSelect: () => {
          actions.openAgent(agent.id);
          actions.openSettings(
            agent.isGroup ? agent.id : (agent.botId ?? agent.id),
          );
        },
      });
      menuActions.push({
        id: "copy-id",
        label: "Copy conversation ID",
        separatorBefore: true,
        onSelect: () => void copyText(agent.id),
      });
      if (agent.isGroup) {
        menuActions.push({
          id: "members",
          label: `${agent.memberIds.length} group members`,
          disabled: true,
          onSelect: () => undefined,
        });
      }
      menuActions.push({
        id: "pin",
        label: agent.isPinned ? "Unpin" : "Pin",
        separatorBefore: true,
        onSelect: () => actions.setAgentPinned(agent.id, !agent.isPinned),
      });
      menuActions.push({
        id: "unread",
        label: agent.hasUnread ? "Mark read" : "Mark unread",
        onSelect: () => actions.setAgentUnread(agent.id, !agent.hasUnread),
      });
      menuActions.push({
        id: "hide",
        label: agent.isGroup ? "Hide group" : "Hide chat",
        separatorBefore: true,
        onSelect: () => actions.hideAgent(agent.id),
      });
      menuActions.push({
        id: "delete",
        label: agent.isGroup ? "Delete group" : "Delete chat",
        danger: true,
        onSelect: () => actions.deleteAgent(agent.id),
      });
    }
  } else if (target?.kind === "message" && messageEntry) {
    label = agent?.isGroup ? "Group message" : "Message";
    menuActions.push({
      id: "copy-message",
      label: "Copy message",
      shortcut: "Ctrl C",
      onSelect: () => void copyText(entryMenuText(messageEntry)),
    });
    menuActions.push({
      id: "reply",
      label: "Reply",
      onSelect: () =>
        actions.setScriptedComposerText(
          quoteForReply(entryMenuText(messageEntry)),
        ),
    });

    if (messageEntry.kind === "computer-use") {
      menuActions.push({
        id: "open-screen",
        label: "Open computer screen",
        separatorBefore: true,
        onSelect: () => actions.openComputerScreen(messageEntry.id),
      });
      if (
        messageEntry.status === "action-needed" ||
        messageEntry.status === "working"
      ) {
        menuActions.push({
          id: "take-over",
          label: "Take over computer",
          onSelect: () => actions.takeOverComputer(messageEntry.id),
        });
      }
    } else if (messageEntry.kind === "outbound-message") {
      if (
        messageEntry.status === "ready" ||
        messageEntry.status === "sending"
      ) {
        menuActions.push({
          id: "send-message",
          label: "Send now",
          separatorBefore: true,
          onSelect: () => actions.sendOutboundMessage(messageEntry.id),
        });
      }
      menuActions.push({
        id: "discard-message",
        label: "Discard",
        danger: true,
        onSelect: () => actions.discardOutboundMessage(messageEntry.id),
      });
    } else if (messageEntry.kind === "pull-request" && messageEntry.url) {
      menuActions.push({
        id: "copy-pr-url",
        label: "Copy pull request URL",
        separatorBefore: true,
        onSelect: () => void copyText(messageEntry.url ?? ""),
      });
    }

    if (messageEntry.source?.kind === "agent") {
      const sourceAgent = state.botProfiles.find(
        (candidate) => candidate.id === messageEntry.source?.id,
      );
      if (sourceAgent) {
        menuActions.push({
          id: "source-settings",
          label: `Open ${sourceAgent.name} settings`,
          separatorBefore: true,
          onSelect: () => actions.openSettings(sourceAgent.id),
        });
      }
    }
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = Math.max(
      0,
      items.indexOf(document.activeElement as HTMLButtonElement),
    );
    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      case "Tab":
        close(false);
        return;
      default:
        return;
    }

    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const menu = (
    <div
      aria-label={label}
      className={cn("baby-grok-bot-context-menu", className)}
      data-ready={position.ready || undefined}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={handleMenuKeyDown}
      ref={menuRef}
      role="menu"
      style={{ left: position.left, top: position.top }}
    >
      <div className="baby-grok-bot-context-menu__label">{label}</div>
      {menuActions.length > 0 ? (
        menuActions.map((action) => (
          <ContextMenuItem
            action={action}
            key={action.id}
            onSelect={() => {
              if (action.disabled) return;
              action.onSelect();
              close(true);
            }}
          />
        ))
      ) : (
        <div className="baby-grok-bot-context-menu__empty">
          No actions available
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(menu, portalTarget) : menu;
}

export default ContextMenu;
