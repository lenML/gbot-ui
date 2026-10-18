import type {
  GrokBotAgent,
  GrokBotTranscriptEntry,
} from "../../lib/grok-bot/types";
import {
  useGrokBotActions,
  useGrokBotSlots,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import { AgentAvatar } from "./AgentAvatar";
import { GrokBotTranscript } from "./GrokBotTranscript";
import { MobileComposer } from "./MobileComposer";

export interface MobileChatProps {
  agent: GrokBotAgent;
  agents: GrokBotAgent[];
  entries: GrokBotTranscriptEntry[];
  onBack: () => void;
}


export function MobileChat({
  agent,
  agents,
  entries,
  onBack,
}: MobileChatProps) {
  const state = useGrokBotStore();
  const actions = useGrokBotActions();
  const slots = useGrokBotSlots();
  const ChatHeaderSlot = slots.chatHeader;
  const ComposerSlot = slots.composer;
  const screenOpen =
    state.screenOverlay?.origin.kind === "agent" &&
    state.screenOverlay.origin.agentId === agent.id;

  const toggleScreen = () => {
    if (screenOpen) {
      actions.closeScreen();
      return;
    }
    actions.openScreen({ kind: "agent", agentId: agent.id }, "agent");
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-[var(--cursor-bg-editor)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[var(--cursor-bg-editor)] to-transparent"
      />

      {ChatHeaderSlot ? (
        <ChatHeaderSlot
          agent={agent}
          content={state.content}
          onBack={onBack}
          surface="mobile"
        />
      ) : (
      <header className="absolute inset-x-3 top-0 z-20 flex h-12 items-center justify-between gap-2">
        <button
          aria-label="Back to chats"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--grok-bot-bg-elevated)] text-[color:var(--cursor-text-secondary)] shadow-sm backdrop-blur-xl hover:text-[color:var(--cursor-text-primary)]"
          onClick={onBack}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="15"
            viewBox="0 0 16 16"
            width="15"
          >
            <path
              d="m9.75 3.25-4.5 4.75 4.5 4.75"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>

        <div className="baby-grok-bot-agent-title-pill flex h-8 min-w-0 items-center gap-2 rounded-full border-[0.5px] border-[var(--grok-bot-border-default)] pr-3 pl-1 shadow-sm backdrop-blur-xl">
          <AgentAvatar
            agent={agent}
            size={22}
            unread={false}
            working={agent.isRunning || agent.isComposingMessage}
          />
          <span
            className="min-w-0 truncate text-[13px] leading-4 font-medium tracking-[-0.15px] text-[color:var(--cursor-text-primary)]"
            title={agent.status?.label}
          >
            {agent.name}
          </span>
        </div>

        {agent.isGroup ? (
          <span aria-hidden="true" className="size-8 shrink-0" />
        ) : (
          <button
            aria-label={`Open ${agent.name}'s screen`}
            aria-pressed={screenOpen}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-[0.5px] border-[var(--grok-bot-border-default)] bg-[var(--grok-bot-bg-elevated)] text-[color:var(--cursor-text-secondary)] shadow-sm backdrop-blur-xl hover:text-[color:var(--cursor-text-primary)] aria-pressed:bg-[var(--grok-bot-bg-active)] aria-pressed:text-[color:var(--cursor-text-primary)]"
            onClick={toggleScreen}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="15"
              viewBox="0 0 16 16"
              width="15"
            >
              <rect
                height="9"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                width="12"
                x="2"
                y="3.5"
              />
              <path
                d="M6.25 14h3.5M8 12.5V14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.3"
              />
            </svg>
          </button>
        )}
      </header>
      )}

      <GrokBotTranscript
        className="px-4 pt-14 pb-24"
        composingBeat={agent.composingBeat}
        entries={entries}
        isAgentComposing={agent.isComposingMessage}
      />

      {ComposerSlot ? (
        <ComposerSlot agent={agent} surface="mobile">
          <MobileComposer
            agentId={agent.id}
            agentName={agent.name}
            agents={agents}
            isGroupChat={agent.isGroup}
          />
        </ComposerSlot>
      ) : (
        <MobileComposer
          agentId={agent.id}
          agentName={agent.name}
          agents={agents}
          isGroupChat={agent.isGroup}
        />
      )}
    </div>
  );
}