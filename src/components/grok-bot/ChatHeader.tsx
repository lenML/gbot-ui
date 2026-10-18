import {
  useActiveAgent,
  useGrokBotContent,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function ChatHeader() {
  const agent = useActiveAgent();
  const content = useGrokBotContent();
  const { state, actions } = useGrokBotStore();
  const isWorking = Boolean(agent?.isRunning || agent?.isComposingMessage);
  const isScreenOpen =
    state.screenOverlay?.origin.kind === "agent" &&
    state.screenOverlay.origin.agentId === agent?.id;

  const openScreen = () => {
    if (!agent) return;
    actions.openScreen({ kind: "agent", agentId: agent.id }, "agent");
  };

  return (
    <header className="baby-grok-bot-compose-header shrink-0">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[12px] leading-4 text-[color:var(--cursor-text-tertiary)]">
          {content.appName}
        </span>
      </div>

      <div className="baby-grok-bot-agent-title-pill flex h-8 min-w-0 max-w-[min(420px,54vw)] items-center gap-2 rounded-full pr-3 pl-1">
        <AgentAvatar
          agent={agent ?? undefined}
          name={agent?.name ?? "Agent"}
          size={22}
          working={isWorking}
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-4 font-medium tracking-[-0.15px] text-[color:var(--cursor-text-primary)]">
            {agent?.name ?? "No agent"}
          </span>
        </span>
      </div>

      <div
        aria-live="polite"
        className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[11px] leading-4 text-[color:var(--cursor-text-tertiary)]"
      >
        {agent?.status ? (
          <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
            <GrokBotIcon className="shrink-0" name={agent.status.icon} size={12} />
            <span className="truncate">{agent.status.label}</span>
          </span>
        ) : isWorking ? (
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="baby-grok-bot-typing-dot scale-75" />
            <span>
              {agent?.isComposingMessage
                ? agent.composingBeat?.label ?? "Working"
                : "Working"}
            </span>
          </span>
        ) : null}

        <button
          aria-label={state.isDesktopPaneOpen ? "Hide desktop pane" : "Show desktop pane"}
          aria-pressed={state.isDesktopPaneOpen}
          className={cn(
            "baby-grok-bot-window-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]",
            state.isDesktopPaneOpen &&
              "bg-[var(--cursor-bg-active)] text-[color:var(--cursor-text-primary)]",
          )}
          onClick={() => actions.setDesktopPaneOpen(!state.isDesktopPaneOpen)}
          title={state.isDesktopPaneOpen ? "Hide desktop" : "Show desktop"}
          type="button"
        >
          <GrokBotIcon name="device-desktop" size={14} />
        </button>

        <button
          aria-label={`Open ${agent?.name ?? "agent"} screen`}
          aria-pressed={isScreenOpen}
          className={cn(
            "baby-grok-bot-window-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]",
            isScreenOpen &&
              "bg-[var(--cursor-bg-active)] text-[color:var(--cursor-text-primary)]",
          )}
          disabled={!agent}
          onClick={openScreen}
          title="Open screen"
          type="button"
        >
          <GrokBotIcon name="arrow-right-up" size={14} />
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;
