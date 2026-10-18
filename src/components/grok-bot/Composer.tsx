import { useEffect, useRef, useState } from "react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useActiveAgent, useGrokBotStore } from "../../lib/grok-bot/store";
import {
  isGrokBotObjectUrlPreview,
  withoutGrokBotTransientPreview,
} from "../../lib/grok-bot/types";
import type {
  GrokBotAgent,
  GrokBotMessageAttachment,
  GrokBotOutgoingMessage,
} from "../../lib/grok-bot/types";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";
import {
  AttachmentMenu,
  getAttachmentDetail,
  getAttachmentLabel,
} from "./AttachmentMenu";
import { AsrButton } from "./AsrButton";

const MENTION_QUERY = /(?:^|\s)@([^\s@]*)$/;

function readEditorText(root: HTMLElement): string {
  let text = "";

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      return;
    }

    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }

    if (node.dataset.agentId) {
      text += node.textContent ?? "";
      return;
    }

    const needsBreak =
      text.length > 0 && !text.endsWith("\n") && node.tagName === "DIV";
    if (needsBreak) text += "\n";
    node.childNodes.forEach(visit);
  };

  root.childNodes.forEach(visit);
  return text.replaceAll("\u00a0", " ");
}

function getMentionContext(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const match = MENTION_QUERY.exec(
    (node.textContent ?? "").slice(0, range.startOffset),
  );
  if (!match) return null;

  const mentionRange = document.createRange();
  mentionRange.setStart(node, range.startOffset - match[1].length - 1);
  mentionRange.setEnd(node, range.startOffset);
  return { query: match[1], range: mentionRange };
}

function placeCaretAfter(node: Node, offset = 0) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function resolvePlaceholder(agent: GrokBotAgent | null | undefined) {
  if (!agent) return "Message agent";
  if (agent.isGroup) return "Message group";
  return `Message ${agent.name}`;
}

