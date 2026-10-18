import type { ReactNode } from "react";
import type { AgentHue, BabyGrokBotTheme } from "../types";
import type { AvatarShape } from "./avatarShapes";

export type GrokBotIconName =
  | "search"
  | "close"
  | "person"
  | "people"
  | "info"
  | "device-desktop"
  | "plus"
  | "mic"
  | "arrow-up"
  | "check"
  | "clock"
  | "globe"
  | "pencil"
  | "pencil-square"
  | "loading"
  | "check-circle"
  | "x-circle"
  | "trash"
  | "funnel-simple"
  | "gear"
  | "brain"
  | "image"
  | "link"
  | "chevron-left"
  | "git-branch"
  | "plus-minus"
  | "arrow-right-up";

export type GrokBotAttachmentKind = "photo" | "link" | "memory" | "screen";

export interface GrokBotPhotoAttachment {
  id: string;
  kind: "photo";
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  previewUrl?: string;
  objectUrl?: boolean;
}

export interface GrokBotLinkAttachment {
  id: string;
  kind: "link";
  url: string;
  title?: string;
}

export interface GrokBotMemoryAttachment {
  id: string;
  kind: "memory";
  memoryId: string;
  title: string;
  detail?: string;
}

export interface GrokBotScreenAttachment {
  id: string;
  kind: "screen";
  agentId: string;
  computerId?: string | null;
  label: string;
}

export type GrokBotMessageAttachment =
  | GrokBotPhotoAttachment
  | GrokBotLinkAttachment
  | GrokBotMemoryAttachment
  | GrokBotScreenAttachment;

export interface GrokBotOutgoingMessage {
  text: string;
  attachments: GrokBotMessageAttachment[];
}

export function isGrokBotObjectUrlPreview(
  attachment: GrokBotMessageAttachment,
): attachment is GrokBotPhotoAttachment {
  return (
    attachment.kind === "photo" &&
    Boolean(attachment.previewUrl) &&
    (attachment.objectUrl === true ||
      attachment.previewUrl?.startsWith("blob:") === true)
  );
}

export function withoutGrokBotTransientPreview(
  attachment: GrokBotMessageAttachment,
): GrokBotMessageAttachment {
  if (!isGrokBotObjectUrlPreview(attachment) || attachment.kind !== "photo") {
    return attachment;
  }

  return {
    id: attachment.id,
    kind: "photo",
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  };
}

export interface AgentStatus {
  icon: GrokBotIconName;
  label: string;
}
export interface AgentLastEntry {
  kind: "text" | "screen" | "file" | "routine";
  text: string;
}
export interface AgentAutomation {
  id: string;
  name: string;
  triggerDescription: string;
}
export interface AgentSetting {
  id: string;
  label: string;
  description?: string;
  isEnabled: boolean;
}
export interface ComposingBeat {
  state: string;
  label: string;
  minMs?: number;
  maxMs?: number;
}

export type GrokBotAvatarShape = AvatarShape;
export type GrokBotAvatarMotion =
  | "idle"
  | "thinking"
  | "working"
  | "listening"
  | "speaking"
  | "done"
  | "alert";

export interface GrokBotAvatarModel {
  shape: GrokBotAvatarShape;
  motion?: GrokBotAvatarMotion;
  seed?: number;
  color?: string;
}

export type GrokBotMessageSourceKind =
  | "agent"
  | "human"
  | "email"
  | "ide"
  | "slack"
  | "system";

export interface GrokBotMessageSource {
  id: string;
  kind: GrokBotMessageSourceKind;
  name: string;
  label?: string;
  hue?: AgentHue;
  avatarShape?: GrokBotAvatarShape;
}

export type GrokBotToolId =
  | "browser"
  | "terminal"
  | "files"
  | "email"
  | "calendar"
  | "github"
  | "slack"
  | "screen";

export interface AgentToolConfig {
  id: GrokBotToolId;
  label: string;
  description?: string;
  isEnabled: boolean;
  permission?: "ask" | "allow" | "deny";
}

export type GrokBotComputerKind = "local" | "cloud" | "vnc" | "remote";

export interface GrokBotComputerResource {
  id: string;
  label: string;
  kind: GrokBotComputerKind;
  endpoint?: string;
  status?: "available" | "busy" | "offline";
  capabilities?: string[];
}

