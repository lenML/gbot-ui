import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import {
  isGrokBotObjectUrlPreview,
  withoutGrokBotTransientPreview,
} from "../../lib/grok-bot/types";
import type {
  GrokBotAgent,
  GrokBotOutgoingMessage,
} from "../../lib/grok-bot/types";
import { useGrokBotActions } from "../../lib/grok-bot/store";
import { AgentAvatar } from "./AgentAvatar";
import {
  AttachmentMenu,
  getAttachmentDetail,
  getAttachmentLabel,
  type MobileAttachment,
} from "./AttachmentMenu";
import { AsrButton } from "./AsrButton";

export interface MobileComposerProps {
  agentId: string;
  agentName: string;
  agents: GrokBotAgent[];
  isGroupChat?: boolean;
  onOpenAttachments?: () => void;
  onSubmit?: (message: GrokBotOutgoingMessage) => void;
}

interface MentionMatch {
  query: string;
  range: Range;
}

const MENTION_PATTERN = /(?:^|\s)@([^\s@]*)$/;
const MIN_COMPOSER_HEIGHT = 20;
const MAX_COMPOSER_HEIGHT = 84;


function readComposerText(element: HTMLElement): string {
  let text = "";

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      continue;
    }

    if (!(node instanceof HTMLElement)) continue;
    if (node.tagName === "BR") {
      text += "\n";
      continue;
    }
    if (node.dataset.agentId) {
      text += node.textContent ?? "";
      continue;
    }

    if (text.length > 0) text += "\n";
    text += readComposerText(node);
  }

  return text.replaceAll("\u00a0", " ");
}

function placeCaretAfter(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function findMention(element: HTMLDivElement): MentionMatch | null {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE || !element.contains(textNode)) {
    return null;
  }

  const textBeforeCaret = (textNode.textContent ?? "").slice(
    0,
    range.startOffset,
  );
  const match = MENTION_PATTERN.exec(textBeforeCaret);
  if (!match) return null;

  const mentionRange = document.createRange();
  mentionRange.setStart(
    textNode,
    range.startOffset - match[1].length - 1,
  );
  mentionRange.setEnd(textNode, range.startOffset);

  return { query: match[1], range: mentionRange };
}