export function Composer() {
  const agent = useActiveAgent();
  const { state, actions } = useGrokBotStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<GrokBotMessageAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  const availableAgents = state.agents.filter(
    (candidate) => !state.hiddenAgentIds.has(candidate.id),
  );
  const normalizedMention = mentionQuery?.trim().toLowerCase() ?? "";
  const mentionAgents =
    mentionQuery === null
      ? []
      : normalizedMention.length === 0
        ? availableAgents
        : availableAgents.filter((candidate) =>
            candidate.name.toLowerCase().includes(normalizedMention),
          );

  const syncEmpty = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextEmpty = readEditorText(editor).trim().length === 0;
    setIsEmpty(nextEmpty);
    return nextEmpty;
  };

  const closeMentions = () => {
    setMentionQuery(null);
    setHighlightIndex(0);
  };

  const syncMentions = () => {
    const editor = editorRef.current;
    if (!editor) {
      closeMentions();
      return;
    }
    const context = getMentionContext(editor);
    if (!context) {
      closeMentions();
      return;
    }
    if (context.query !== mentionQuery) setHighlightIndex(0);
    setMentionQuery(context.query);
  };

  const syncEditor = () => {
    syncEmpty();
    syncMentions();
  };

  const insertTextAtCaret = (text: string) => {
    const editor = editorRef.current;
    if (!editor || !text) return;

    editor.focus();
    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : document.createRange();
    if (!editor.contains(range.startContainer)) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    placeCaretAfter(node, node.length);
    syncEditor();
  };

  const insertMention = (candidate: GrokBotAgent) => {
    const editor = editorRef.current;
    const context = editor ? getMentionContext(editor) : null;
    if (!editor || !context) {
      closeMentions();
      return;
    }

    context.range.deleteContents();
    const mention = document.createElement("span");
    mention.className = "baby-grok-bot-mention";
    mention.contentEditable = "false";
    mention.dataset.agentId = candidate.id;
    mention.textContent = `@${candidate.name}`;
    context.range.insertNode(mention);

    const spacer = document.createTextNode("\u00a0");
    mention.after(spacer);
    placeCaretAfter(spacer, 1);
    closeMentions();
    syncEmpty();
    editor.focus();
  };

  const moveHighlight = (delta: number) => {
    if (mentionAgents.length === 0) return;
    const nextIndex =
      (highlightIndex + delta + mentionAgents.length) % mentionAgents.length;
    setHighlightIndex(nextIndex);
    window.requestAnimationFrame(() => {
      const list = mentionListRef.current;
      const option = list?.querySelectorAll<HTMLElement>('[role="option"]')[nextIndex];
      if (!list || !option) return;
      const listRect = list.getBoundingClientRect();
      const optionRect = option.getBoundingClientRect();
      if (optionRect.top < listRect.top) {
        list.scrollTop -= listRect.top - optionRect.top;
      } else if (optionRect.bottom > listRect.bottom) {
        list.scrollTop += optionRect.bottom - listRect.bottom;
      }
    });
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === attachmentId);
      if (removed && isGrokBotObjectUrlPreview(removed) && removed.previewUrl) {
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
    const editor = editorRef.current;
    if (!editor) return;
    const value = readEditorText(editor).trim();
    if (!value && attachments.length === 0) return;

    const outgoing: GrokBotOutgoingMessage = {
      text: value,
      attachments: attachments.map(withoutGrokBotTransientPreview),
    };
    actions.sendMessage(outgoing);
    editor.replaceChildren();
    clearAttachments();
    closeMentions();
    setIsEmpty(true);
    window.requestAnimationFrame(() => editor.focus());
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (mentionQuery !== null && mentionAgents.length > 0) {
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
        insertMention(mentionAgents[highlightIndex]!);
        return;
      }
    }

    if (mentionQuery !== null && event.key === "Escape") {
      event.preventDefault();
      closeMentions();
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
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    placeCaretAfter(node, node.length);
    syncEditor();
  };

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

  useEffect(() => {
    if (state.scriptedComposerText === null) return;
    insertTextAtCaret(state.scriptedComposerText);
    actions.setScriptedComposerText(null);
  }, [state.scriptedComposerText]);

  const stopVisible = Boolean(agent?.isRunning);
  const sendDisabled =
    (isEmpty && attachments.length === 0) || state.asr.isListening;

  return (
    <form
      className="relative z-[1] shrink-0 px-5 pb-3"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submit();
      }}
    >
      <div
        aria-hidden="true"
        className="baby-grok-bot-composer-fade pointer-events-none absolute inset-x-0 bottom-full h-12"
      />
      {attachments.length > 0 ? (
        <div aria-label="Pending context" className="baby-grok-bot-attachment-tray mb-2">
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
      <div className="baby-grok-bot-composer flex items-end gap-2 rounded-full px-2 py-2 transition-shadow focus-within:ring-1 focus-within:ring-[color:var(--grok-bot-current-agent-accent)] motion-reduce:transition-none">
        <AttachmentMenu
          agentId={agent?.id ?? state.activeAgentId}
          onAdd={(attachment) =>
            setAttachments((current) => [...current, attachment])
          }
          onOpenChange={setAttachmentMenuOpen}
          onOpenScreen={() =>
            actions.openScreen(
              { kind: "agent", agentId: agent?.id ?? state.activeAgentId },
              "agent",
            )
          }
          open={attachmentMenuOpen}
        />

        <div className="relative min-w-0 flex-1">
          {mentionQuery !== null ? (
            <div className="baby-grok-bot-mention-popover">
              <div
                className="baby-grok-bot-compose-results"
                id="grok-bot-mention-list"
                ref={mentionListRef}
                role="listbox"
              >
                {mentionAgents.length > 0 ? (
                  mentionAgents.map((candidate, index) => (
                    <button
                      aria-selected={index === highlightIndex}
                      className="baby-grok-bot-compose-result"
                      data-highlighted={index === highlightIndex || undefined}
                      key={candidate.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(candidate);
                      }}
                      onMouseEnter={() => setHighlightIndex(index)}
                      role="option"
                      type="button"
                    >
                      <AgentAvatar agent={candidate} size={20} />
                      <span className="min-w-0 flex-1 truncate text-[12px] leading-4 text-[color:var(--cursor-text-primary)]">
                        {candidate.name}
                      </span>
                      <span className="shrink-0 text-[11px] leading-4 text-[color:var(--cursor-text-tertiary)]">
                        {candidate.isGroup ? "Group" : "Agent"}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-4 text-center text-[13px] leading-5 text-[color:var(--cursor-text-tertiary)]">
                    No agents match @{mentionQuery.trim()}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div
            aria-autocomplete="list"
            aria-controls={mentionQuery !== null ? "grok-bot-mention-list" : undefined}
            aria-expanded={mentionQuery !== null}
            aria-label={resolvePlaceholder(agent)}
            aria-multiline="true"
            className="baby-grok-bot-composer-field-input"
            contentEditable
            data-empty={isEmpty ? "" : undefined}
            data-placeholder={resolvePlaceholder(agent)}
            onBlur={closeMentions}
            onInput={syncEditor}
            onKeyDown={handleKeyDown}
            onKeyUp={syncMentions}
            onMouseUp={syncMentions}
            onPaste={handlePaste}
            ref={editorRef}
            role="textbox"
            suppressContentEditableWarning
          />
        </div>

        {stopVisible ? (
          <button
            aria-label="Agent is working"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-fill-secondary)] text-[color:var(--cursor-text-secondary)]"
            disabled
            title="Agent is working"
            type="button"
          >
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-current" />
          </button>
        ) : (
          <>
            <AsrButton onCancel={() => editorRef.current?.focus()} />
            {!sendDisabled ? (
              <button
                aria-label="Send"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--grok-bot-fill-emphasis)] text-[color:var(--grok-bot-bubble-user-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
                type="submit"
              >
                <GrokBotIcon name="arrow-up" size={14} />
              </button>
            ) : null}
          </>
        )}
      </div>
    </form>
  );
}

export default Composer;
