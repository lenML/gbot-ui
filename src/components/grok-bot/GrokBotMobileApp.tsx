import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { BabyGrokBot } from "../BabyGrokBot";
import { useGrokBotActions, useGrokBotStore } from "../../lib/grok-bot/store";
import { useResolvedBabyGrokBotTheme } from "../../lib/theme";
import { ContextMenu } from "./ContextMenu";
import { CreateConversationSheet } from "./CreateConversationSheet";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { GrokBotIcon } from "./AgentAvatar";
import { GrokBotScreenOverlay } from "./GrokBotScreenOverlay";
import { MobileChat } from "./MobileChat";
import { MobileChatList } from "./MobileChatList";

type MobileScreen = "list" | "chat";

type MobileViewportStyle = CSSProperties & {
  "--grok-bot-mobile-viewport-height": string;
  "--grok-bot-mobile-viewport-top": string;
};

interface MobileViewportMetrics {
  height: number | null;
  offsetTop: number;
}

function useMobileViewport(): MobileViewportMetrics {
  const [metrics, setMetrics] = useState<MobileViewportMetrics>(() => {
    if (typeof window === "undefined") {
      return { height: null, offsetTop: 0 };
    }

    return {
      height: window.visualViewport?.height ?? null,
      offsetTop: window.visualViewport?.offsetTop ?? 0,
    };
  });

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;
    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setMetrics({
          height: viewport.height,
          offsetTop: viewport.offsetTop,
        });
      });
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return metrics;
}

