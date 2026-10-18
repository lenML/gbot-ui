import { useState } from "react";
import type { FormEvent } from "react";
import type { CardBadgeTone } from "../../lib/types";
import type {
  ComputerUseStatus,
  MultipleChoiceAnswer,
  MultipleChoiceOption,
  OutboundMessageStatus,
  TranscriptComputerUseEntry,
  TranscriptMultipleChoiceEntry,
  TranscriptOutboundMessageEntry,
  TranscriptPullRequestEntry,
} from "../../lib/grok-bot/types";
import {
  useActiveAgent,
  useOptionalGrokBotActions,
} from "../../lib/grok-bot/store";
import { CardBadge } from "../CardBadge";
import { ComputerSurface } from "./ComputerSurface";

 import { getGrokBotActionsFromStore } from "./TranscriptSystemEvent";

interface StatusMeta {
  label: string;
  tone: CardBadgeTone;
  spinner?: boolean;
}

const COMPUTER_STATUS: Record<ComputerUseStatus, StatusMeta> = {
  "action-needed": { label: "Action needed", tone: "warning", spinner: true },
  "handed-over": { label: "You're in control", tone: "warning" },
  working: { label: "Working", tone: "accent", spinner: true },
  done: { label: "Done", tone: "success" },
};

const OUTBOUND_STATUS: Record<OutboundMessageStatus, StatusMeta> = {
  ready: { label: "Ready to send", tone: "muted" },
  sending: { label: "Sending...", tone: "warning", spinner: true },
  sent: { label: "Sent", tone: "success" },
  discarded: { label: "Discarded", tone: "muted" },
};

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <path
        d="m3.2 3.2 7.6 7.6m0-7.6-7.6 7.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="11"
      viewBox="0 0 12 12"
      width="11"
    >
      <path
        d="m2.4 6.2 2.2 2.1 4.9-4.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function OptionMarker({
  index,
  selected,
}: {
  index: number;
  selected: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="mt-px flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[11px] leading-none font-medium"
      style={
        selected
          ? {
              background: "var(--grok-bot-current-agent-accent)",
              color: "#fff",
            }
          : {
              background: "var(--grok-bot-fill-secondary)",
              color: "var(--cursor-text-tertiary)",
            }
      }
    >
      {selected ? <CheckIcon /> : ("ABCDEFGH"[index] ?? String(index + 1))}
    </span>
  );
}

function formatChoiceAnswer(
  answer: Exclude<MultipleChoiceAnswer, null>,
  options: MultipleChoiceOption[],
): string {
  if (answer.kind === "custom") return answer.value;

  return answer.optionIds
    .map((optionId) => options.find((option) => option.id === optionId)?.label ?? optionId)
    .join(", ");
}

function CompletedChoice({
  entry,
}: {
  entry: TranscriptMultipleChoiceEntry;
}) {
  return (
    <div aria-live="polite" className="baby-grok-bot-card">
      <p>{entry.question}</p>
      <p
        className="mt-0.5"
        style={{ color: "var(--cursor-text-tertiary)" }}
      >
        {entry.answer ? formatChoiceAnswer(entry.answer, entry.options) : "Skipped"}
      </p>
    </div>
  );
}

export interface MultipleChoiceCardProps {
  entry: TranscriptMultipleChoiceEntry;
}

