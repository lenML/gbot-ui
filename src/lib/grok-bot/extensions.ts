import type {
  ComponentType,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";
import type {
  GrokBotAgent,
  GrokBotContent,
  GrokBotContextMenuState,
  GrokBotTranscriptEntry,
} from "./types";

export interface GrokBotConversationRowSlotProps {
  agent: GrokBotAgent;
  active: boolean;
  collapsed: boolean;
  onOpen(): void;
  onOpenMenu(menu: GrokBotContextMenuState): void;
  onContextMenu: MouseEventHandler<HTMLButtonElement>;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
}

export type GrokBotSlotSurface = "desktop" | "mobile";

export interface GrokBotChatHeaderSlotProps {
  agent?: GrokBotAgent;
  content: GrokBotContent;
  onBack?: () => void;
  surface: GrokBotSlotSurface;
}

export interface GrokBotTranscriptEntrySlotProps {
  children: ReactNode;
  entry: GrokBotTranscriptEntry;
  index: number;
  isLast: boolean;
}

export interface GrokBotComposerSlotProps {
  agent?: GrokBotAgent;
  children: ReactNode;
  surface: GrokBotSlotSurface;
}

export interface GrokBotSlots {
  conversationRow?: ComponentType<GrokBotConversationRowSlotProps>;
  chatHeader?: ComponentType<GrokBotChatHeaderSlotProps>;
  transcriptEntry?: ComponentType<GrokBotTranscriptEntrySlotProps>;
  composer?: ComponentType<GrokBotComposerSlotProps>;
}