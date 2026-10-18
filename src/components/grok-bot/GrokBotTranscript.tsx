import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { useGrokBotSlots } from "../../lib/grok-bot/store";
import { getAgentPalette } from "../../lib/types";
import type {
  ComposingBeat,
  GrokBotMessageAttachment,
  GrokBotMessageSource,
  GrokBotMessageSourceKind,
  GrokBotTranscriptEntry,
  TranscriptThinkingEntry,
} from "../../lib/grok-bot/types";
import { GrokBotMark } from "../GrokBotMark";
import {
  getAttachmentDetail,
  getAttachmentIconName,
  getAttachmentLabel,
} from "./AttachmentMenu";
import { GrokBotIcon } from "./AgentAvatar";
import {
  ComputerUseCard,
  MultipleChoiceCard,
  OutboundMessageCard,
  PullRequestCard,
} from "./TranscriptCards";
import { TranscriptSystemEvent } from "./TranscriptSystemEvent";

const MARKDOWN_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|@\[[^\]]+\])/g;
const TIMESTAMP_GAP_MS = 45 * 60 * 1000;
const SOURCE_KIND_LABELS: Record<GrokBotMessageSourceKind, string> = {
  agent: "Agent",
  email: "Email",
  human: "Human",
  ide: "IDE",
  slack: "Slack",
  system: "System",
};

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

