import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { BabyGrokBotTheme } from "../types";
import { DEFAULT_DEMO_CONTENT } from "./demoContent";
import type { GrokBotSlots } from "./extensions";
import { formatChoiceAnswer, formatSystemEvent } from "./format";
import {
  DESKTOP_PANE_COLLAPSE_AT_WIDTH,
  DESKTOP_PANE_DEFAULT_WIDTH,
  GROUP_MAX_MEMBERS,
  GROUP_MIN_MEMBERS,
  SIDEBAR_COLLAPSE_AT_WIDTH,
  SIDEBAR_EXPAND_AT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clamp,
  desktopPaneMaxWidth,
  withoutGrokBotTransientPreview,
} from "./types";
import type {
  AgentSetting,
  AgentToolConfig,
  ComposingBeat,
  ComputerUseStatus,
  GrokBotActions,
  GrokBotAgent,
  GrokBotAsrCapability,
  GrokBotAsrPhase,
  GrokBotContent,
  GrokBotContextMenuState,
  GrokBotGroupMember,
  GrokBotIntegrations,
  GrokBotOutgoingMessage,
  GrokBotReply,
  GrokBotState,
  GrokBotStoreValue,
  GrokBotToolId,
  GrokBotTranscriptEntry,
  MultipleChoiceAnswer,
  OutboundMessageStatus,
  ScreenOverlay,
} from "./types";

const SIDEBAR_DEFAULT_WIDTH = 280;
const THEME_STORAGE_KEY = "baby-grok-bot-theme";
const EMPTY_TRANSCRIPT: GrokBotTranscriptEntry[] = [];
const DEFAULT_ASR_CAPABILITY: GrokBotAsrCapability = {
  supported: true,
  partialResults: true,
  finalResults: true,
  permission: "unknown",
};
let liveCounter = 0;

function isBabyGrokBotTheme(value: unknown): value is BabyGrokBotTheme {
  return (
    value === "auto" ||
    value === "cursor-light" ||
    value === "cursor-dark"
  );
}

