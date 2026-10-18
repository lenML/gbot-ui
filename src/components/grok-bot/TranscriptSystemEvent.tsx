import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { getAgentPalette } from "../../lib/types";
import type { AgentHue } from "../../lib/types";
import type {
  GrokBotActions,
  GrokBotContent,
  GrokBotSystemEvent,
 } from "../../lib/grok-bot/types";
import { useOptionalGrokBotActions } from "../../lib/grok-bot/store";
import { GrokBotMark } from "../GrokBotMark";

const ROW_CLASS =
  "flex min-w-0 items-center justify-center gap-1.5 overflow-hidden py-1 text-[13px] leading-4";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function getGrokBotActionsFromStore(store: unknown): GrokBotActions | null {
  if (!isRecord(store)) return null;

  return isRecord(store.actions)
    ? (store.actions as unknown as GrokBotActions)
    : (store as unknown as GrokBotActions);
}

export function getGrokBotContentFromStore(store: unknown): GrokBotContent | null {
  if (!isRecord(store)) return null;

  const state = isRecord(store.state) ? store.state : null;
  const content = state?.content ?? store.content;

  return isRecord(content) ? (content as unknown as GrokBotContent) : null;
}

export function formatSystemEvent(event: GrokBotSystemEvent): {
  lead: string;
  target: string;
} {
  switch (event.type) {
    case "messaged-agents":
      return {
        lead: "Messaged",
        target:
          event.targets.length === 1
            ? event.targets[0]?.name ?? "an agent"
            : `${event.targets.length} agents`,
      };
    case "renamed":
      return { lead: "Renamed to", target: event.name };
    case "created-routine":
      return { lead: "Created routine", target: event.name };
    case "memory-updated":
      return { lead: "Updated memory for", target: event.agent.name };
    case "shared-context":
      return { lead: `${event.source.name} shared`, target: event.summary };
    case "received-context": {
      const names = event.sources.map((source) => source.name);
      const target =
        names.length < 2
          ? names[0] ?? ""
          : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
      return { lead: "Messages from", target };
    }
  }
}

interface AgentTarget {
  name: string;
  hue?: AgentHue;
}

function AgentAvatar({ target, size = 12 }: { target: AgentTarget; size?: number }) {
  const palette = getAgentPalette(target.name, target.hue);

  return (
    <span
      aria-hidden="true"
      className="grok-bot-lazy grok-bot-mark--fill"
      style={{ width: size, height: size }}
    >
      <GrokBotMark
        background="var(--grok-bot-bg-editor, #ffffff)"
        foreground={palette.avatar}
      />
    </span>
  );
}

function AgentPill({
  target,
  store,
}: {
  target: AgentTarget;
  store: unknown;
}) {
  const palette = getAgentPalette(target.name, target.hue);
  const actions = getGrokBotActionsFromStore(store);
  const content = getGrokBotContentFromStore(store);
  const agentId = content?.agents.find(
    (agentContent) => agentContent.agent.name === target.name,
  )?.agent.id;

  const children = (
    <>
      <AgentAvatar target={target} />
      <span className="truncate">{target.name}</span>
    </>
  );

  if (!actions || !agentId) {
    return <span className="baby-grok-bot-system-agent">{children}</span>;
  }

  return (
    <button
      aria-label={`Open ${target.name}`}
      className="baby-grok-bot-system-agent"
      onClick={() => actions.openAgent(agentId)}
      style={
        {
          "--grok-bot-system-agent-pill": palette.pillBackground,
          "--grok-bot-system-agent-ink": palette.pillForeground,
        } as CSSProperties
      }
      type="button"
    >
      {children}
    </button>
  );
}

function AgentStack({ targets }: { targets: AgentTarget[] }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {targets.slice(0, 3).map((target, index) => (
        <span
          className="relative rounded-full"
          key={`${target.name}-${index}`}
          style={{
            boxShadow: "0 0 0 1.5px var(--cursor-bg-elevated)",
            marginLeft: index > 0 ? -3.6 : 0,
            zIndex: index + 1,
          }}
        >
          <AgentAvatar target={target} />
        </span>
      ))}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height="15"
      viewBox="0 0 16 16"
      width="15"
    >
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 5.1V8l2 1.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function Row({
  children,
  eventType,
}: {
   children: ReactNode;
  eventType: string;
}) {
  return (
    <div
      className={ROW_CLASS}
      data-event-type={eventType}
      role="status"
      style={{ color: "var(--cursor-text-secondary)" }}
    >
      {children}
    </div>
  );
}

export interface TranscriptSystemEventProps {
  event: GrokBotSystemEvent;
}

export function TranscriptSystemEvent({ event }: TranscriptSystemEventProps) {
  const store = useOptionalGrokBotActions();

  if (event.type === "memory-updated") {
    return (
      <Row eventType={event.type}>
        <span className="shrink-0">Updated memory for</span>
        <AgentPill store={store} target={event.agent} />
      </Row>
    );
  }

  if (event.type === "renamed") {
    return (
      <Row eventType={event.type}>
        <span className="truncate">Renamed to {event.name}</span>
      </Row>
    );
  }

  if (event.type === "received-context") {
    return (
      <Row eventType={event.type}>
        <span className="shrink-0">Messages from</span>
        {event.sources.map((source, index) => (
          <Fragment key={`${source.name}-${index}`}>
            {index > 0 ? <span className="shrink-0">and</span> : null}
            <AgentPill store={store} target={source} />
          </Fragment>
        ))}
      </Row>
    );
  }

  if (event.type === "shared-context") {
    return (
      <Row eventType={event.type}>
        <AgentPill store={store} target={event.source} />
        <span className="shrink-0">shared</span>
        <span
          className="truncate"
          style={{ color: "var(--cursor-text-primary)" }}
        >
          {event.summary}
        </span>
      </Row>
    );
  }

  if (event.type === "messaged-agents" && event.targets.length === 1) {
    return (
      <Row eventType={event.type}>
        <span className="shrink-0">Messaged</span>
        <AgentPill store={store} target={event.targets[0]} />
      </Row>
    );
  }

  const { lead, target } = formatSystemEvent(event);

  return (
    <Row eventType={event.type}>
      <span className="shrink-0">{lead}</span>
      {event.type === "messaged-agents" ? (
        <AgentStack targets={event.targets} />
      ) : (
        <ClockIcon />
      )}
      <span
        className="truncate"
        style={{ color: "var(--cursor-text-primary)" }}
      >
        {target}
      </span>
    </Row>
  );
}

export const SystemEvent = TranscriptSystemEvent;