export function MultipleChoiceCard({ entry }: MultipleChoiceCardProps) {
  const store = useOptionalGrokBotActions();
  const actions = getGrokBotActionsFromStore(store);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customAnswer, setCustomAnswer] = useState("");
  const isMultiple =
    entry.selection === "multiple" || (entry.selection as string) === "multi";
  const disabled = actions === null;

  if (entry.answer !== null || entry.isDismissed) {
    return <CompletedChoice entry={entry} />;
  }

  const chooseOption = (optionId: string) => {
    if (!actions) return;

    if (!isMultiple) {
      actions.answerChoice(entry.id, {
        kind: "options",
        optionIds: [optionId],
      });
      return;
    }

    setSelectedIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  };

  const submitCustomAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = customAnswer.trim();
    if (!value || !actions) return;

    actions.answerChoice(entry.id, { kind: "custom", value });
  };

  return (
    <div className="baby-grok-bot-card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="baby-grok-bot-card-title">{entry.question}</p>
          {entry.hint ? (
            <p className="baby-grok-bot-card-secondary mt-0.5">{entry.hint}</p>
          ) : null}
        </div>
        {actions ? (
          <button
            aria-label="Dismiss question"
            className="baby-grok-bot-window-action -mr-1 -mt-0.5"
            onClick={() => actions.dismissChoice(entry.id)}
            type="button"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div
        aria-label={entry.question}
        className="mt-2.5 flex flex-col gap-1.5"
        role={isMultiple ? "group" : "radiogroup"}
      >
        {entry.options.map((option, index) => {
          const selected = selectedIds.includes(option.id);

          return (
            <button
              aria-checked={isMultiple ? undefined : selected}
              aria-pressed={isMultiple ? selected : undefined}
              className="baby-grok-bot-choice-option"
              data-selected={selected || undefined}
              disabled={disabled}
              key={option.id}
              onClick={() => chooseOption(option.id)}
              role={isMultiple ? undefined : "radio"}
              type="button"
            >
              <OptionMarker index={index} selected={selected} />
              <span className="min-w-0 flex-1">
                <span className="block">{option.label}</span>
                {option.description ? (
                  <span className="baby-grok-bot-card-secondary mt-0.5 block">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {entry.allowCustomAnswer ? (
        <form className="mt-1.5" onSubmit={submitCustomAnswer}>
          <label className="sr-only" htmlFor={`custom-answer-${entry.id}`}>
            Custom answer
          </label>
          <input
            className="baby-grok-bot-choice-input"
            disabled={disabled}
            id={`custom-answer-${entry.id}`}
            onChange={(event) => setCustomAnswer(event.target.value)}
            placeholder="Type your own answer..."
            value={customAnswer}
          />
        </form>
      ) : null}

      {isMultiple && actions ? (
        <div className="mt-2.5 flex justify-end">
          <button
            className="baby-grok-bot-choice-confirm"
            disabled={selectedIds.length === 0}
            onClick={() =>
              actions.answerChoice(entry.id, {
                kind: "options",
                optionIds: selectedIds,
              })
            }
            type="button"
          >
            {selectedIds.length > 1
              ? `Send ${selectedIds.length} answers`
              : "Send answer"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <path
        d="M4 10 10 4m-4.8 0H10v4.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export interface ComputerUseCardProps {
  entry: TranscriptComputerUseEntry;
}

export function ComputerUseCard({ entry }: ComputerUseCardProps) {
  const store = useOptionalGrokBotActions();
  const agent = useActiveAgent();
  const actions = getGrokBotActionsFromStore(store);
  const meta = COMPUTER_STATUS[entry.status];
  const canTakeOver =
    entry.status === "action-needed" || entry.status === "handed-over";

  return (
    <div
      className="baby-grok-bot-card"
      data-screen-kind={entry.screenKind}
      data-status={entry.status}
    >
      <div className="flex items-start gap-2">
        <button
          className="baby-grok-bot-card-title"
          disabled={!actions}
          onClick={() => actions?.openComputerScreen(entry.id)}
          type="button"
        >
          Computer
        </button>
        <span className="flex-1" />
        <CardBadge
          label={meta.label}
          spinner={meta.spinner}
          tone={meta.tone}
        />
      </div>

      <p className="mt-0.5">{entry.instruction}</p>

      <div className="mt-2.5">
        {agent ? (
          <ComputerSurface
            agent={agent}
            className="!rounded-none"
            entry={entry}
            onExpand={
              actions ? () => actions.openComputerScreen(entry.id) : undefined
            }
          />
        ) : null}
      </div>

      {canTakeOver ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            className="baby-grok-bot-card-action"
            data-demo-target="computer-take-over"
            data-variant="primary"
            disabled={!actions}
            onClick={() => actions?.takeOverComputer(entry.id)}
            type="button"
          >
            Take over
          </button>
          <button
            className="baby-grok-bot-card-action"
            data-variant="secondary"
            disabled={!actions}
            onClick={() => actions?.finishComputerTakeOver(entry.id)}
            type="button"
          >
            I'm done
          </button>
          {entry.status === "handed-over" ? (
            <button
              className="baby-grok-bot-card-action"
              data-variant="secondary"
              disabled={!actions}
              onClick={() => actions?.handBackComputer(entry.id)}
              type="button"
            >
              Hand back
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BranchIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <circle cx="4" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="4" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="10" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M4 4.5v5M10 6.5c0 2-1.8 3-4.2 3.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function RepositoryIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <path
        d="M3.2 4.1h7.6v6.4H3.2zM4.5 2.2h5l1.3 1.9h-7.6l1.3-1.9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function DiffIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <path
        d="M4 2.5v9M2.5 4h3M9.2 4h2.3M9.2 8h2.3M10 2.5v9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export interface PullRequestCardProps {
  entry: TranscriptPullRequestEntry;
}

export function PullRequestCard({ entry }: PullRequestCardProps) {
  const creating = entry.status === "creating";
  const hasDiff =
    entry.additions !== undefined || entry.deletions !== undefined;
  const url = entry.status === "done" ? entry.url : undefined;

  return (
    <div className="baby-grok-bot-card" data-status={entry.status}>
      <div className="flex items-start gap-2">
        <span className="baby-grok-bot-card-title">
          {entry.title}
          {entry.number !== undefined ? ` #${entry.number}` : ""}
        </span>
        <span className="flex-1" />
        <CardBadge
          label={creating ? "Creating" : "Done"}
          spinner={creating}
          tone={creating ? "info" : "success"}
        />
      </div>

      <div className="baby-grok-bot-card-secondary baby-grok-bot-card-meta mt-1">
        <RepositoryIcon />
        <span className="truncate">{entry.repository}</span>
      </div>

      {entry.branch ? (
        <div className="baby-grok-bot-card-secondary baby-grok-bot-card-meta">
          <BranchIcon />
          <span className="truncate">{entry.branch}</span>
        </div>
      ) : null}

      {hasDiff ? (
        <div className="baby-grok-bot-card-secondary baby-grok-bot-card-meta">
          <DiffIcon />
          <span style={{ color: "var(--grok-bot-text-success)" }}>
            +{entry.additions ?? 0}
          </span>
          <span style={{ color: "var(--grok-bot-text-danger)" }}>
            -{entry.deletions ?? 0}
          </span>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-2">
        {url ? (
          <a
            className="baby-grok-bot-card-action"
            data-variant="primary"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            View PR
            <ArrowUpRightIcon />
          </a>
        ) : (
          <span
            aria-disabled="true"
            className="baby-grok-bot-card-action"
            data-variant="primary"
          >
            View PR
            <ArrowUpRightIcon />
          </span>
        )}
      </div>
    </div>
  );
}

function SlackIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-[3px] size-3.5 shrink-0"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.8 1.5a2.4 2.4 0 1 0 0 4.8h2.4V3.9a2.4 2.4 0 0 0-2.4-2.4Zm0 6.4H2.4a2.4 2.4 0 1 0 0 4.8h6.4a2.4 2.4 0 0 0 0-4.8Z"
        fill="#36c5f0"
      />
      <path
        d="M22.5 8.3a2.4 2.4 0 1 0-4.8 0v2.4h2.4a2.4 2.4 0 0 0 2.4-2.4Zm-6.4 0V2.4a2.4 2.4 0 1 0-4.8 0v5.9a2.4 2.4 0 0 0 4.8 0Z"
        fill="#2eb67d"
      />
      <path
        d="M15.2 22.5a2.4 2.4 0 1 0 0-4.8h-2.4v2.4a2.4 2.4 0 0 0 2.4 2.4Zm0-6.4h6.4a2.4 2.4 0 1 0 0-4.8h-6.4a2.4 2.4 0 0 0 0 4.8Z"
        fill="#ecb22e"
      />
      <path
        d="M1.5 15.7a2.4 2.4 0 1 0 4.8 0v-2.4H3.9a2.4 2.4 0 0 0-2.4 2.4Zm6.4 0v5.9a2.4 2.4 0 1 0 4.8 0v-5.9a2.4 2.4 0 0 0-4.8 0Z"
        fill="#e01e5a"
      />
    </svg>
  );
}

function MessageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="baby-grok-bot-message-row">
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}

export interface OutboundMessageCardProps {
  entry: TranscriptOutboundMessageEntry;
}

export function OutboundMessageCard({ entry }: OutboundMessageCardProps) {
  const store = useOptionalGrokBotActions();
  const actions = getGrokBotActionsFromStore(store);
  const meta = OUTBOUND_STATUS[entry.status];
  const isSlack = entry.channel === "slack";
  const isSending = entry.status === "sending";
  const isTerminal = entry.status === "sent" || entry.status === "discarded";
  const paragraphs = entry.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="baby-grok-bot-card" data-channel={entry.channel ?? "email"}>
      <div aria-live="polite" className="flex items-start gap-2">
        {isSlack ? <SlackIcon /> : null}
        <span className="baby-grok-bot-card-title">
          {isSlack ? "Slack message" : "New email"}
        </span>
        <span className="flex-1" />
        <CardBadge
          label={meta.label}
          spinner={meta.spinner}
          tone={meta.tone}
        />
      </div>

      <div className="baby-grok-bot-message-panel mt-2">
        <dl className="m-0">
          {isSlack ? (
            <>
              <MessageRow label="Workspace" value={entry.workspace} />
              <MessageRow label="To" value={entry.to} />
              {entry.thread ? (
                <MessageRow label="Thread" value={entry.thread} />
              ) : null}
            </>
          ) : (
            <>
              <MessageRow label="From" value={entry.from} />
              <MessageRow label="To" value={entry.to} />
              <MessageRow label="Subject" value={entry.subject} />
            </>
          )}
        </dl>
        <div className="baby-grok-bot-message-body">
          {(paragraphs.length > 0 ? paragraphs : [entry.body]).map(
            (paragraph, index) => (
              <p className="whitespace-pre-wrap" key={`${paragraph}-${index}`}>
                {paragraph}
              </p>
            ),
          )}
        </div>
      </div>

      {!isTerminal ? (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            className="baby-grok-bot-card-action"
            data-variant="primary"
            disabled={!actions || isSending}
            onClick={() => actions?.sendOutboundMessage(entry.id)}
            type="button"
          >
            {isSending ? (
              <>
                <span aria-hidden="true" className="baby-grok-bot-spinner size-3">
                  <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
                    <circle
                      cx="6"
                      cy="6"
                      opacity="0.28"
                      r="4.5"
                      stroke="currentColor"
                    />
                    <path
                      d="M6 1.5A4.5 4.5 0 0 1 10.5 6"
                      stroke="currentColor"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Sending...
              </>
            ) : isSlack ? (
              "Send message"
            ) : (
              "Send email"
            )}
          </button>
          <button
            className="baby-grok-bot-card-action"
            data-variant="secondary"
            disabled={!actions || isSending}
            onClick={() => actions?.discardOutboundMessage(entry.id)}
            type="button"
          >
            Discard
          </button>
        </div>
      ) : null}
    </div>
  );
}