function renderMarkdown(content: string): ReactNode[] {
  return content.split(MARKDOWN_TOKEN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("@[") && part.endsWith("]")) {
      const name = part.slice(2, -1);
      const palette = getAgentPalette(name);

      return (
        <span
          className="baby-grok-bot-message-mention"
          key={index}
          style={{ color: palette.pillForeground }}
        >
          <span className="baby-grok-bot-message-mention__face">
            <span
              className="grok-bot-lazy grok-bot-mark--fill"
              style={{ width: 14, height: 14 }}
            >
              <GrokBotMark
                background="var(--grok-bot-bg-editor, #ffffff)"
                foreground={palette.avatar}
              />
            </span>
          </span>
          {name}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatTranscriptTimestamp(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "";

  const date = new Date(timestampMs);
  const now = new Date();
  const daysAgo = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000,
  );
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (daysAgo <= 0) return time;
  if (daysAgo === 1) return `Yesterday ${time}`;
  if (daysAgo < 7) return `${date.toLocaleDateString([], { weekday: "long" })} ${time}`;

  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function shouldShowTimestamp(
  entries: GrokBotTranscriptEntry[],
  index: number,
): number | null {
  const timestampMs = entries[index]?.timestampMs;
  if (timestampMs === undefined || !Number.isFinite(timestampMs) || timestampMs <= 0) {
    return null;
  }
  if (index === 0) return timestampMs;

  const previousTimestampMs = entries[index - 1]?.timestampMs;
  return previousTimestampMs === undefined ||
    timestampMs - previousTimestampMs >= TIMESTAMP_GAP_MS
    ? timestampMs
    : null;
}

function timestampAnchor(timestampMs: number): string {
  const date = new Date(timestampMs);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function reactionMask(
  count: number,
  side: "agent" | "user",
): CSSProperties {
  const maskImage = Array.from({ length: count }, (_, index) => {
    const offset = 20 + 22 * index;
    const position = side === "user" ? `calc(100% - ${offset}px)` : `${offset}px`;
    return `radial-gradient(circle at ${position} calc(100% + 4px), transparent 11.5px, #000 12px)`;
  }).join(", ");

  return {
    maskImage,
    maskComposite: "intersect",
    WebkitMaskImage: maskImage,
    WebkitMaskComposite: "source-in",
  };
}

function Reactions({
  reactions,
  side,
}: {
  reactions: readonly string[];
  side: "agent" | "user";
}) {
  return (
    <span
      aria-label={`Reactions: ${reactions.join(", ")}`}
      className={`baby-grok-bot-reactions baby-grok-bot-reactions--${side}`}
    >
      {reactions.map((reaction, index) => (
        <span
          aria-hidden="true"
          className="baby-grok-bot-reaction"
          key={`${reaction}-${index}`}
        >
          {reaction}
        </span>
      ))}
    </span>
  );
}

function StreamingCaret() {
  return (
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-current align-[-0.1em] motion-reduce:animate-none"
    />
  );
}

interface MessageViewProps {
  attachments?: readonly GrokBotMessageAttachment[];
  author?: string;
  content: string;
  interrupted?: boolean;
  reactions?: readonly string[];
  role: "user" | "assistant";
  source?: GrokBotMessageSource;
  streaming?: boolean;
}

function MessageOriginHeader({
  author,
  role,
  source,
}: {
  author?: string;
  role: "user" | "assistant";
  source?: GrokBotMessageSource;
}) {
  const name =
    source?.name.trim() ||
    author?.trim() ||
    (role === "user" ? "You" : "Assistant");
  const badge = source
    ? SOURCE_KIND_LABELS[source.kind]
    : role === "user"
      ? "Human"
      : "Agent";

  return (
    <div
      className="baby-grok-bot-message-origin"
      data-side={role === "user" ? "user" : "agent"}
    >
      <span className="baby-grok-bot-message-origin__name">{name}</span>
      <span className="baby-grok-bot-message-origin__badge">{badge}</span>
      {source?.label && source.label !== name ? (
        <span className="baby-grok-bot-message-origin__detail">{source.label}</span>
      ) : null}
    </div>
  );
}

function TranscriptAttachments({
  attachments,
}: {
  attachments: readonly GrokBotMessageAttachment[];
}) {
  return (
    <div className="baby-grok-bot-message-attachments">
      {attachments.map((attachment) => {
        const detail = getAttachmentDetail(attachment);
        return (
          <div
            className="baby-grok-bot-message-attachment"
            data-kind={attachment.kind}
            key={attachment.id}
          >
            {attachment.kind === "photo" && attachment.previewUrl ? (
              <img
                alt=""
                className="baby-grok-bot-message-attachment__preview"
                src={attachment.previewUrl}
              />
            ) : (
              <span className="baby-grok-bot-message-attachment__icon">
                <GrokBotIcon name={getAttachmentIconName(attachment)} size={14} />
              </span>
            )}
            <span className="baby-grok-bot-message-attachment__copy">
              <strong>{getAttachmentLabel(attachment)}</strong>
              {detail ? <small>{detail}</small> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MessageView({
  attachments,
  author,
  content,
  interrupted = false,
  reactions,
  role,
  source,
  streaming = false,
}: MessageViewProps) {
  const side = role === "user" ? "user" : "agent";
  const showBubble = content.trim().length > 0 || streaming;
  const bubbleStyle: CSSProperties = {
    background:
      role === "user"
        ? "var(--grok-bot-bubble-user)"
        : "var(--grok-bot-bubble-agent)",
    color:
      role === "user"
        ? "var(--grok-bot-bubble-user-ink)"
        : "var(--cursor-text-primary)",
    borderRadius: 16,
    ...(reactions && reactions.length > 0
      ? reactionMask(reactions.length, side)
      : {}),
  };
  const bubble = showBubble ? (
    <div
      aria-busy={streaming || undefined}
      className={cn(
        "baby-grok-bot-md whitespace-pre-wrap px-3 py-2 text-[14px] leading-5 tracking-[-0.15px]",
        role === "user" && "rounded-2xl",
      )}
      style={bubbleStyle}
    >
      {streaming && content.trim().length === 0 ? (
        <span
          aria-label="Waiting for first token"
          className="baby-grok-bot-empty-stream"
          role="status"
        >
          {[0, 1, 2].map((dot) => (
            <span className="baby-grok-bot-empty-stream__dot" key={dot} />
          ))}
        </span>
      ) : (
        <>
          {renderMarkdown(content)}
          {streaming ? <StreamingCaret /> : null}
        </>
      )}
    </div>
  ) : null;

  if (role === "user") {
    return (
      <div className="flex flex-col items-end">
        <MessageOriginHeader author={author} role={role} source={source} />
        <div className="relative flex max-w-[min(420px,85%)] flex-col items-end gap-1.5">
          {attachments && attachments.length > 0 ? (
            <TranscriptAttachments attachments={attachments} />
          ) : null}
          {bubble}
          {reactions && reactions.length > 0 ? (
            <Reactions reactions={reactions} side="user" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[min(560px,92%)] flex-col items-start">
      <MessageOriginHeader author={author} role={role} source={source} />
      <div className="relative flex flex-col items-start gap-1.5">
        {attachments && attachments.length > 0 ? (
          <TranscriptAttachments attachments={attachments} />
        ) : null}
        {bubble}
        {interrupted ? (
          <span className="baby-grok-bot-message-stopped" role="status">
            Stopped
          </span>
        ) : null}
        {reactions && reactions.length > 0 ? (
          <Reactions reactions={reactions} side="agent" />
        ) : null}
      </div>
    </div>
  );
}

function CardMessage({ children }: { children: ReactNode }) {
  return <div className="max-w-[min(420px,92%)]">{children}</div>;
}

function formatThinkingDuration(durationMs?: number): string | null {
  if (durationMs == null || !Number.isFinite(durationMs)) return null;
  const seconds = Math.max(0.1, durationMs / 1_000);
  return seconds < 10
    ? `${seconds.toFixed(1)}s`
    : `${Math.round(seconds)}s`;
}

function ThinkingRow({ entry }: { entry: TranscriptThinkingEntry }) {
  const status = entry.status ?? "complete";
  const [isOpen, setIsOpen] = useState(status === "thinking");
  const previousStatusRef = useRef(status);
  const duration = formatThinkingDuration(entry.durationMs);

  useEffect(() => {
    if (previousStatusRef.current === "thinking" && status !== "thinking") {
      setIsOpen(false);
    }
    previousStatusRef.current = status;
  }, [status]);
  const label =
    status === "thinking"
      ? "Thinking"
      : status === "stopped"
        ? "Thinking stopped"
        : "Thought";

  return (
    <div className="baby-grok-bot-thinking" data-status={status}>
      <details
        className="baby-grok-bot-thinking__details"
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
        open={isOpen}
      >
        <summary className="baby-grok-bot-thinking__summary">
          {status === "thinking" ? (
            <span
              aria-hidden="true"
              className="baby-grok-bot-thinking__dots"
            >
              {[0, 1, 2].map((dot) => (
                <span className="baby-grok-bot-thinking__dot" key={dot} />
              ))}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="baby-grok-bot-thinking__status"
            />
          )}
          <span className="baby-grok-bot-thinking__label">{label}</span>
          {duration ? (
            <span className="baby-grok-bot-thinking__duration">{duration}</span>
          ) : null}
          <span className="baby-grok-bot-thinking__preview">{entry.text}</span>
          <span
            aria-hidden="true"
            className="baby-grok-bot-thinking__chevron"
          />
        </summary>
        <div className="baby-grok-bot-thinking__detail">{entry.text}</div>
      </details>
    </div>
  );
}

function EntryContent({ entry }: { entry: GrokBotTranscriptEntry }) {
  switch (entry.kind) {
    case "message":
      return (
        <MessageView
          attachments={entry.attachments}
          author={entry.role === "assistant" ? entry.author : undefined}
          content={entry.content}
          reactions={entry.reactions}
          role={entry.role}
          source={entry.source}
          streaming={entry.streaming}
        />
      );
    case "thinking":
      return <ThinkingRow entry={entry} />;
    case "send-message":
      return entry.message.type === "text" ? (
        <MessageView
          author={entry.author?.name}
          content={entry.message.content}
          interrupted={entry.interrupted}
          reactions={entry.reactions}
          role="assistant"
          source={entry.source}
          streaming={entry.streaming}
        />
      ) : null;
    case "system":
      return <TranscriptSystemEvent event={entry.event} />;
    case "multiple-choice":
      return (
        <CardMessage>
          <MultipleChoiceCard entry={entry} />
        </CardMessage>
      );
    case "computer-use":
      return (
        <CardMessage>
          <ComputerUseCard entry={entry} />
        </CardMessage>
      );
    case "pull-request":
      return (
        <CardMessage>
          <PullRequestCard entry={entry} />
        </CardMessage>
      );
    case "outbound-message":
      return (
        <CardMessage>
          <OutboundMessageCard entry={entry} />
        </CardMessage>
      );
  }
}

function entryRole(
  entry: GrokBotTranscriptEntry,
): "agent" | "system" | "user" {
  if (entry.kind === "system") return "system";
  return entry.kind === "message" && entry.role === "user" ? "user" : "agent";
}

function entrySignature(entry: GrokBotTranscriptEntry | undefined): string {
  if (!entry) return "none";

  switch (entry.kind) {
    case "message":
      return `${entry.kind}:${entry.id}:${entry.content}:${entry.streaming ?? false}:${entry.attachments?.map((attachment) => attachment.id).join(",") ?? ""}`;
    case "thinking":
      return `${entry.kind}:${entry.id}:${entry.status ?? "complete"}:${entry.durationMs ?? ""}:${entry.text}`;
    case "send-message":
      return `${entry.kind}:${entry.id}:${entry.message.content}:${entry.streaming ?? false}`;
    case "system":
      return `${entry.kind}:${entry.id}:${entry.event.type}`;
    case "multiple-choice":
      return `${entry.kind}:${entry.id}:${entry.answer?.kind ?? "none"}:${entry.isDismissed ?? false}`;
    case "computer-use":
      return `${entry.kind}:${entry.id}:${entry.status}`;
    case "pull-request":
      return `${entry.kind}:${entry.id}:${entry.status}`;
    case "outbound-message":
      return `${entry.kind}:${entry.id}:${entry.status}`;
  }
}

interface EntryItemProps {
  enterDelayMs?: number;
  entry: GrokBotTranscriptEntry;
  roleChanged: boolean;
  timestampMs: number | null;
}

const EntryItem = memo(function EntryItem({
  enterDelayMs,
  entry,
  roleChanged,
  timestampMs,
}: EntryItemProps) {
  return (
    <div
      className={cn(
        "baby-grok-bot-entry-enter",
        entry.reactions && entry.reactions.length > 0 && "mb-[14px]",
        roleChanged
          ? "mt-3 first:mt-0"
          : timestampMs !== null
            ? "mt-2 first:mt-0"
            : undefined,
      )}
      style={enterDelayMs === undefined ? undefined : { animationDelay: `${enterDelayMs}ms` }}
    >
      {timestampMs !== null ? (
        <div className="mb-2">
          <div
            className="flex items-center justify-center py-1 text-[12px] leading-4"
            style={{ color: "var(--cursor-text-secondary)" }}
          >
            <time dateTime={timestampAnchor(timestampMs)}>
              {formatTranscriptTimestamp(timestampMs)}
            </time>
          </div>
        </div>
      ) : null}
      <EntryContent entry={entry} />
    </div>
  );
});

EntryItem.displayName = "EntryItem";

function ComposingIndicator({ beat }: { beat?: ComposingBeat }) {
  const label = beat?.label ?? "Thinking";

  return (
    <div
      aria-live="polite"
      className="baby-grok-bot-pending mt-3"
      data-state={beat?.state}
      role="status"
    >
      <span
        aria-hidden="true"
        className="baby-grok-bot-pending__avatar"
        style={
          {
            "--fg": "var(--grok-bot-current-agent-coat)",
            "--bg": "var(--grok-bot-bg-editor)",
          } as CSSProperties
        }
      >
        <GrokBotMark className="grok-bot-mark--fill" />
      </span>
      <span className="baby-grok-bot-pending__label">
        {label}
        <span aria-hidden="true" className="inline-flex gap-0.5">
          {[0, 1, 2].map((dot) => (
            <span
              className="baby-grok-bot-typing-dot"
              key={dot}
              style={{ animationDelay: `${dot * 140}ms` }}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

export interface GrokBotTranscriptProps {
  entries: GrokBotTranscriptEntry[];
  isAgentComposing?: boolean;
  composingBeat?: ComposingBeat;
  className?: string;
  onAtBottomChange?: (atBottom: boolean) => void;
}

export function GrokBotTranscript({
  entries,
  isAgentComposing = false,
  composingBeat,
  className,
  onAtBottomChange,
}: GrokBotTranscriptProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const mountedRef = useRef(false);
  const onAtBottomChangeRef = useRef(onAtBottomChange);
  const previousRef = useRef({
    count: 0,
    lastId: null as string | null,
    composing: false,
    signature: "none",
  });
  const [fresh, setFresh] = useState(true);
  const reducedMotion = useReducedMotion() ?? false;
  const slots = useGrokBotSlots();
  const TranscriptEntrySlot = slots.transcriptEntry;

  useEffect(() => {
    onAtBottomChangeRef.current = onAtBottomChange;
  }, [onAtBottomChange]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setFresh(false), 700);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const lastEntry = entries.at(-1);
    const signature = entrySignature(lastEntry);
    const previous = previousRef.current;
    const changed =
      entries.length !== previous.count ||
      (lastEntry?.id ?? null) !== previous.lastId ||
      signature !== previous.signature ||
      isAgentComposing !== previous.composing;

    previousRef.current = {
      count: entries.length,
      lastId: lastEntry?.id ?? null,
      composing: isAgentComposing,
      signature,
    };

    if (!changed || (!mountedRef.current && entries.length === 0)) {
      return;
    }

    if (!atBottomRef.current) return;

    const frame = requestAnimationFrame(() => {
      viewport.scrollTo({
        behavior: mountedRef.current && !reducedMotion ? "smooth" : "auto",
        top: viewport.scrollHeight,
      });
    });
    mountedRef.current = true;

    return () => cancelAnimationFrame(frame);
  }, [entries, isAgentComposing, reducedMotion]);

  const lastEntry = entries.at(-1);
  const showComposing =
    isAgentComposing &&
    !(lastEntry?.kind === "send-message" && lastEntry.streaming === true) &&
    !(lastEntry?.kind === "thinking" && lastEntry.status === "thinking");

  return (
    <div
      aria-busy={isAgentComposing || undefined}
      aria-label="Conversation"
      aria-live="polite"
      className={cn(
        "baby-grok-bot-transcript flex min-h-0 flex-1 flex-col overflow-y-auto",
        className ?? "px-5 pb-12 pt-2",
      )}
      onScroll={() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const atBottom =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
        if (atBottom === atBottomRef.current) return;

        atBottomRef.current = atBottom;
        onAtBottomChangeRef.current?.(atBottom);
      }}
      ref={viewportRef}
      role="log"
      tabIndex={0}
    >
      <div className="flex flex-col gap-1" data-fresh={fresh || undefined}>
        {entries.map((entry, index) => {
          const role = entryRole(entry);
          const previousRole = index > 0 ? entryRole(entries[index - 1]) : null;
          const entryProps = {
            enterDelayMs: fresh ? Math.min(index * 45, 320) : undefined,
            entry,
            roleChanged: previousRole !== null && previousRole !== role,
            timestampMs: shouldShowTimestamp(entries, index),
          };

          if (TranscriptEntrySlot) {
            return (
              <TranscriptEntrySlot
                entry={entry}
                index={index}
                isLast={index === entries.length - 1}
                key={entry.id}
              >
                <EntryItem {...entryProps} />
              </TranscriptEntrySlot>
            );
          }

          return <EntryItem key={entry.id} {...entryProps} />;
        })}
        {showComposing ? <ComposingIndicator beat={composingBeat} /> : null}
      </div>
    </div>
  );
}

export default GrokBotTranscript;