export interface GrokBotMobileAppProps {
  className?: string;
  initialScreen?: MobileScreen;
}

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function GrokBotMobileApp({
  className,
  initialScreen = "list",
}: GrokBotMobileAppProps) {
  const state = useGrokBotStore();
  const actions = useGrokBotActions();
  const resolvedTheme = useResolvedBabyGrokBotTheme(state.theme);
  const [screen, setScreen] = useState<MobileScreen>(initialScreen);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const visibleAgents = state.agents.filter(
    (agent) => !state.hiddenAgentIds.has(agent.id),
  );
  const activeAgent =
    visibleAgents.find((agent) => agent.id === state.activeAgentId) ??
    visibleAgents[0];
  const activeEntries = activeAgent
    ? (state.transcripts[activeAgent.id] ?? [])
    : [];
  const composeMatches = state.botProfiles.filter((agent) => {
    const query = state.composeQuery.trim().toLowerCase();
    return (
      !query ||
      [agent.name, agent.title, agent.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  });

  const openAgent = (agentId: string) => {
    setIsCreateMenuOpen(false);
    actions.openAgent(agentId);
    setScreen("chat");
  };

  const backToList = () => {
    setIsCreateMenuOpen(false);
    actions.closeScreen();
    setScreen("list");
  };

  const openCreateMenu = () => {
    setScreen("list");
    setIsCreateMenuOpen(true);
  };

  const openNewChat = () => {
    setIsCreateMenuOpen(false);
    setScreen("list");
    actions.openCompose("chat");
  };

  const openNewBot = () => {
    setIsCreateMenuOpen(false);
    setScreen("list");
    actions.openCompose("bot");
  };

  const openNewGroup = () => {
    setIsCreateMenuOpen(false);
    setScreen("list");
    actions.openCreateGroup();
  };

  const handleGroupCreated = () => {
    setIsCreateMenuOpen(false);
    setScreen("chat");
  };

  const submitCompose = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.composeMode === "bot") {
      const name = state.composeQuery.trim();
      if (!name) return;
      actions.createAgent(name);
      setScreen("chat");
      return;
    }
    const bot = composeMatches[0];
    if (!bot) return;
    actions.createConversation(bot.botId ?? bot.id);
    setScreen("chat");
  };

  const viewport = useMobileViewport();
  const viewportStyle: MobileViewportStyle = {
    "--grok-bot-mobile-viewport-height":
      viewport.height === null ? "100dvh" : `${viewport.height}px`,
    "--grok-bot-mobile-viewport-top": `${viewport.offsetTop}px`,
  };

  return (
    <div
      className={cn(
        "baby-grok-bot-mobile-root fixed left-0 right-0 z-50 overflow-hidden bg-[var(--grok-bot-bg-editor)]",
        className,
      )}
      data-grok-bot-mobile-app=""
      data-mobile-screen={screen}
      style={viewportStyle}
    >
      <BabyGrokBot
        agentName={activeAgent?.name ?? state.content.appName}
        className="absolute inset-0 h-full min-h-0 w-full"
        theme={state.theme}
        inert={false}
      >
        <div className="baby-grok-bot-mobile-surface relative h-full min-h-0 w-full overflow-hidden">
          <div className="baby-grok-bot-mobile-screen h-full min-h-0">
            {screen === "list" ? (
              <div className="baby-grok-bot-mobile-list-screen h-full min-h-0">
                <MobileChatList
                  activeAgentId={activeAgent?.id}
                  agents={visibleAgents}
                  animatedPinned={state.recentlyRevealedIds.size > 0}
                  onOpenAgent={openAgent}
                  isDark={resolvedTheme === "cursor-dark"}
                  onOpenCreate={openCreateMenu}
                  onOpenMenu={actions.openContextMenu}
                  onToggleTheme={() =>
                    actions.setTheme(
                      resolvedTheme === "cursor-dark"
                        ? "cursor-light"
                        : "cursor-dark",
                    )
                  }
                  title={state.content.appName}
                  viewer={state.content.viewer}
                />
              </div>
            ) : activeAgent ? (
              <div className="baby-grok-bot-mobile-chat-screen h-full min-h-0">
                <MobileChat
                  agent={activeAgent}
                  agents={state.botProfiles}
                  entries={activeEntries}
                  onBack={backToList}
                />
              </div>
            ) : null}
          </div>

          {state.isComposingNew && screen === "list" ? (
            <form
              className="baby-grok-bot-mobile-new-agent absolute inset-0 z-30 flex flex-col bg-[color:var(--grok-bot-bg-editor)]/95 px-5 pt-16 backdrop-blur-xl"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  actions.closeCompose();
                }
              }}
              onSubmit={submitCompose}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] leading-6 font-medium tracking-[-0.25px]">
                    {state.composeMode === "bot" ? "New bot" : "Private chat"}
                  </h2>
                  <p className="mt-1 text-[13px] leading-[18px] text-[color:var(--cursor-text-tertiary)]">
                    {state.composeMode === "bot"
                      ? "Create a reusable bot profile and its first private chat."
                      : "Choose a bot. It has one private chat entry."}
                  </p>
                </div>
                <button
                  aria-label="Close new conversation"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-bg-tertiary)] text-[18px] leading-none text-[color:var(--cursor-text-secondary)]"
                  onClick={() => actions.closeCompose()}
                  type="button"
                >
                  <GrokBotIcon name="close" size={14} />
                </button>
              </div>

              <input
                autoFocus
                className="mt-5 h-11 w-full rounded-2xl border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--cursor-bg-elevated)] px-4 text-[15px] outline-none placeholder:text-[color:var(--cursor-text-tertiary)] focus:border-[color:color-mix(in_srgb,var(--grok-bot-current-agent-accent)_55%,transparent)]"
                onChange={(event) =>
                  actions.setComposeQuery(event.target.value)
                }
                placeholder={
                  state.composeMode === "bot" ? "Bot name" : "Search bots"
                }
                value={state.composeQuery}
              />

              {state.composeMode === "chat" ? (
                <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
                  {composeMatches.map((bot) => (
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-[var(--grok-bot-bg-hover)]"
                      key={bot.id}
                      onClick={() => {
                        actions.createConversation(bot.botId ?? bot.id);
                        setScreen("chat");
                      }}
                      type="button"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-current-agent-tint)] text-[12px] font-medium text-[var(--grok-bot-current-agent-accent)]">
                        {bot.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] leading-5">
                          {bot.name}
                        </span>
                        <span className="block truncate text-[12px] leading-4 text-[color:var(--cursor-text-tertiary)]">
                          {bot.title ?? "Open private chat"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                className="mt-3 h-11 shrink-0 rounded-full bg-[var(--grok-bot-fill-emphasis)] text-[14px] font-medium text-[var(--grok-bot-bubble-user-ink)] disabled:opacity-40"
                disabled={
                  state.composeMode === "bot"
                    ? !state.composeQuery.trim()
                    : composeMatches.length === 0
                }
                type="submit"
              >
                {state.composeMode === "bot" ? "Create bot" : "Open chat"}
              </button>
              {state.composeMode === "chat" ? (
                <button
                  className="mt-2 h-10 shrink-0 text-[13px] font-medium text-[color:var(--cursor-text-secondary)]"
                  onClick={() => actions.setComposeMode("bot")}
                  type="button"
                >
                  Create a new bot instead
                </button>
              ) : null}
            </form>
          ) : null}

          <CreateConversationSheet
            onCreateChat={openNewChat}
            onCreateBot={openNewBot}
            onCreateGroup={openNewGroup}
            onClose={() => setIsCreateMenuOpen(false)}
            open={isCreateMenuOpen && screen === "list"}
          />
          <CreateGroupDialog
            onCreated={handleGroupCreated}
            presentation="sheet"
          />
          <GrokBotScreenOverlay />
          <ContextMenu />
        </div>
      </BabyGrokBot>
    </div>
  );
}
