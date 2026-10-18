import { useEffect, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
  useActiveAgent,
  useActiveTranscript,
  useGrokBotSlots,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { ContextMenu } from "./ContextMenu";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { GrokBotDesktopPane } from "./GrokBotDesktopPane";
import { GrokBotScreenOverlay } from "./GrokBotScreenOverlay";
import { GrokBotTranscript } from "./GrokBotTranscript";
import { Sidebar } from "./Sidebar";

const COLLAPSED_WIDTH = 84;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

function isNativeContextTarget(target: Element): boolean {
  return Boolean(
    target.closest(
      'a[href], button, img, input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"], [data-native-context]',
    ),
  );
}

function transcriptEntryElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      ":scope > div > .baby-grok-bot-entry",
    ),
  );
}

function ComposeNewAgent() {
  const { state, actions } = useGrokBotStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = state.composeQuery;
  const isBotMode = state.composeMode === "bot";
  const normalizedQuery = query.trim().toLowerCase();
  const matches = state.botProfiles
    .filter((agent) =>
      normalizedQuery
        ? [agent.name, agent.title, agent.description]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedQuery))
        : true,
    )
    .slice(0, 12);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (isBotMode) {
      if (!query.trim()) {
        inputRef.current?.focus();
        return;
      }
      actions.createAgent(query);
      return;
    }

    if (matches[0]) {
      actions.createConversation(matches[0].botId ?? matches[0].id);
      return;
    }

    if (!query.trim()) {
      inputRef.current?.focus();
      return;
    }
    actions.setComposeMode("bot");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="baby-grok-bot-compose-header">
        <button
          aria-label="Close new conversation"
          className="baby-grok-bot-window-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
          onClick={actions.closeCompose}
          title="Close"
          type="button"
        >
          <GrokBotIcon name="chevron-left" size={14} />
        </button>
        <div className="baby-grok-bot-compose-field">
          <GrokBotIcon className="shrink-0" name="search" size={14} />
          <input
            aria-label={isBotMode ? "Create a new bot" : "Search bots"}
            className="min-w-0 flex-1 bg-transparent text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--cursor-text-primary)] outline-none placeholder:text-[color:var(--cursor-text-tertiary)]"
            onChange={(event) => actions.setComposeQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                actions.closeCompose();
              }
            }}
            placeholder={isBotMode ? "Name a new bot" : "Search bots"}
            ref={inputRef}
            value={query}
          />
        </div>
        <button
          className="baby-grok-bot-card-action"
          data-variant="primary"
          disabled={!query.trim()}
          onClick={submit}
          type="button"
        >
          {isBotMode ? "Create bot" : matches[0] ? "Open chat" : "New bot"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto flex max-w-[560px] flex-col gap-4">
          <div>
            <h2 className="text-[20px] leading-7 font-medium tracking-[-0.3px] text-[color:var(--cursor-text-primary)]">
              {isBotMode ? "Create a new bot" : "Open a private chat"}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[color:var(--cursor-text-secondary)]">
              {isBotMode
                ? "Create a bot profile. Its first private chat opens automatically."
                : "Choose a bot. It has one private chat entry."}
            </p>
          </div>

          {!isBotMode && matches.length > 0 ? (
            <div
              aria-label="Existing agents"
              className="baby-grok-bot-compose-results rounded-xl border-[0.5px] border-[var(--grok-bot-border-default)]"
              role="listbox"
            >
              {matches.map((agent) => (
                <button
                  className="baby-grok-bot-compose-result focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
                  key={agent.id}
                  onClick={() =>
                    actions.createConversation(agent.botId ?? agent.id)
                  }
                  role="option"
                  type="button"
                >
                  <AgentAvatar agent={agent} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-4 font-medium">
                      {agent.name}
                    </span>
                    <span className="block truncate text-[11px] leading-4 text-[color:var(--cursor-text-tertiary)]">
                      {agent.title ?? agent.description ?? "Agent"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] leading-4 text-[color:var(--cursor-text-tertiary)]">
                    Open
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <button
            className="baby-grok-bot-card-action mx-auto"
            data-variant="primary"
            disabled={isBotMode && !query.trim()}
            onClick={() =>
              isBotMode ? submit() : actions.setComposeMode("bot")
            }
            type="button"
          >
            <GrokBotIcon name="plus" size={13} />
            {isBotMode ? "Create bot" : "Create a new bot instead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DesktopShellProps {
  className?: string;
}

export function DesktopShell({ className }: DesktopShellProps) {
  const { state, actions } = useGrokBotStore();
  const slots = useGrokBotSlots();
  const agent = useActiveAgent();
  const transcript = useActiveTranscript();
  const ChatHeaderSlot = slots.chatHeader;
  const ComposerSlot = slots.composer;
  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = state.isSidebarCollapsed
    ? COLLAPSED_WIDTH
    : state.sidebarWidth;
  const paneWidth = state.isDesktopPaneOpen ? state.desktopPaneWidth : 0;

  const openMessageMenu = (entryId: string, x: number, y: number) => {
    actions.openContextMenu({
      target: { kind: "message", agentId: state.activeAgentId, entryId },
      x,
      y,
    });
  };

  const handleChatContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element) || isNativeContextTarget(target)) return;

    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      selection.anchorNode &&
      event.currentTarget.contains(selection.anchorNode)
    ) {
      return;
    }

    const entryElement = target.closest<HTMLElement>(
      ".baby-grok-bot-entry",
    );
    const transcriptRoot = entryElement?.closest<HTMLElement>('[role="log"]');
    if (!entryElement || !transcriptRoot) return;

    const entryIndex =
      transcriptEntryElements(transcriptRoot).indexOf(entryElement);
    const entry = transcript[entryIndex];
    if (!entry) return;

    event.preventDefault();
    openMessageMenu(entry.id, event.clientX, event.clientY);
  };

  const handleChatKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (
      !((event.shiftKey && event.key === "F10") || event.key === "ContextMenu")
    ) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && isNativeContextTarget(target)) return;

    const transcriptRoot =
      event.currentTarget.querySelector<HTMLElement>('[role="log"]');
    if (!transcriptRoot || transcript.length === 0) return;

    let entryElement: HTMLElement | null = null;
    const activeElement = document.activeElement;
    if (activeElement instanceof Element) {
      entryElement = activeElement.closest<HTMLElement>(
        ".baby-grok-bot-entry",
      );
    }

    const entryElements = transcriptEntryElements(transcriptRoot);
    if (!entryElement || !transcriptRoot.contains(entryElement)) {
      const rootRect = transcriptRoot.getBoundingClientRect();
      entryElement =
        entryElements.find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.bottom >= rootRect.top && rect.top <= rootRect.bottom;
        }) ??
        entryElements.at(-1) ??
        null;
    }

    if (!entryElement) return;
    const entryIndex = entryElements.indexOf(entryElement);
    const entry = transcript[entryIndex];
    if (!entry) return;

    event.preventDefault();
    const rect = entryElement.getBoundingClientRect();
    openMessageMenu(
      entry.id,
      Math.min(Math.max(16, rect.right - 16), window.innerWidth - 16),
      Math.min(Math.max(16, rect.top + 34), window.innerHeight - 16),
    );
  };

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const syncWidth = (width: number) => {
      if (width > 0) actions.setShellWidth(width);
    };
    syncWidth(shell.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      const onWindowResize = () =>
        syncWidth(shell.getBoundingClientRect().width);
      window.addEventListener("resize", onWindowResize);
      return () => window.removeEventListener("resize", onWindowResize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) syncWidth(entry.contentRect.width);
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, [actions]);

  return (
    <div
      className={cn(
        "baby-grok-bot-shell",
        !state.isPanelResizing &&
          "transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
      data-panel-resizing={state.isPanelResizing || undefined}
      ref={shellRef}
      style={{
        gridTemplateColumns: `${sidebarWidth}px minmax(0,1fr) ${paneWidth}px`,
      }}
    >
      <Sidebar />

      <section
        aria-label={state.isComposingNew ? "New agent" : "Chat"}
        className="baby-grok-bot-chat"
        onContextMenu={handleChatContextMenu}
        onKeyDown={handleChatKeyDown}
      >
        {state.isComposingNew ? (
          <ComposeNewAgent />
        ) : (
          <>
            {ChatHeaderSlot ? (
              <ChatHeaderSlot
                agent={agent}
                content={state.content}
                surface="desktop"
              />
            ) : (
              <ChatHeader />
            )}
            <div className="min-h-0 flex-1 overflow-hidden">
              <GrokBotTranscript
                composingBeat={agent?.composingBeat}
                entries={transcript}
                isAgentComposing={agent?.isComposingMessage ?? false}
              />
            </div>
            {ComposerSlot ? (
              <ComposerSlot agent={agent} surface="desktop">
                <Composer />
              </ComposerSlot>
            ) : (
              <Composer />
            )}
          </>
        )}
      </section>

      <GrokBotDesktopPane />

      <GrokBotScreenOverlay />
      <CreateGroupDialog />
      <ContextMenu />
    </div>
  );
}

export default DesktopShell;
