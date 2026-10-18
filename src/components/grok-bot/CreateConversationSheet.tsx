import { useEffect, useId, type ReactNode } from "react";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface CreateConversationSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateChat: () => void;
  onCreateBot: () => void;
  onCreateGroup: () => void;
  className?: string;
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.25 17.75 4.5 20v-4.35A7.25 7.25 0 1 1 7.25 17.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 11.25h7M8.5 14.25h4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 10.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M3.75 18.75c0-2.9 2.35-5.25 5.25-5.25s5.25 2.35 5.25 5.25M15 13.75c2.9 0 5.25 2.24 5.25 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        height="12"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
        width="13"
        x="5.5"
        y="5.5"
      />
      <path
        d="M9 10h.01M15 10h.01M9.5 14h5M12 3v2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="m7.5 4.75 5.25 5.25L7.5 15.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

interface ConversationOptionProps {
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}

function ConversationOption({
  description,
  icon,
  onClick,
  title,
}: ConversationOptionProps) {
  return (
    <button
      className="baby-grok-bot-create-conversation-sheet__option"
      onClick={onClick}
      type="button"
    >
      <span className="baby-grok-bot-create-conversation-sheet__option-icon">
        {icon}
      </span>
      <span className="baby-grok-bot-create-conversation-sheet__option-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span
        aria-hidden="true"
        className="baby-grok-bot-create-conversation-sheet__option-chevron"
      >
        <ChevronIcon />
      </span>
    </button>
  );
}

export function CreateConversationSheet({
  open,
  onClose,
  onCreateChat,
  onCreateBot,
  onCreateGroup,
  className,
}: CreateConversationSheetProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const runAction = (action: () => void) => {
    try {
      action();
    } finally {
      onClose();
    }
  };

  return (
    <div
      className="baby-grok-bot-create-conversation-sheet-layer"
      data-state="open"
      role="presentation"
    >
      <button
        aria-label="Close create conversation"
        className="baby-grok-bot-create-conversation-sheet__backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn("baby-grok-bot-create-conversation-sheet", className)}
        role="dialog"
      >
        <span
          aria-hidden="true"
          className="baby-grok-bot-create-conversation-sheet__handle"
        />
        <header className="baby-grok-bot-create-conversation-sheet__header">
          <h2 id={titleId}>Start a conversation</h2>
          <p id={descriptionId}>
            Open a bot's private chat, create a bot, or bring several bots
            together.
          </p>
        </header>
        <div className="baby-grok-bot-create-conversation-sheet__options">
          <ConversationOption
            description="Choose a bot and open its private chat."
            icon={<ChatIcon />}
            onClick={() => runAction(onCreateChat)}
            title="Open chat"
          />
          <ConversationOption
            description="Create a reusable profile with tools and a computer."
            icon={<BotIcon />}
            onClick={() => runAction(onCreateBot)}
            title="New bot"
          />
          <ConversationOption
            description="Invite up to six bots into one shared conversation."
            icon={<GroupIcon />}
            onClick={() => runAction(onCreateGroup)}
            title="New group"
          />
        </div>
      </section>
    </div>
  );
}

export default CreateConversationSheet;