function readStoredTheme(): BabyGrokBotTheme {
  if (typeof window === "undefined") return "auto";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isBabyGrokBotTheme(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

function writeStoredTheme(theme: BabyGrokBotTheme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked in embedded or private contexts.
  }
}

function createDefaultAsrState() {
  return {
    phase: "idle" as const,
    capability: { ...DEFAULT_ASR_CAPABILITY },
    isListening: false,
    isSupported: true,
    transcript: "",
    interimTranscript: "",
  };
}

function isActiveAsrPhase(phase: GrokBotAsrPhase): boolean {
  return (
    phase === "requesting-permission" ||
    phase === "recording" ||
    phase === "processing"
  );
}

function createLiveId(): string {
  liveCounter += 1;
  return `live-${Date.now().toString(36)}-${liveCounter}`;
}

function summarize(text: string): string {
  return text
    .replace(/[*_`#|]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function canonicalMemberIds(memberIds: string[]): string[] {
  return [...new Set(memberIds)].sort();
}

function groupMembersFromIds(
  agents: GrokBotAgent[],
  memberIds: string[],
): GrokBotGroupMember[] {
  return memberIds
    .map((id) => agents.find((agent) => agent.id === id))
    .filter((agent): agent is GrokBotAgent => Boolean(agent))
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      title: agent.title,
      hue: agent.hue,
      avatarModel: agent.avatarModel,
    }));
}

function agentsFromContent(content: GrokBotContent): GrokBotAgent[] {
  return content.agents.map(({ agent }) => ({
    ...agent,
    settings:
      agent.settings ?? content.settings.map((setting: AgentSetting) => ({ ...setting })),
    tools:
      agent.tools ??
      content.tools?.map((tool: AgentToolConfig) => ({ ...tool })) ??
      [],
    computerId: agent.computerId ?? content.computers?.[0]?.id ?? null,
  }));
}

function findReplyScript(
  replies: GrokBotReply[],
  text: string,
): GrokBotReply | undefined {
  const normalized = text.toLowerCase();

  for (const reply of replies) {
    if (reply.match == null) continue;
    if (typeof reply.match === "string") {
      if (normalized.includes(reply.match.toLowerCase())) return reply;
      continue;
    }

    reply.match.lastIndex = 0;
    const matches = reply.match.test(text);
    reply.match.lastIndex = 0;
    if (matches) return reply;
  }

  return replies.find((reply) => reply.match == null) ?? replies.at(-1);
}

export interface GrokBotStoreActions extends GrokBotActions {
  setPanelResizing(isResizing: boolean): void;
}

export interface GrokBotStoreSnapshot extends GrokBotStoreValue, GrokBotState {
  actions: GrokBotStoreActions;
}

interface InternalGrokBotStore extends GrokBotStoreValue {
  actions: GrokBotStoreActions;
  subscribe(listener: () => void): () => void;
  getSnapshot(): GrokBotStoreSnapshot;
  activate(): void;
  deactivate(): void;
  disposeIfInactive(): void;
}

function createGrokBotStore(
  content: GrokBotContent,
  requestedActiveAgentId?: string,
  requestedTheme?: BabyGrokBotTheme,
): InternalGrokBotStore {
  const agents = agentsFromContent(content);
  const activeAgentId =
    requestedActiveAgentId && agents.some((agent) => agent.id === requestedActiveAgentId)
      ? requestedActiveAgentId
      : agents[0]?.id ?? "";

  let state: GrokBotState = {
    content,
    theme: requestedTheme ?? readStoredTheme(),
    agents,
    transcripts: Object.fromEntries(
      content.agents.map(({ agent, transcript }) => [agent.id, transcript]),
    ),
    activeAgentId,
    hiddenAgentIds: new Set<string>(),
    recentlyRevealedIds: new Set<string>(),
    isSidebarCollapsed: false,
    sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
    isDesktopPaneOpen: false,
    desktopPaneWidth: DESKTOP_PANE_DEFAULT_WIDTH,
    shellWidth: 0,
    isComposingNew: false,
     composeQuery: "",
     screenOverlay: null,
     isSettingsOpen: false,
     settingsAgentId: null,
     isCreateGroupOpen: false,
     groupDraftName: "",
     groupDraftMemberIds: [],
     contextMenu: null,
     asr: createDefaultAsrState(),
     draftAgentId: null,
    isPanelResizing: false,
    scriptedComposerText: null,
    scriptedScreen: null,
  };

  let actions = {} as GrokBotStoreActions;
  let value: GrokBotStoreSnapshot = { ...state, state, actions };
  let disposed = false;
  let activeMounts = 0;
  let sidebarWasExpandedBeforePane = false;
  let scriptEpoch = 0;

  const listeners = new Set<() => void>();
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>();
  const scriptControllers = new Set<AbortController>();
  const agentScriptControllers = new Map<string, Set<AbortController>>();
  const activeScriptCounts = new Map<string, number>();
  const entryWaiters = new Map<string, Set<() => void>>();

  function commit(patch: Partial<GrokBotState>): void {
    if (disposed) return;
    state = { ...state, ...patch };
    value = { ...state, state, actions };
    for (const listener of listeners) listener();
  }

  function scheduleTimeout(callback: () => void, delayMs: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
      if (timer == null) return;
      if (timers.delete(timer)) clearTimeout(timer);
      timer = undefined;
    };

    timer = setTimeout(() => {
      if (timer != null) timers.delete(timer);
      timer = undefined;
      callback();
    }, Math.max(0, delayMs));
    timers.set(timer, cancel);
    return cancel;
  }

  function cancelRuntime(): void {
    scriptEpoch += 1;
    for (const controller of scriptControllers) controller.abort();
    scriptControllers.clear();
    agentScriptControllers.clear();
    for (const cancel of [...timers.values()]) cancel();
    timers.clear();
    for (const waiters of entryWaiters.values()) {
      for (const waiter of [...waiters]) waiter();
    }
    entryWaiters.clear();
    activeScriptCounts.clear();
  }

  function destroy(): void {
    if (disposed) return;
    cancelRuntime();
    disposed = true;
    listeners.clear();
  }

  function setTheme(theme: BabyGrokBotTheme): void {
    if (!isBabyGrokBotTheme(theme) || state.theme === theme) return;
    commit({ theme });
    writeStoredTheme(theme);
  }

  function updateAgent(agentId: string, patch: Partial<GrokBotAgent>): void {
    if (!state.agents.some((agent) => agent.id === agentId)) return;
    commit({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...patch } : agent,
      ),
    });
  }

  function clearUnread(agentId: string): void {
    updateAgent(agentId, { hasUnread: false, unreadCount: 0 });
  }

  function appendEntry(agentId: string, entry: GrokBotTranscriptEntry): void {
    const transcript = state.transcripts[agentId] ?? [];
    const patch: Partial<GrokBotState> = {
      transcripts: {
        ...state.transcripts,
        [agentId]: [...transcript, entry],
      },
    };
    if (state.draftAgentId === agentId) patch.draftAgentId = null;
    commit(patch);
  }

  function updateEntry(
    agentId: string,
    entryId: string,
    updater: (entry: GrokBotTranscriptEntry) => GrokBotTranscriptEntry,
  ): void {
    const transcript = state.transcripts[agentId] ?? [];
    if (!transcript.some((entry) => entry.id === entryId)) return;
    commit({
      transcripts: {
        ...state.transcripts,
        [agentId]: transcript.map((entry) =>
          entry.id === entryId ? updater(entry) : entry,
        ),
      },
    });
  }

  function findEntry(
    entryId: string,
  ): { agentId: string; entry: GrokBotTranscriptEntry } | null {
    for (const [agentId, transcript] of Object.entries(state.transcripts)) {
      const entry = transcript.find((candidate) => candidate.id === entryId);
      if (entry) return { agentId, entry };
    }
    return null;
  }

  function signalEntry(entryId: string): void {
    const waiters = entryWaiters.get(entryId);
    if (!waiters) return;
    for (const waiter of [...waiters]) waiter();
  }

  function setComputerStatus(
    entryId: string,
    status: ComputerUseStatus,
  ): boolean {
    const found = findEntry(entryId);
    if (!found || found.entry.kind !== "computer-use") return false;
    updateEntry(found.agentId, entryId, (entry) =>
      entry.kind === "computer-use" ? { ...entry, status } : entry,
    );
    signalEntry(entryId);
    return true;
  }

  function setOutboundStatus(
    entryId: string,
    status: OutboundMessageStatus,
  ): boolean {
    const found = findEntry(entryId);
    if (!found || found.entry.kind !== "outbound-message") return false;
    updateEntry(found.agentId, entryId, (entry) =>
      entry.kind === "outbound-message" ? { ...entry, status } : entry,
    );
    signalEntry(entryId);
    return true;
  }

  function sleep(delayMs: number, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      let cancelTimer: (() => void) | undefined;
      const onAbort = () => finish(false);

      function finish(completed: boolean): void {
        if (settled) return;
        settled = true;
        cancelTimer?.();
        signal.removeEventListener("abort", onAbort);
        resolve(completed);
      }

      signal.addEventListener("abort", onAbort, { once: true });
      cancelTimer = scheduleTimeout(() => finish(true), delayMs);
    });
  }

  type EntryWaitResult = "entry" | "timeout" | "abort";

  function waitForEntry(
    entryId: string,
    timeoutMs: number | undefined,
    signal: AbortSignal,
  ): Promise<EntryWaitResult> {
    if (signal.aborted) return Promise.resolve("abort");

    return new Promise((resolve) => {
      let settled = false;
      let cancelTimer: (() => void) | undefined;
      let waiters: Set<() => void> | undefined;
      const onAbort = () => finish("abort");
      const waiter = () => finish("entry");

      function finish(result: EntryWaitResult): void {
        if (settled) return;
        settled = true;
        cancelTimer?.();
        waiters?.delete(waiter);
        if (waiters?.size === 0) entryWaiters.delete(entryId);
        signal.removeEventListener("abort", onAbort);
        resolve(result);
      }

      waiters = entryWaiters.get(entryId) ?? new Set<() => void>();
      waiters.add(waiter);
      entryWaiters.set(entryId, waiters);
      signal.addEventListener("abort", onAbort, { once: true });
      if (timeoutMs != null) {
        cancelTimer = scheduleTimeout(() => finish("timeout"), timeoutMs);
      }
      if (signal.aborted) finish("abort");
    });
  }

  function messageDelay(content: string, beat?: ComposingBeat): number {
    let delayMs = Math.min(1_900 + 22 * content.split(" ").length, 3_000);
    if (beat?.minMs != null) delayMs = Math.max(delayMs, beat.minMs);
    if (beat?.maxMs != null) delayMs = Math.min(delayMs, beat.maxMs);
    return delayMs;
  }

  function startScript(agentId: string, reply: GrokBotReply): void {
    if (!state.agents.some((agent) => agent.id === agentId)) return;

    const controller = new AbortController();
    const generation = scriptEpoch;
    scriptControllers.add(controller);
    const controllers =
      agentScriptControllers.get(agentId) ?? new Set<AbortController>();
    controllers.add(controller);
    agentScriptControllers.set(agentId, controllers);
    activeScriptCounts.set(agentId, (activeScriptCounts.get(agentId) ?? 0) + 1);
    updateAgent(agentId, { isRunning: true });

    void executeScript(agentId, reply, controller.signal, generation)
      .catch(() => undefined)
      .finally(() => {
        scriptControllers.delete(controller);
        const agentControllers = agentScriptControllers.get(agentId);
        agentControllers?.delete(controller);
        if (agentControllers?.size === 0) {
          agentScriptControllers.delete(agentId);
        }
        const remaining = Math.max(0, (activeScriptCounts.get(agentId) ?? 1) - 1);
        if (remaining === 0) activeScriptCounts.delete(agentId);
        else activeScriptCounts.set(agentId, remaining);
        if (generation === scriptEpoch && !controller.signal.aborted) {
          updateAgent(agentId, { isRunning: remaining > 0 });
        }
      });
  }

  async function executeScript(
    agentId: string,
    reply: GrokBotReply,
    signal: AbortSignal,
    generation: number,
  ): Promise<void> {
    const cancelled = () => signal.aborted || generation !== scriptEpoch;

    for (const step of reply.entries) {
      if (cancelled()) return;

      switch (step.kind) {
        case "message": {
          const composingBeat = step.pending;
          updateAgent(agentId, {
            isComposingMessage: true,
            composingBeat,
          });
          const completed = await sleep(
            messageDelay(step.content, composingBeat),
            signal,
          );
          if (!completed || cancelled()) return;

          const responder = state.agents.find((agent) => agent.id === agentId);
          const sourceAgent = responder?.isGroup
            ? responder.members?.[0]
            : responder;
          const replySource = step.source ?? {
            id: sourceAgent?.id ?? agentId,
            kind: "agent" as const,
            name: sourceAgent?.name ?? responder?.name ?? "Agent",
            hue: sourceAgent?.hue ?? responder?.hue,
            avatarShape: sourceAgent?.avatarModel?.shape,
          };
          appendEntry(agentId, {
            kind: "send-message",
            id: createLiveId(),
            timestampMs: Date.now(),
            author: { name: replySource.name, hue: replySource.hue },
            source: replySource,
            message: { type: "text", content: step.content },
          });

          const currentAgent = state.agents.find((agent) => agent.id === agentId);
          const isUnread = state.activeAgentId !== agentId;
          updateAgent(agentId, {
            isComposingMessage: false,
            composingBeat: undefined,
            lastEntry: { kind: "text", text: summarize(step.content) },
            lastActivityAt: Date.now(),
            hasUnread: isUnread,
            unreadCount: isUnread ? (currentAgent?.unreadCount ?? 0) + 1 : 0,
          });
          break;
        }

        case "multiple-choice": {
          appendEntry(agentId, {
            kind: "multiple-choice",
            id: createLiveId(),
            question: step.question,
            hint: step.hint,
            selection: step.selection ?? "single",
            options: step.options,
            allowCustomAnswer: step.allowCustomAnswer ?? false,
            answer: null,
            timestampMs: Date.now(),
          });
          updateAgent(agentId, {
            lastEntry: { kind: "text", text: summarize(step.question) },
            lastActivityAt: Date.now(),
          });
          break;
        }

        case "computer-use": {
          const entryId = createLiveId();
          appendEntry(agentId, {
            kind: "computer-use",
            id: entryId,
            instruction: step.instruction,
            ask: step.ask,
            status: "action-needed",
            screenKind: step.screenKind,
            timestampMs: Date.now(),
          });

          let waitResult = await waitForEntry(
            entryId,
            step.autoResolveMs ?? 7_000,
            signal,
          );
          if (waitResult === "abort" || cancelled()) return;

          let found = findEntry(entryId);
          if (found?.entry.kind === "computer-use" && found.entry.status === "handed-over") {
            waitResult = await waitForEntry(entryId, undefined, signal);
            if (waitResult === "abort" || cancelled()) return;
            found = findEntry(entryId);
          }

          if (
            found?.entry.kind === "computer-use" &&
            found.entry.status === "action-needed"
          ) {
            setComputerStatus(entryId, "done");
          }
          break;
        }

        case "complete-computer": {
          const transcript = state.transcripts[agentId] ?? [];
          for (let index = transcript.length - 1; index >= 0; index -= 1) {
            const entry = transcript[index];
            if (entry?.kind === "computer-use" && entry.status !== "done") {
              setComputerStatus(entry.id, "done");
              break;
            }
          }
          break;
        }

        case "pull-request": {
          const entryId = createLiveId();
          appendEntry(agentId, {
            kind: "pull-request",
            id: entryId,
            status: "creating",
            title: step.title,
            repository: step.repository,
            branch: step.branch,
            number: step.number,
            additions: step.additions,
            deletions: step.deletions,
            url: step.url,
            timestampMs: Date.now(),
          });
          updateAgent(agentId, {
            lastEntry: { kind: "text", text: summarize(step.title) },
            lastActivityAt: Date.now(),
          });

          const completed = await sleep(step.createMs ?? 2_400, signal);
          if (!completed || cancelled()) return;
          updateEntry(agentId, entryId, (entry) =>
            entry.kind === "pull-request" ? { ...entry, status: "done" } : entry,
          );
          break;
        }

        case "outbound-message": {
          const entryId = createLiveId();
          appendEntry(agentId, {
            kind: "outbound-message",
            id: entryId,
            status: "ready",
            subject: step.subject,
            body: step.body,
            workspace: step.workspace,
            to: step.to,
            thread: step.thread,
            from: step.from,
            channel: step.channel,
            timestampMs: Date.now(),
          });
          updateAgent(agentId, {
            lastEntry: {
              kind: "text",
              text: step.channel === "slack" ? "Slack message" : "Draft email",
            },
            lastActivityAt: Date.now(),
          });

          const waitResult = await waitForEntry(
            entryId,
            step.autoResolveMs ?? 9_000,
            signal,
          );
          if (waitResult === "abort" || cancelled()) return;

          const found = findEntry(entryId);
          if (found?.entry.kind === "outbound-message" && found.entry.status === "ready") {
            sendOutboundMessage(entryId);
            const sent = await sleep(1_600, signal);
            if (!sent || cancelled()) return;
          }
          break;
        }

        case "system": {
          appendEntry(agentId, {
            kind: "system",
            id: createLiveId(),
            event: step.event,
            timestampMs: Date.now(),
          });
          const formatted = formatSystemEvent(step.event);
          updateAgent(agentId, {
            lastEntry: {
              kind: "text",
              text: `${formatted.lead} ${formatted.target}`.trim(),
            },
            lastActivityAt: Date.now(),
          });

          if (step.event.type === "created-routine") {
            const agent = state.agents.find((candidate) => candidate.id === agentId);
            updateAgent(agentId, {
              automations: [
                ...(agent?.automations ?? []),
                {
                  id: createLiveId(),
                  name: step.event.name,
                  triggerDescription: step.event.triggerDescription ?? "Scheduled",
                },
              ],
            });
          }
          break;
        }

        case "rename": {
          updateAgent(agentId, { name: step.name });
          appendEntry(agentId, {
            kind: "system",
            id: createLiveId(),
            event: { type: "renamed", name: step.name },
            timestampMs: Date.now(),
          });
          break;
        }

        case "react": {
          const transcript = state.transcripts[agentId] ?? [];
          const latest = transcript.at(-1);
          if (!latest) break;
          updateEntry(agentId, latest.id, (entry) =>
            entry.reactions?.includes(step.emoji)
              ? entry
              : { ...entry, reactions: [...(entry.reactions ?? []), step.emoji] },
          );
          break;
        }
      }
    }
  }

  function setDesktopPaneOpen(open: boolean): void {
    if (open === state.isDesktopPaneOpen) return;
    if (open) {
      sidebarWasExpandedBeforePane = !state.isSidebarCollapsed;
      commit({ isDesktopPaneOpen: true, isSidebarCollapsed: true });
      return;
    }

    const restoreSidebar = sidebarWasExpandedBeforePane;
    sidebarWasExpandedBeforePane = false;
    commit({
      isDesktopPaneOpen: false,
      isSidebarCollapsed: restoreSidebar ? false : state.isSidebarCollapsed,
    });
  }

  function openAgent(agentId: string): void {
    if (!state.agents.some((agent) => agent.id === agentId)) return;
    if (agentId === state.activeAgentId) {
      commit({
        isComposingNew: false,
        composeQuery: "",
        settingsAgentId: state.isSettingsOpen ? agentId : state.settingsAgentId,
      });
      clearUnread(agentId);
      return;
    }

    const draftAgentId = state.draftAgentId;
    const transcripts =
      draftAgentId && draftAgentId !== agentId
        ? Object.fromEntries(
            Object.entries(state.transcripts).filter(([id]) => id !== draftAgentId),
          )
        : state.transcripts;
    const nextAgents =
      draftAgentId && draftAgentId !== agentId
        ? state.agents.filter((agent) => agent.id !== draftAgentId)
        : state.agents;

    commit({
      agents: nextAgents,
      transcripts,
      activeAgentId: agentId,
      draftAgentId:
        draftAgentId && draftAgentId !== agentId ? null : state.draftAgentId,
      isComposingNew: false,
      composeQuery: "",
      settingsAgentId: state.isSettingsOpen ? agentId : state.settingsAgentId,
    });
    clearUnread(agentId);
  }

  function sendMessage(contentValue: string | GrokBotOutgoingMessage): void {
    const outgoing =
      typeof contentValue === "string"
        ? { text: contentValue, attachments: [] }
        : contentValue;
    const message = outgoing.text.trim();
    const attachments = (outgoing.attachments ?? [])
      .map(withoutGrokBotTransientPreview)
      .map((attachment) => ({ ...attachment }));
    if (!message && attachments.length === 0) return;

    const agentId = state.activeAgentId;
    if (!state.agents.some((agent) => agent.id === agentId)) return;

    appendEntry(agentId, {
      kind: "message",
      id: createLiveId(),
      role: "user",
      content: message,
      ...(attachments.length > 0 ? { attachments } : {}),
      timestampMs: Date.now(),
      source: {
        id: "viewer",
        kind: "human",
        name: state.content.viewer.name,
      },
    });
    updateAgent(agentId, {
      lastEntry: {
        kind: "text",
        text: summarize(
          message || attachments.map((attachment) => attachment.kind).join(", "),
        ),
      },
      lastActivityAt: Date.now(),
    });

    const matchText =
      message || attachments.map((attachment) => attachment.kind).join(" ");
    const reply = findReplyScript(state.content.replies, matchText);
    if (reply) startScript(agentId, reply);
  }

  function openScreen(
    origin: ScreenOverlay["origin"],
    mode: ScreenOverlay["mode"],
  ): void {
    commit({ screenOverlay: { origin, mode } });
  }

  function closeScreen(): void {
    commit({ screenOverlay: null });
  }

  function answerChoice(entryId: string, answer: MultipleChoiceAnswer): void {
    const found = findEntry(entryId);
    if (!found || found.entry.kind !== "multiple-choice") return;
    if (found.entry.answer != null || found.entry.isDismissed) return;
    if (answer == null) return;

    const choice = found.entry;
    updateEntry(found.agentId, entryId, (entry) =>
      entry.kind === "multiple-choice" ? { ...entry, answer } : entry,
    );

    const text = formatChoiceAnswer(answer, choice.options);
    if (!text) return;

    appendEntry(found.agentId, {
      kind: "message",
      id: createLiveId(),
      role: "user",
      content: text,
      timestampMs: Date.now(),
    });
    updateAgent(found.agentId, {
      lastEntry: { kind: "text", text: summarize(text) },
      lastActivityAt: Date.now(),
    });

    const reply = findReplyScript(state.content.replies, text);
    if (reply) startScript(found.agentId, reply);
  }

  function dismissChoice(entryId: string): void {
    const found = findEntry(entryId);
    if (!found || found.entry.kind !== "multiple-choice") return;
    updateEntry(found.agentId, entryId, (entry) =>
      entry.kind === "multiple-choice" ? { ...entry, isDismissed: true } : entry,
    );
  }

  function openComputerScreen(entryId: string): void {
    commit({
      screenOverlay: {
        origin: { kind: "entry", entryId },
        mode: "agent",
      },
    });
  }

  function takeOverComputer(entryId: string): void {
    if (!setComputerStatus(entryId, "handed-over")) return;
    commit({
      screenOverlay: {
        origin: { kind: "entry", entryId },
        mode: "takeover",
      },
    });
  }

  function handOverComputer(entryId: string): void {
    setComputerStatus(entryId, "handed-over");
  }

  function finishComputerTakeOver(entryId: string): void {
    setComputerStatus(entryId, "done");
    commit({ screenOverlay: null });
  }

  function handBackComputer(entryId: string): void {
    if (!setComputerStatus(entryId, "working")) return;
    commit({ screenOverlay: null });
  }

  function sendOutboundMessage(entryId: string): void {
    const found = findEntry(entryId);
    if (
      !found ||
      found.entry.kind !== "outbound-message" ||
      found.entry.status !== "ready"
    ) {
      return;
    }

    setOutboundStatus(entryId, "sending");
    scheduleTimeout(() => {
      const current = findEntry(entryId);
      if (
        current?.entry.kind === "outbound-message" &&
        current.entry.status === "sending"
      ) {
        setOutboundStatus(entryId, "sent");
      }
    }, 1_600);
  }

  function discardOutboundMessage(entryId: string): void {
    const found = findEntry(entryId);
    if (
      !found ||
      found.entry.kind !== "outbound-message" ||
      found.entry.status === "sent" ||
      found.entry.status === "discarded"
    ) {
      return;
    }
    setOutboundStatus(entryId, "discarded");
  }

  function openCompose(): void {
    setDesktopPaneOpen(false);
    commit({
      isComposingNew: true,
      composeQuery: "",
      isCreateGroupOpen: false,
      groupDraftName: "",
      groupDraftMemberIds: [],
    });
  }

  function closeCompose(): void {
    commit({ isComposingNew: false, composeQuery: "" });
  }

  function setComposeQuery(query: string): void {
    commit({ composeQuery: query });
  }

  function createAgent(name: string): void {
    const nextName = name.trim();
    if (!nextName) return;

    const hiddenAgent = state.agents.find(
      (agent) =>
        state.hiddenAgentIds.has(agent.id) &&
        agent.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (hiddenAgent) {
      const hiddenAgentIds = new Set(state.hiddenAgentIds);
      hiddenAgentIds.delete(hiddenAgent.id);
      const draftAgentId = state.draftAgentId;
      const isDroppingDraft = draftAgentId != null && draftAgentId !== hiddenAgent.id;
      commit({
        agents: isDroppingDraft
          ? state.agents.filter((agent) => agent.id !== draftAgentId)
          : state.agents,
        transcripts: isDroppingDraft
          ? Object.fromEntries(
              Object.entries(state.transcripts).filter(([id]) => id !== draftAgentId),
            )
          : state.transcripts,
        hiddenAgentIds,
        recentlyRevealedIds: new Set([hiddenAgent.id]),
        activeAgentId: hiddenAgent.id,
        draftAgentId: isDroppingDraft ? null : state.draftAgentId,
        isComposingNew: false,
        composeQuery: "",
      });
      clearUnread(hiddenAgent.id);
      return;
    }

    const existingAgent = state.agents.find(
      (agent) => agent.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (existingAgent) {
      openAgent(existingAgent.id);
      commit({ isComposingNew: false, composeQuery: "" });
      return;
    }

    const agentId = `created-${createLiveId()}`;
    const agent: GrokBotAgent = {
      id: agentId,
      name: nextName,
      description: "A newly created agent.",
      lastEntry: null,
      lastActivityAt: Date.now(),
      hasUnread: false,
      isRunning: false,
      isComposingMessage: false,
      status: null,
      isGroup: false,
      memberIds: [],
      settings: state.content.settings.map((setting) => ({ ...setting })),
    };

    const draftAgentId = state.draftAgentId;
    const isDroppingDraft = draftAgentId != null && draftAgentId !== agentId;
    commit({
      agents: [
        agent,
        ...(isDroppingDraft
          ? state.agents.filter((candidate) => candidate.id !== draftAgentId)
          : state.agents),
      ],
      transcripts: {
        ...(isDroppingDraft
          ? Object.fromEntries(
              Object.entries(state.transcripts).filter(([id]) => id !== draftAgentId),
            )
          : state.transcripts),
        [agentId]: [],
      },
      activeAgentId: agentId,
      draftAgentId: agentId,
      recentlyRevealedIds: new Set([agentId]),
      isComposingNew: false,
      composeQuery: "",
      isCreateGroupOpen: false,
      groupDraftName: "",
      groupDraftMemberIds: [],
    });
  }

  function openCreateGroup(): void {
    setDesktopPaneOpen(false);
    commit({
      isComposingNew: false,
      composeQuery: "",
      isCreateGroupOpen: true,
      groupDraftName: "",
      groupDraftMemberIds: [],
    });
  }

  function closeCreateGroup(): void {
    commit({ isCreateGroupOpen: false, groupDraftName: "", groupDraftMemberIds: [] });
  }

  function setGroupDraftName(name: string): void {
    commit({ groupDraftName: name });
  }

  function toggleGroupDraftMember(agentId: string): void {
    const agent = state.agents.find((candidate) => candidate.id === agentId);
    if (!agent || agent.isGroup) return;
    const selected = state.groupDraftMemberIds.includes(agentId);
    commit({
      groupDraftMemberIds: selected
        ? state.groupDraftMemberIds.filter((id) => id !== agentId)
        : [...state.groupDraftMemberIds, agentId],
    });
  }

  function normalizeGroupMemberIds(
    memberIds: string[],
    group?: GrokBotAgent,
  ): string[] | null {
    const knownMemberIds = new Set([
      ...(group?.memberIds ?? []),
      ...(group?.members?.map((member) => member.id) ?? []),
    ]);
    const unique = [
      ...new Set(
        memberIds.filter((id) =>
          knownMemberIds.has(id) ||
          state.agents.some((agent) => agent.id === id && !agent.isGroup),
        ),
      ),
    ];
    if (unique.length < GROUP_MIN_MEMBERS || unique.length > GROUP_MAX_MEMBERS) {
      return null;
    }
    return unique;
  }

  function applyGroupMembers(group: GrokBotAgent, memberIds: string[]): void {
    const members = groupMembersFromIds(state.agents, memberIds);
    updateAgent(group.id, {
      memberIds,
      members,
      description: `${members.length} agents in this conversation`,
    });
  }

  function setGroupMembers(agentId: string, memberIds: string[]): void {
    const group = state.agents.find((agent) => agent.id === agentId);
    if (!group?.isGroup) return;
    const nextMemberIds = normalizeGroupMemberIds(memberIds, group);
    if (!nextMemberIds) return;
    applyGroupMembers(group, nextMemberIds);
  }

  function addGroupMember(agentId: string, memberId: string): void {
    const group = state.agents.find((agent) => agent.id === agentId);
    if (!group?.isGroup) return;
    if (group.memberIds.includes(memberId)) return;
    if (group.memberIds.length >= GROUP_MAX_MEMBERS) return;
    if (!state.agents.some((agent) => agent.id === memberId && !agent.isGroup)) {
      return;
    }
    const nextMemberIds = normalizeGroupMemberIds(
      [...group.memberIds, memberId],
      group,
    );
    if (!nextMemberIds) return;
    applyGroupMembers(group, nextMemberIds);
  }

  function removeGroupMember(agentId: string, memberId: string): void {
    const group = state.agents.find((agent) => agent.id === agentId);
    if (!group?.isGroup) return;
    if (!group.memberIds.includes(memberId)) return;
    const nextMemberIds = normalizeGroupMemberIds(
      group.memberIds.filter((id) => id !== memberId),
      group,
    );
    if (!nextMemberIds) return;
    applyGroupMembers(group, nextMemberIds);
  }

  function setAgentPinned(agentId: string, pinned: boolean): void {
    updateAgent(agentId, { isPinned: pinned });
  }

  function setAgentUnread(agentId: string, unread: boolean): void {
    const agent = state.agents.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    updateAgent(agentId, {
      hasUnread: unread,
      unreadCount: unread ? Math.max(agent.unreadCount ?? 0, 1) : 0,
    });
  }

  function hideAgent(agentId: string): void {
    if (!state.agents.some((agent) => agent.id === agentId)) return;
    const hiddenAgentIds = new Set(state.hiddenAgentIds);
    hiddenAgentIds.add(agentId);
    const recentlyRevealedIds = new Set(state.recentlyRevealedIds);
    recentlyRevealedIds.delete(agentId);
    commit({ hiddenAgentIds, recentlyRevealedIds });
  }

  function deleteAgent(agentId: string): void {
    const agent = state.agents.find((candidate) => candidate.id === agentId);
    if (!agent) return;

    const removedAgentIds = new Set<string>([agentId]);
    const agentsAfterMemberRemoval = state.agents
      .filter((candidate) => candidate.id !== agentId)
      .map((candidate) => {
        if (!candidate.isGroup || !candidate.memberIds.includes(agentId)) {
          return candidate;
        }

        const memberIds = candidate.memberIds.filter((id) => id !== agentId);
        if (memberIds.length < GROUP_MIN_MEMBERS) {
          removedAgentIds.add(candidate.id);
          return candidate;
        }

        const members =
          candidate.members?.filter((member) => member.id !== agentId) ??
          groupMembersFromIds(
            state.agents.filter((item) => item.id !== agentId),
            memberIds,
          );
        return {
          ...candidate,
          memberIds,
          members,
          description: `${members.length} agents in this conversation`,
        };
      });
    const remainingAgents = agentsAfterMemberRemoval.filter(
      (candidate) => !removedAgentIds.has(candidate.id),
    );
    const deletedEntryIds = new Set(
      [...removedAgentIds].flatMap((id) =>
        (state.transcripts[id] ?? []).map((entry) => entry.id),
      ),
    );
    const hiddenAgentIds = new Set(state.hiddenAgentIds);
    const recentlyRevealedIds = new Set(state.recentlyRevealedIds);
    for (const removedAgentId of removedAgentIds) {
      hiddenAgentIds.delete(removedAgentId);
      recentlyRevealedIds.delete(removedAgentId);
    }
    const orderedRemainingAgents = [...remainingAgents].sort((left, right) => {
      if (Boolean(left.isPinned) !== Boolean(right.isPinned)) {
        return left.isPinned ? -1 : 1;
      }
      return right.lastActivityAt - left.lastActivityAt;
    });
    const nextActiveAgent =
      removedAgentIds.has(state.activeAgentId)
        ? orderedRemainingAgents.find((candidate) => !hiddenAgentIds.has(candidate.id)) ??
          orderedRemainingAgents[0] ??
          null
        : null;
    const activeAgentId =
      removedAgentIds.has(state.activeAgentId)
        ? nextActiveAgent?.id ?? ""
        : state.activeAgentId;
    const settingsAgentDeleted =
      state.settingsAgentId !== null &&
      removedAgentIds.has(state.settingsAgentId);
    const clearsScreenOverlay =
      state.screenOverlay?.origin.kind === "agent"
        ? removedAgentIds.has(state.screenOverlay.origin.agentId)
        : deletedEntryIds.has(state.screenOverlay?.origin.entryId ?? "");
    const nextAgents = remainingAgents.map((candidate) =>
      nextActiveAgent?.id === candidate.id && candidate.hasUnread
        ? { ...candidate, hasUnread: false, unreadCount: 0 }
        : candidate,
    );
    const cancelsComposing =
      (state.draftAgentId !== null && removedAgentIds.has(state.draftAgentId)) ||
      removedAgentIds.has(state.activeAgentId);

    for (const removedAgentId of removedAgentIds) {
      for (const controller of agentScriptControllers.get(removedAgentId) ?? []) {
        controller.abort();
      }
      agentScriptControllers.delete(removedAgentId);
      activeScriptCounts.delete(removedAgentId);
    }
    for (const entryId of deletedEntryIds) signalEntry(entryId);

    commit({
      content: {
        ...state.content,
        agents: state.content.agents.filter(
          ({ agent: candidate }) => !removedAgentIds.has(candidate.id),
        ),
      },
      agents: nextAgents,
      transcripts: Object.fromEntries(
        Object.entries(state.transcripts).filter(([id]) => !removedAgentIds.has(id)),
      ),
      activeAgentId,
      hiddenAgentIds,
      recentlyRevealedIds,
      draftAgentId:
        state.draftAgentId !== null && removedAgentIds.has(state.draftAgentId)
          ? null
          : state.draftAgentId,
      isComposingNew: cancelsComposing ? false : state.isComposingNew,
      composeQuery: cancelsComposing ? "" : state.composeQuery,
      settingsAgentId: settingsAgentDeleted ? null : state.settingsAgentId,
      isSettingsOpen: settingsAgentDeleted ? false : state.isSettingsOpen,
      contextMenu:
        state.contextMenu &&
        removedAgentIds.has(state.contextMenu.target.agentId)
          ? null
          : state.contextMenu,
      screenOverlay: clearsScreenOverlay ? null : state.screenOverlay,
      groupDraftMemberIds: state.groupDraftMemberIds.filter(
        (id) => !removedAgentIds.has(id),
      ),
    });
  }

  function createGroup(name?: string): string | null {
    const memberIds = canonicalMemberIds(
      state.groupDraftMemberIds.filter((id) =>
        state.agents.some((agent) => agent.id === id && !agent.isGroup),
      ),
    );
    if (memberIds.length < GROUP_MIN_MEMBERS || memberIds.length > GROUP_MAX_MEMBERS) {
      return null;
    }

    const memberKey = memberIds.join(",");
    const existingGroup = state.agents.find(
      (agent) =>
        agent.isGroup && canonicalMemberIds(agent.memberIds).join(",") === memberKey,
    );
    if (existingGroup) {
      openAgent(existingGroup.id);
      commit({ isCreateGroupOpen: false, groupDraftName: "", groupDraftMemberIds: [] });
      return existingGroup.id;
    }

    const members = groupMembersFromIds(state.agents, memberIds);
    const groupName =
      (name ?? state.groupDraftName).trim() ||
      `Group with ${members.slice(0, 2).map((member) => member.name).join(" + ")}`;
    const groupId = `group-${createLiveId()}`;
    const group: GrokBotAgent = {
      id: groupId,
      name: groupName,
      title: "Group chat",
      description: `${members.length} agents in this conversation`,
      avatarModel: { shape: "grok", motion: "idle" },
      lastEntry: null,
      lastActivityAt: Date.now(),
      hasUnread: false,
      isRunning: false,
      isComposingMessage: false,
      status: null,
      isGroup: true,
      memberIds,
      members,
      tools: state.content.tools?.map((tool) => ({ ...tool })) ?? [],
      computerId: null,
      settings: state.content.settings.map((setting) => ({ ...setting })),
    };

    commit({
      agents: [group, ...state.agents],
      transcripts: { ...state.transcripts, [groupId]: [] },
      activeAgentId: groupId,
      isCreateGroupOpen: false,
      groupDraftName: "",
      groupDraftMemberIds: [],
      recentlyRevealedIds: new Set([groupId]),
    });
    return groupId;
  }

  function openSettings(agentId = state.activeAgentId): void {
    const target = state.agents.find((agent) => agent.id === agentId);
    if (!target) return;
    setDesktopPaneOpen(true);
    commit({ isSettingsOpen: true, settingsAgentId: target.id });
  }

  function closeSettings(): void {
    commit({ isSettingsOpen: false, settingsAgentId: null });
    if (state.isDesktopPaneOpen) setDesktopPaneOpen(false);
  }

  function updateAgentProfile(
    agentId: string,
    patch: Partial<Pick<GrokBotAgent, "name" | "title" | "description" | "avatarModel">>,
  ): void {
    const agent = state.agents.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    updateAgent(agentId, {
      name: patch.name?.trim() || agent.name,
      title: patch.title ?? agent.title,
      description: patch.description ?? agent.description,
      avatarModel: patch.avatarModel ?? agent.avatarModel,
    });
  }

  function setAgentToolEnabled(
    agentId: string,
    toolId: GrokBotToolId,
    enabled: boolean,
  ): void {
    const agent = state.agents.find((candidate) => candidate.id === agentId);
    if (!agent) return;
    const tools = agent.tools ?? state.content.tools?.map((tool) => ({ ...tool })) ?? [];
    updateAgent(agentId, {
      tools: tools.map((tool) =>
        tool.id === toolId ? { ...tool, isEnabled: enabled } : tool,
      ),
    });
  }

  function assignAgentComputer(agentId: string, computerId: string | null): void {
    if (computerId !== null && !state.content.computers?.some((computer) => computer.id === computerId)) {
      return;
    }
    updateAgent(agentId, { computerId });
  }

  function openContextMenu(menu: GrokBotContextMenuState): void {
    commit({ contextMenu: menu });
  }

  function closeContextMenu(): void {
    if (state.contextMenu) commit({ contextMenu: null });
  }

  function startAsr(): void {
    const phase: GrokBotAsrPhase = "requesting-permission";
    commit({
      asr: {
        ...state.asr,
        phase,
        isListening: isActiveAsrPhase(phase),
        error: undefined,
        interimTranscript: "",
      },
    });
  }

  function stopAsr(): void {
    commit({
      asr: {
        ...state.asr,
        phase: "idle",
        isListening: false,
        error: undefined,
        interimTranscript: "",
      },
    });
  }

  function setAsrCapability(capability: GrokBotAsrCapability): void {
    const resetsPhase =
      !capability.supported ||
      state.asr.phase === "unsupported" ||
      state.asr.phase === "error";
    const phase: GrokBotAsrPhase = !capability.supported
      ? "unsupported"
      : resetsPhase
        ? "idle"
        : state.asr.phase;
    commit({
      asr: {
        ...state.asr,
        capability: { ...capability },
        phase,
        isListening: isActiveAsrPhase(phase),
        isSupported: capability.supported,
        error: resetsPhase ? undefined : state.asr.error,
      },
    });
  }

  function setAsrPhase(phase: GrokBotAsrPhase): void {
    commit({
      asr: {
        ...state.asr,
        phase,
        isListening: isActiveAsrPhase(phase),
        isSupported: phase === "unsupported" ? false : state.asr.isSupported,
        error: phase === "error" ? state.asr.error : undefined,
      },
    });
  }

  function setAsrError(error?: string): void {
    const message = error?.trim() || undefined;
    const phase: GrokBotAsrPhase = message ? "error" : "idle";
    commit({
      asr: {
        ...state.asr,
        phase,
        isListening: false,
        error: message,
        interimTranscript: "",
      },
    });
  }

  function setAsrPartial(text: string): void {
    commit({ asr: { ...state.asr, interimTranscript: text } });
  }

  function commitAsrTranscript(text?: string): void {
    const transcript = (text ?? state.asr.interimTranscript ?? state.asr.transcript).trim();
    if (!transcript) return;
    commit({
      scriptedComposerText: transcript,
      asr: {
        ...state.asr,
        phase: "idle",
        isListening: false,
        transcript,
        interimTranscript: "",
        error: undefined,
      },
    });
  }

  function setSidebarCollapsed(collapsed: boolean): void {
    sidebarWasExpandedBeforePane = false;
    if (state.isSidebarCollapsed !== collapsed) {
      commit({ isSidebarCollapsed: collapsed });
    }
  }

  function resizeSidebar(width: number): void {
    sidebarWasExpandedBeforePane = false;
    const collapsed = state.isSidebarCollapsed;
    const threshold = collapsed
      ? SIDEBAR_EXPAND_AT_WIDTH
      : SIDEBAR_COLLAPSE_AT_WIDTH;

    if (width < threshold) {
      if (!collapsed) commit({ isSidebarCollapsed: true });
      return;
    }

    commit({
      isSidebarCollapsed: false,
      sidebarWidth: clamp(width, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
    });
  }

  function setShellWidth(width: number): void {
    if (width !== state.shellWidth) commit({ shellWidth: width });
  }

  function resizeDesktopPane(width: number): void {
    if (width < DESKTOP_PANE_COLLAPSE_AT_WIDTH) {
      setDesktopPaneOpen(false);
      return;
    }

    commit({
      desktopPaneWidth: clamp(
        width,
        DESKTOP_PANE_COLLAPSE_AT_WIDTH,
        desktopPaneMaxWidth(state.shellWidth),
      ),
    });
  }

  function setAgentSettingEnabled(
    agentId: string,
    settingId: string,
    enabled: boolean,
  ): void {
    const agent = state.agents.find((candidate) => candidate.id === agentId);
    if (!agent?.settings) return;
    updateAgent(agentId, {
      settings: agent.settings.map((setting) =>
        setting.id === settingId ? { ...setting, isEnabled: enabled } : setting,
      ),
    });
  }

  function applyEndState(nextContent: GrokBotContent, nextActiveAgentId: string): void {
    cancelRuntime();
    const nextAgents = agentsFromContent(nextContent);
    commit({
      content: nextContent,
      agents: nextAgents,
      transcripts: Object.fromEntries(
        nextContent.agents.map(({ agent, transcript }) => [agent.id, transcript]),
      ),
      activeAgentId: nextAgents.some((agent) => agent.id === nextActiveAgentId)
        ? nextActiveAgentId
        : nextAgents[0]?.id ?? "",
      hiddenAgentIds: new Set<string>(),
      recentlyRevealedIds: new Set<string>(),
      isSidebarCollapsed: false,
      isDesktopPaneOpen: false,
      isComposingNew: false,
      composeQuery: "",
      screenOverlay: null,
      isSettingsOpen: false,
      settingsAgentId: null,
      isCreateGroupOpen: false,
      groupDraftName: "",
      groupDraftMemberIds: [],
      contextMenu: null,
      asr: createDefaultAsrState(),
      scriptedComposerText: null,
      scriptedScreen: null,
      draftAgentId: null,
    });
  }

  actions = {
    openAgent,
    setTheme,
    sendMessage,
    openScreen,
    closeScreen,
    answerChoice,
    dismissChoice,
    openComputerScreen,
    takeOverComputer,
    handOverComputer,
    finishComputerTakeOver,
    handBackComputer,
    sendOutboundMessage,
    discardOutboundMessage,
    openCompose,
    closeCompose,
    setComposeQuery,
    createAgent,
    openCreateGroup,
    closeCreateGroup,
    setGroupDraftName,
    toggleGroupDraftMember,
    createGroup,
    setGroupMembers,
    addGroupMember,
    removeGroupMember,
    setAgentPinned,
    setAgentUnread,
    hideAgent,
    deleteAgent,
    openSettings,
    closeSettings,
    updateAgentProfile,
    setAgentToolEnabled,
    assignAgentComputer,
    openContextMenu,
    closeContextMenu,
    startAsr,
    stopAsr,
    setAsrCapability,
    setAsrPhase,
    setAsrError,
    setAsrPartial,
    commitAsrTranscript,
    setSidebarCollapsed,
    resizeSidebar,
    setShellWidth,
    setDesktopPaneOpen,
    resizeDesktopPane,
    setAgentSettingEnabled,
    startScript,
    setPanelResizing(isResizing: boolean) {
      commit({ isPanelResizing: isResizing });
    },
    setScriptedComposerText(text: string | null) {
      commit({ scriptedComposerText: text });
    },
    setScriptedScreen(screen: unknown) {
      commit({ scriptedScreen: screen });
    },
    applyEndState,
  };
  value = { ...state, state, actions };

  return {
    get state() {
      return state;
    },
    get actions() {
      return actions;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return value;
    },
    activate() {
      activeMounts += 1;
    },
    deactivate() {
      activeMounts = Math.max(0, activeMounts - 1);
    },
    disposeIfInactive() {
      if (activeMounts === 0) destroy();
    },
  };
}

const GrokBotStoreContext = createContext<InternalGrokBotStore | null>(null);
const GrokBotIntegrationsContext = createContext<GrokBotIntegrations>({});
const GrokBotSlotsContext = createContext<GrokBotSlots>({});

export interface GrokBotStoreProviderProps {
  content?: GrokBotContent;
  activeAgentId?: string;
  theme?: BabyGrokBotTheme;
  integrations?: GrokBotIntegrations;
  slots?: GrokBotSlots;
  children: ReactNode;
}

export function GrokBotStoreProvider({
  content,
  activeAgentId,
  theme,
  integrations,
  slots,
  children,
}: GrokBotStoreProviderProps) {
  const [store] = useState(() =>
    createGrokBotStore(content ?? DEFAULT_DEMO_CONTENT, activeAgentId, theme),
  );

  useEffect(() => {
    if (theme) store.actions.setTheme(theme);
  }, [store, theme]);

  useEffect(() => {
    store.activate();
    return () => {
      store.deactivate();
      queueMicrotask(store.disposeIfInactive);
    };
  }, [store]);

  return (
    <GrokBotStoreContext.Provider value={store}>
      <GrokBotIntegrationsContext.Provider value={integrations ?? {}}>
        <GrokBotSlotsContext.Provider value={slots ?? {}}>
          {children}
        </GrokBotSlotsContext.Provider>
      </GrokBotIntegrationsContext.Provider>
    </GrokBotStoreContext.Provider>
  );
}

export function useGrokBotIntegrations(): GrokBotIntegrations {
  return useContext(GrokBotIntegrationsContext);
}

export function useGrokBotSlots(): GrokBotSlots {
  return useContext(GrokBotSlotsContext);
}

function useRequiredGrokBotStore(): InternalGrokBotStore {
  const store = useContext(GrokBotStoreContext);
  if (!store) {
    throw new Error(
      "BabyGrokBot components must render inside <GrokBotStoreProvider>",
    );
  }
  return store;
}

export function useGrokBotStore(): GrokBotStoreSnapshot {
  const store = useRequiredGrokBotStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

export function useGrokBotActions(): GrokBotStoreActions {
  return useRequiredGrokBotStore().actions;
}

export function useGrokBotContent(): GrokBotContent {
  const store = useRequiredGrokBotStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().state.content,
    () => store.getSnapshot().state.content,
  );
}

export function useActiveAgent(): GrokBotAgent | undefined {
  const store = useRequiredGrokBotStore();
  return useSyncExternalStore(
    store.subscribe,
    () => {
      const current = store.getSnapshot().state;
      return (
        current.agents.find((agent) => agent.id === current.activeAgentId) ??
        current.agents[0]
      );
    },
    () => {
      const current = store.getSnapshot().state;
      return (
        current.agents.find((agent) => agent.id === current.activeAgentId) ??
        current.agents[0]
      );
    },
  );
}

export function useActiveTranscript(): GrokBotTranscriptEntry[] {
  const store = useRequiredGrokBotStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().state.transcripts[store.getSnapshot().state.activeAgentId] ?? EMPTY_TRANSCRIPT,
    () => store.getSnapshot().state.transcripts[store.getSnapshot().state.activeAgentId] ?? EMPTY_TRANSCRIPT,
  );
}

export function useOptionalGrokBotActions(): GrokBotStoreActions | null {
  return useContext(GrokBotStoreContext)?.actions ?? null;
}
