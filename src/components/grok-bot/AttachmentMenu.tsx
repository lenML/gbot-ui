import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type {
  GrokBotAttachmentKind,
  GrokBotIconName,
  GrokBotMessageAttachment,
} from "../../lib/grok-bot/types";
import { GrokBotIcon } from "./AgentAvatar";

/** @deprecated Use GrokBotAttachmentKind. */
export type MobileAttachmentKind = GrokBotAttachmentKind;

/** @deprecated Use GrokBotMessageAttachment. */
export type MobileAttachment = GrokBotMessageAttachment;

export interface AttachmentMenuProps {
  agentId: string;
  onAdd: (attachment: GrokBotMessageAttachment) => void;
  onOpenChange: (open: boolean) => void;
  onOpenScreen: () => void;
  open: boolean;
}

type MenuView = "root" | "link" | "memory";

const MEMORY_OPTIONS = [
  { id: "launch-notes", label: "Launch notes", detail: "Product launch checklist" },
  { id: "project-conventions", label: "Project conventions", detail: "Engineering conventions" },
  { id: "customer-feedback", label: "Customer feedback", detail: "Recent support themes" },
] as const;

const createAttachmentId = (kind: GrokBotAttachmentKind) =>
  `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function formatAttachmentSize(sizeBytes?: number): string {
  if (sizeBytes == null) return "";
  if (sizeBytes < 1_024) return `${sizeBytes} B`;
  if (sizeBytes < 1_048_576) return `${Math.max(1, Math.round(sizeBytes / 1_024))} KB`;
  return `${(sizeBytes / 1_048_576).toFixed(1)} MB`;
}

export function getAttachmentLabel(
  attachment: GrokBotMessageAttachment,
): string {
  switch (attachment.kind) {
    case "photo":
      return attachment.name;
    case "link":
      return attachment.title?.trim() || attachment.url;
    case "memory":
      return attachment.title;
    case "screen":
      return attachment.label;
  }
}

export function getAttachmentDetail(
  attachment: GrokBotMessageAttachment,
): string {
  switch (attachment.kind) {
    case "photo":
      return [attachment.mimeType, formatAttachmentSize(attachment.sizeBytes)]
        .filter(Boolean)
        .join(" / ");
    case "link":
      return attachment.title?.trim() ? attachment.url : "Link";
    case "memory":
      return attachment.detail || attachment.memoryId;
    case "screen":
      return attachment.computerId
        ? `${attachment.agentId} / ${attachment.computerId}`
        : attachment.agentId;
  }
}

export function getAttachmentIconName(
  attachment: GrokBotMessageAttachment,
): GrokBotIconName {
  switch (attachment.kind) {
    case "photo":
      return "image";
    case "link":
      return "link";
    case "memory":
      return "brain";
    case "screen":
      return "device-desktop";
  }
}

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="baby-grok-bot-attachment-menu__icon">
      {children}
    </span>
  );
}

export function AttachmentMenu({
  agentId,
  onAdd,
  onOpenChange,
  onOpenScreen,
  open,
}: AttachmentMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<MenuView>("root");
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const close = (restoreFocus = false) => {
    onOpenChange(false);
    setView("root");
    setLinkError(null);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!rootRef.current?.contains(event.target)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setView("root");
      setLinkValue("");
      setLinkError(null);
    }
  }, [open]);

  useEffect(() => {
    if (view !== "link") return;
    window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLInputElement>("[data-link-input]")?.focus();
    });
  }, [view]);

  const addLink = () => {
    const value = linkValue.trim();
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      onAdd({
        id: createAttachmentId("link"),
        kind: "link",
        title: url.hostname,
        url: value,
      });
      setLinkValue("");
      close();
    } catch {
      setLinkError("Enter a valid http or https URL.");
    }
  };

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    for (const file of files) {
      onAdd({
        id: createAttachmentId("photo"),
        kind: "photo",
        mimeType: file.type || undefined,
        name: file.name,
        objectUrl: true,
        previewUrl: URL.createObjectURL(file),
        sizeBytes: file.size,
      });
    }
    event.target.value = "";
    if (files.length > 0) close();
  };

  const addMemory = (memory: (typeof MEMORY_OPTIONS)[number]) => {
    onAdd({
      detail: memory.detail,
      id: createAttachmentId("memory"),
      kind: "memory",
      memoryId: memory.id,
      title: memory.label,
    });
    close();
  };

  const addScreen = () => {
    onAdd({
      agentId,
      id: createAttachmentId("screen"),
      kind: "screen",
      label: "Agent screen",
    });
    close();
    onOpenScreen();
  };

  return (
    <div className="baby-grok-bot-attachment" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Add context"
        className="baby-grok-bot-attachment__trigger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
        onClick={() => onOpenChange(!open)}
        ref={triggerRef}
        type="button"
      >
        <GrokBotIcon name="plus" size={16} />
      </button>

      <input
        accept="image/*"
        className="sr-only"
        multiple
        onChange={addPhotos}
        ref={inputRef}
        type="file"
      />

      {open ? (
        <div
          aria-label="Add context"
          className="baby-grok-bot-attachment-menu"
          role={view === "root" ? "menu" : "dialog"}
        >
          {view === "root" ? (
            <>
              <button
                className="baby-grok-bot-attachment-menu__item"
                onClick={() => inputRef.current?.click()}
                role="menuitem"
                type="button"
              >
                <MenuIcon><GrokBotIcon name="image" size={15} /></MenuIcon>
                <span><strong>Photo</strong><small>Add images from this device</small></span>
              </button>
              <button
                className="baby-grok-bot-attachment-menu__item"
                onClick={() => setView("link")}
                role="menuitem"
                type="button"
              >
                <MenuIcon><GrokBotIcon name="link" size={15} /></MenuIcon>
                <span><strong>Link</strong><small>Reference a web page</small></span>
              </button>
              <button
                className="baby-grok-bot-attachment-menu__item"
                onClick={() => setView("memory")}
                role="menuitem"
                type="button"
              >
                <MenuIcon><GrokBotIcon name="brain" size={15} /></MenuIcon>
                <span><strong>Memory</strong><small>Attach saved context</small></span>
              </button>
              <button
                className="baby-grok-bot-attachment-menu__item"
                onClick={addScreen}
                role="menuitem"
                type="button"
              >
                <MenuIcon><GrokBotIcon name="device-desktop" size={15} /></MenuIcon>
                <span><strong>Screen</strong><small>Attach and open agent screen</small></span>
              </button>
            </>
          ) : view === "link" ? (
            <div className="baby-grok-bot-attachment-menu__editor">
              <label htmlFor={`grok-link-${agentId}`}>Link URL</label>
              <input
                aria-invalid={Boolean(linkError)}
                data-link-input=""
                id={`grok-link-${agentId}`}
                onChange={(event) => {
                  setLinkValue(event.target.value);
                  setLinkError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLink();
                  }
                }}
                placeholder="https://example.com"
                type="url"
                value={linkValue}
              />
              {linkError ? <p role="alert">{linkError}</p> : null}
              <div className="baby-grok-bot-attachment-menu__actions">
                <button onClick={() => setView("root")} type="button">Back</button>
                <button disabled={!linkValue.trim()} onClick={addLink} type="button">Add link</button>
              </div>
            </div>
          ) : (
            <div className="baby-grok-bot-attachment-menu__editor">
              <div className="baby-grok-bot-attachment-menu__heading">
                <button aria-label="Back" onClick={() => setView("root")} type="button">
                  <GrokBotIcon name="chevron-left" size={13} />
                </button>
                <strong>Memory</strong>
              </div>
              {MEMORY_OPTIONS.map((memory) => (
                <button
                  className="baby-grok-bot-attachment-menu__memory"
                  key={memory.id}
                  onClick={() => addMemory(memory)}
                  type="button"
                >
                  <span>{memory.label}</span>
                  <small>{memory.detail}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AttachmentMenu;