export interface GrokBotComputerSession {
  id: string;
  agentId: string;
  resourceId: string | null;
  kind: GrokBotComputerKind;
  endpoint?: string;
  status: "idle" | "connecting" | "connected" | "disconnected" | "error";
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

export type GrokBotAsrPhase =
  | "unsupported"
  | "idle"
  | "requesting-permission"
  | "recording"
  | "processing"
  | "error";

export interface GrokBotAsrCapability {
  supported: boolean;
  partialResults: boolean;
  finalResults: boolean;
  permission?: "unknown" | "prompt" | "granted" | "denied";
  languages?: string[];
}

export interface GrokBotAsrState {
  phase: GrokBotAsrPhase;
  capability: GrokBotAsrCapability;
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error?: string;
}

export type GrokBotContextMenuTarget =
  | { kind: "agent"; agentId: string }
  | { kind: "message"; agentId: string; entryId: string }
  | { kind: "computer"; agentId: string; entryId?: string };

export interface GrokBotContextMenuState {
  target: GrokBotContextMenuTarget;
  x: number;
  y: number;
}

export interface GrokBotComputerAdapter {
  connect?(session: GrokBotComputerSession): void | Promise<void>;
  disconnect?(session: GrokBotComputerSession): void | Promise<void>;
  render(session: GrokBotComputerSession): ReactNode;
}

export interface GrokBotAsrAdapter {
  getCapability?(): GrokBotAsrCapability | Promise<GrokBotAsrCapability>;
  start(input: {
    agentId: string;
    onPhase?(phase: GrokBotAsrPhase): void;
    onPartial(text: string): void;
    onFinal(text: string): void;
    onError(error: unknown): void;
  }): void | Promise<void>;
  stop(): void | Promise<void>;
}

export type GrokBotReplyStreamEvent =
  | {
      type: "thinking";
      text: string;
      done?: boolean;
      durationMs?: number;
    }
  | { type: "text-delta"; delta: string }
  | { type: "done"; content?: string };

export interface GrokBotReplyStreamInput {
  agentId: string;
  conversationId: string;
  message: GrokBotOutgoingMessage;
  signal: AbortSignal;
}

export interface GrokBotReplyAdapter {
  stream(
    input: GrokBotReplyStreamInput,
  ): AsyncIterable<GrokBotReplyStreamEvent> | Promise<AsyncIterable<GrokBotReplyStreamEvent>>;
}

export interface GrokBotIntegrations {
  computer?: GrokBotComputerAdapter;
  asr?: GrokBotAsrAdapter;
  reply?: GrokBotReplyAdapter;
}

export interface GrokBotAgent {
  id: string;
  /** Stable bot profile ID. Direct chats with the same botId share this profile. */
  botId?: string;
  /** Private session title. Direct chats may have independent titles. */
  conversationTitle?: string;
  name: string;
  title?: string;
  description?: string;
  hue?: AgentHue;
  avatarModel?: GrokBotAvatarModel;
  lastEntry: AgentLastEntry | null;
  lastActivityAt: number;
  hasUnread: boolean;
  unreadCount?: number;
  isPinned?: boolean;
  isRunning: boolean;
  isComposingMessage: boolean;
  composingBeat?: ComposingBeat;
  status: AgentStatus | null;
  isGroup: boolean;
  memberIds: string[];
  members?: GrokBotGroupMember[];
  tools?: AgentToolConfig[];
  computerId?: string | null;
  automations?: AgentAutomation[];
  settings?: AgentSetting[];
}

export interface GrokBotGroupMember {
  id: string;
  name: string;
  title?: string;
  hue?: AgentHue;
  avatarModel?: GrokBotAvatarModel;
}

export type GrokBotSystemEvent =
  | { type: "renamed"; name: string }
  | { type: "created-routine"; name: string; triggerDescription?: string }
  | {
      type: "messaged-agents";
      targets: Array<{ name: string; hue?: AgentHue }>;
    }
  | {
      type: "shared-context";
      source: { name: string; hue?: AgentHue };
      summary: string;
    }
  | {
      type: "received-context";
      sources: Array<{ name: string; hue?: AgentHue }>;
    }
  | { type: "memory-updated"; agent: { name: string; hue?: AgentHue } };

interface BaseEntry {
  id: string;
  timestampMs?: number;
  reactions?: string[];
  streaming?: boolean;
  interrupted?: boolean;
  source?: GrokBotMessageSource;
}
export interface TranscriptTextEntry extends BaseEntry {
  kind: "message";
  role: "user" | "assistant";
  author?: string;
  content: string;
  attachments?: GrokBotMessageAttachment[];
}
export type TranscriptThinkingStatus = "thinking" | "complete" | "stopped";
export interface TranscriptThinkingEntry extends BaseEntry {
  kind: "thinking";
  text: string;
  durationMs?: number;
  status?: TranscriptThinkingStatus;
}
export interface TranscriptSendMessageEntry extends BaseEntry {
  kind: "send-message";
  author?: { name: string; hue?: AgentHue };
  message: { type: "text"; content: string };
}
export interface TranscriptSystemEntry extends BaseEntry {
  kind: "system";
  event: GrokBotSystemEvent;
}
export interface MultipleChoiceOption {
  id: string;
  label: string;
  description?: string;
}
export type MultipleChoiceAnswer =
  | { kind: "options"; optionIds: string[] }
  | { kind: "custom"; value: string }
  | null;
export interface TranscriptMultipleChoiceEntry extends BaseEntry {
  kind: "multiple-choice";
  question: string;
  hint?: string;
  selection: "single" | "multiple";
  options: MultipleChoiceOption[];
  allowCustomAnswer?: boolean;
  answer: MultipleChoiceAnswer;
  isDismissed?: boolean;
}
export type ComputerUseStatus =
  | "action-needed"
  | "handed-over"
  | "working"
  | "done";
export interface TranscriptComputerUseEntry extends BaseEntry {
  kind: "computer-use";
  instruction: string;
  ask?: string;
  status: ComputerUseStatus;
  screenKind?: string;
}
export interface TranscriptPullRequestEntry extends BaseEntry {
  kind: "pull-request";
  status: "creating" | "done";
  title: string;
  repository: string;
  branch?: string;
  number?: number;
  additions?: number;
  deletions?: number;
  url?: string;
}
export type OutboundMessageStatus = "ready" | "sending" | "sent" | "discarded";
export interface TranscriptOutboundMessageEntry extends BaseEntry {
  kind: "outbound-message";
  status: OutboundMessageStatus;
  subject: string;
  body: string;
  workspace: string;
  to: string;
  thread?: string;
  from: string;
  channel?: "email" | "slack";
}

export type GrokBotTranscriptEntry =
  | TranscriptTextEntry
  | TranscriptThinkingEntry
  | TranscriptSendMessageEntry
  | TranscriptSystemEntry
  | TranscriptMultipleChoiceEntry
  | TranscriptComputerUseEntry
  | TranscriptPullRequestEntry
  | TranscriptOutboundMessageEntry;

export interface GrokBotAgentContent {
  agent: GrokBotAgent;
  transcript: GrokBotTranscriptEntry[];
}
export interface GrokBotViewer {
  name: string;
  initials: string;
}
export interface GrokBotReply {
  match?: string | RegExp;
  entries: Array<
    | {
        kind: "message";
        content: string;
        pending?: ComposingBeat;
        thinking?: { text: string; durationMs?: number };
        chunkSize?: number;
        intervalMs?: number;
        source?: GrokBotMessageSource;
      }
    | {
        kind: "multiple-choice";
        question: string;
        hint?: string;
        selection?: "single" | "multiple";
        options: MultipleChoiceOption[];
        allowCustomAnswer?: boolean;
      }
    | {
        kind: "computer-use";
        instruction: string;
        ask?: string;
        screenKind?: string;
        autoResolveMs?: number;
      }
    | { kind: "complete-computer" }
    | {
        kind: "pull-request";
        title: string;
        repository: string;
        branch?: string;
        number?: number;
        additions?: number;
        deletions?: number;
        url?: string;
        createMs?: number;
      }
    | {
        kind: "outbound-message";
        subject: string;
        body: string;
        workspace: string;
        to: string;
        thread?: string;
        from: string;
        channel?: "email" | "slack";
        autoResolveMs?: number;
      }
    | { kind: "system"; event: GrokBotSystemEvent }
    | { kind: "rename"; name: string }
    | { kind: "react"; emoji: string }
  >;
}
export interface GrokBotContent {
  appName: string;
  viewer: GrokBotViewer;
  agents: GrokBotAgentContent[];
  replies: GrokBotReply[];
  settings: AgentSetting[];
  tools?: AgentToolConfig[];
  computers?: GrokBotComputerResource[];
}

export type GrokBotComposeMode = "chat" | "bot";

export type ScreenOverlayMode = "agent" | "takeover";
export interface ScreenOverlay {
  origin:
    | { kind: "agent"; agentId: string }
    | { kind: "entry"; entryId: string };
  mode: ScreenOverlayMode;
}

export interface GrokBotState {
  content: GrokBotContent;
  theme: BabyGrokBotTheme;
  /** Conversation rows. Kept as `agents` for source compatibility. */
  agents: GrokBotAgent[];
  /** Deduplicated direct bot profiles used by settings, mentions, and group creation. */
  botProfiles: GrokBotAgent[];
  transcripts: Record<string, GrokBotTranscriptEntry[]>;
  /** Legacy name for the active conversation ID. */
  activeAgentId: string;
  hiddenAgentIds: Set<string>;
  recentlyRevealedIds: Set<string>;
  isSidebarCollapsed: boolean;
  sidebarWidth: number;
  isDesktopPaneOpen: boolean;
  desktopPaneWidth: number;
  shellWidth: number;
  isComposingNew: boolean;
  composeMode: GrokBotComposeMode;
  composeQuery: string;
  screenOverlay: ScreenOverlay | null;
  isSettingsOpen: boolean;
  settingsAgentId: string | null;
  isCreateGroupOpen: boolean;
  groupDraftName: string;
  groupDraftMemberIds: string[];
  contextMenu: GrokBotContextMenuState | null;
  asr: GrokBotAsrState;
  draftAgentId: string | null;
  isPanelResizing: boolean;
  scriptedComposerText: string | null;
  scriptedScreen: unknown;
}

export interface GrokBotActions {
  openConversation(conversationId: string): void;
  openAgent(agentId: string): void;
  setTheme(theme: BabyGrokBotTheme): void;
  sendMessage(content: string | GrokBotOutgoingMessage): void;
  openScreen(origin: ScreenOverlay["origin"], mode: ScreenOverlayMode): void;
  closeScreen(): void;
  answerChoice(entryId: string, answer: MultipleChoiceAnswer): void;
  dismissChoice(entryId: string): void;
  openComputerScreen(entryId: string): void;
  takeOverComputer(entryId: string): void;
  handOverComputer(entryId: string): void;
  finishComputerTakeOver(entryId: string): void;
  handBackComputer(entryId: string): void;
  sendOutboundMessage(entryId: string): void;
  discardOutboundMessage(entryId: string): void;
  openCompose(mode?: GrokBotComposeMode): void;
  closeCompose(): void;
  setComposeMode(mode: GrokBotComposeMode): void;
  setComposeQuery(query: string): void;
  createAgent(name: string): void;
  /** Opens the bot's sole direct conversation, creating it only when absent. */
  createConversation(botId: string): string | null;
  renameConversation(conversationId: string, title: string): void;
  openCreateGroup(): void;
  closeCreateGroup(): void;
  setGroupDraftName(name: string): void;
  toggleGroupDraftMember(agentId: string): void;
  createGroup(name?: string): string | null;
  setGroupMembers(agentId: string, memberIds: string[]): void;
  addGroupMember(agentId: string, memberId: string): void;
  removeGroupMember(agentId: string, memberId: string): void;
  setAgentPinned(agentId: string, pinned: boolean): void;
  setAgentUnread(agentId: string, unread: boolean): void;
  hideAgent(agentId: string): void;
  deleteAgent(agentId: string): void;
  openSettings(agentId?: string): void;
  closeSettings(): void;
  updateAgentProfile(
    agentId: string,
    patch: Partial<
      Pick<GrokBotAgent, "name" | "title" | "description" | "avatarModel">
    >,
  ): void;
  setAgentToolEnabled(
    agentId: string,
    toolId: GrokBotToolId,
    enabled: boolean,
  ): void;
  assignAgentComputer(agentId: string, computerId: string | null): void;
  openContextMenu(menu: GrokBotContextMenuState): void;
  closeContextMenu(): void;
  startAsr(): void;
  stopAsr(): void;
  setAsrCapability(capability: GrokBotAsrCapability): void;
  setAsrPhase(phase: GrokBotAsrPhase): void;
  setAsrError(error?: string): void;
  setAsrPartial(text: string): void;
  commitAsrTranscript(text?: string): void;
  setSidebarCollapsed(collapsed: boolean): void;
  resizeSidebar(width: number): void;
  setShellWidth(width: number): void;
  setDesktopPaneOpen(open: boolean): void;
  resizeDesktopPane(width: number): void;
  setAgentSettingEnabled(
    agentId: string,
    settingId: string,
    enabled: boolean,
  ): void;
  startScript(agentId: string, reply: GrokBotReply): void;
  stopGenerating(agentId?: string): void;
  setScriptedComposerText(text: string | null): void;
  setScriptedScreen(screen: unknown): void;
  applyEndState(content: GrokBotContent, activeAgentId: string): void;
}
export interface GrokBotStoreValue {
  state: GrokBotState;
  actions: GrokBotActions;
}

export interface DesktopWindowContent {
  id: string;
  dockIcon?: "browser" | "mail" | "terminal" | ReactNode;
  dockLabel: string;
  defaultTop: number;
  defaultLeft: number;
  width: number;
  height: number;
  content: ReactNode;
  windowClassName?: string;
}

export const GROUP_MIN_MEMBERS = 1;
export const GROUP_MAX_MEMBERS = 6;
export const SIDEBAR_MIN_WIDTH = 218;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_COLLAPSE_AT_WIDTH = 218;
export const SIDEBAR_EXPAND_AT_WIDTH = 248;
export const DESKTOP_PANE_DEFAULT_WIDTH = 264;
export const DESKTOP_PANE_COLLAPSE_AT_WIDTH = 160;
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
export const desktopPaneMaxWidth = (shellWidth: number) =>
  Math.min(shellWidth * 0.45, 380);