export function MobileComposer({
  agentId,
  agentName,
  agents,
  isGroupChat = false,
  onOpenAttachments,
  onSubmit,
}: MobileComposerProps) {
  const actions = useGrokBotActions();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const [composerHeight, setComposerHeight] = useState(MIN_COMPOSER_HEIGHT);
  const [mention, setMention] = useState<MentionMatch | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<MobileAttachment[]>([]);
  const attachmentsRef = useRef(attachments);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        if (isGrokBotObjectUrlPreview(attachment) && attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
    },
    [],
  );

  const mentionAgents = useMemo(() => {
    if (!mention) return [];
    const query = mention.query.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) =>
      agent.name.toLowerCase().includes(query),
    );
  }, [agents, mention]);

  const placeholder = isGroupChat ? "Message group" : `Message ${agentName}`;
  const highlightedAgent = mentionAgents[
    Math.min(highlightedIndex, Math.max(mentionAgents.length - 1, 0))
  ];

  const resizeComposer = () => {
    const field = fieldRef.current;
    if (!field) return;
    const nextHeight = Math.min(
      Math.max(field.scrollHeight, MIN_COMPOSER_HEIGHT),
      MAX_COMPOSER_HEIGHT,
    );
    setComposerHeight(nextHeight);
  };

  const updateComposerState = () => {
    const field = fieldRef.current;
    if (!field) return;

    const nextMention = findMention(field);
    if (!nextMention) {
      setMention(null);
    } else if (nextMention.query !== mention?.query) {
      setMention(nextMention);
      setHighlightedIndex(0);
    }

    setEmpty(readComposerText(field).trim().length === 0);
    resizeComposer();
  };

  const insertMention = (agent: GrokBotAgent) => {
    const field = fieldRef.current;
    const currentMention = mention ?? (field ? findMention(field) : null);
    if (!field || !currentMention) return;

    currentMention.range.deleteContents();
    const token = document.createElement("span");
    token.className = "baby-grok-bot-mention";
    token.contentEditable = "false";
    token.dataset.agentId = agent.id;
    token.textContent = `@${agent.name}`;
    currentMention.range.insertNode(token);

    const space = document.createTextNode("\u00a0");
    token.after(space);
    placeCaretAfter(space);
    setMention(null);
    setEmpty(false);
    field.focus();
    resizeComposer();
  };

  const moveHighlight = (direction: number) => {
    if (mentionAgents.length === 0) return;
    setHighlightedIndex(
      (current) =>
        (current + direction + mentionAgents.length) % mentionAgents.length,
    );
  };

  const insertTranscript = (text: string) => {
    const field = fieldRef.current;
    if (!field || !text) return;

    field.focus();
    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0 && field.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : document.createRange();
    if (!field.contains(range.startContainer)) {
      range.selectNodeContents(field);
      range.collapse(false);
    }
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    placeCaretAfter(node);
    updateComposerState();
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === attachmentId);
      if (
        removed &&
        isGrokBotObjectUrlPreview(removed) &&
        removed.previewUrl
      ) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const clearAttachments = () => {
    for (const attachment of attachmentsRef.current) {
      if (isGrokBotObjectUrlPreview(attachment) && attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    }
    setAttachments([]);
  };

  const submit = () => {
    const field = fieldRef.current;
    if (!field) return;
    const content = readComposerText(field).trim();
    if (!content && attachments.length === 0) return;

    const outgoing: GrokBotOutgoingMessage = {
      text: content,
      attachments: attachments.map(withoutGrokBotTransientPreview),
    };
    if (onSubmit) {
      onSubmit(outgoing);
    } else {
      actions.sendMessage(outgoing);
    }

    field.replaceChildren();
    clearAttachments();
    setMention(null);
    setEmpty(true);
    setComposerHeight(MIN_COMPOSER_HEIGHT);
    field.focus();
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const pastePlainText = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    placeCaretAfter(node);
    updateComposerState();
  };

  return (
    <form
      className="absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2"
      onSubmit={submitForm}
    >
      {attachments.length > 0 ? (
        <div aria-label="Pending context" className="baby-grok-bot-attachment-tray">
          {attachments.map((attachment) => (
            <div className="baby-grok-bot-attachment-chip" key={attachment.id}>
              {attachment.kind === "photo" && attachment.previewUrl ? (
                <img
                  alt=""
                  className="baby-grok-bot-attachment-chip__preview"
                  src={attachment.previewUrl}
                />
              ) : null}
              <span className="baby-grok-bot-attachment-chip__copy">
                <strong>{getAttachmentLabel(attachment)}</strong>
                <small>{getAttachmentDetail(attachment) || attachment.kind}</small>
              </span>
              <button
                aria-label={`Remove ${getAttachmentLabel(attachment)}`}
                className="baby-grok-bot-attachment-chip__remove"
                onClick={() => removeAttachment(attachment.id)}
                type="button"
              >
                <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
                  <path
                    d="m4.5 4.5 7 7m0-7-7 7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.3"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <AttachmentMenu
          agentId={agentId}
          onAdd={(attachment) => {
            setAttachments((current) => [...current, attachment]);
            onOpenAttachments?.();
          }}
          onOpenChange={setAttachmentMenuOpen}
          onOpenScreen={() => actions.openScreen({ kind: "agent", agentId }, "agent")}
          open={attachmentMenuOpen}
        />

        <div className="baby-grok-bot-composer flex min-h-10 min-w-0 flex-1 items-end gap-1.5 rounded-[20px] py-1.5 pr-1.5 pl-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.1)] backdrop-blur-xl focus-within:border-[color:color-mix(in_srgb,var(--grok-bot-current-agent-accent)_45%,var(--grok-bot-border-default))]">
        <div className="relative min-w-0 flex-1">
          {mention ? (
            <div className="baby-grok-bot-mention-popover">
              <div className="baby-grok-bot-compose-results" role="listbox">
                {mentionAgents.length > 0 ? (
                  mentionAgents.map((agent, index) => {
                    const selected =
                      agent.id === highlightedAgent?.id ||
                      index === highlightedIndex;
                    return (
                      <button
                        aria-selected={selected}
                        className="baby-grok-bot-compose-result"
                        data-highlighted={selected || undefined}
                        key={agent.id}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertMention(agent);
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        role="option"
                        type="button"
                      >
                        <AgentAvatar agent={agent} size={20} />
                        <span className="min-w-0 flex-1 truncate text-[12px] leading-4 text-[color:var(--cursor-text-primary)]">
                          {agent.name}
                        </span>
                        <span className="shrink-0 text-[11px] leading-4 text-[color:var(--cursor-text-tertiary)]">
                          {agent.isGroup ? "Group" : "Agent"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2 py-4 text-center text-[13px] leading-[18px] text-[color:var(--cursor-text-tertiary)]">
                    No agents match "{mention.query.trim()}"
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div
            aria-label={placeholder}
            aria-multiline="true"
            className="baby-grok-bot-composer-field-input max-h-[84px]"
            contentEditable
            data-empty={empty ? "" : undefined}
            data-placeholder={placeholder}
            onBlur={() => setMention(null)}
            onInput={updateComposerState}
            onKeyDown={(event) => {
              if (mention && mentionAgents.length > 0) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveHighlight(1);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveHighlight(-1);
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  if (highlightedAgent) insertMention(highlightedAgent);
                  return;
                }
              }

              if (mention && event.key === "Escape") {
                event.preventDefault();
                setMention(null);
                return;
              }

              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            onKeyUp={updateComposerState}
            onMouseUp={updateComposerState}
            onPaste={pastePlainText}
            ref={fieldRef}
            role="textbox"
            style={{ height: composerHeight }}
            suppressContentEditableWarning
          />
        </div>

        <AsrButton onCancel={() => fieldRef.current?.focus()} onTranscript={insertTranscript} />
        {!empty || attachments.length > 0 ? (
          <button
            aria-label="Send"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-fill-emphasis)] text-[color:var(--grok-bot-bubble-user-ink)]"
            type="submit"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              viewBox="0 0 16 16"
              width="14"
            >
              <path
                d="M8 13V3m0 0L4.5 6.5M8 3l3.5 3.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        ) : null}
      </div>
      </div>
    </form>
  );
}