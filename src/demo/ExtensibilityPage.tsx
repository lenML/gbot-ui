import { useState } from "react";
import { AgentAvatar, GrokBotIcon } from "../components/grok-bot/AgentAvatar";
import { GrokBotApp } from "../components/grok-bot/GrokBotApp";
import type {
  GrokBotChatHeaderSlotProps,
  GrokBotComposerSlotProps,
  GrokBotConversationRowSlotProps,
  GrokBotSlots,
  GrokBotTranscriptEntrySlotProps,
} from "../lib/grok-bot/extensions";
import { useGrokBotActions, useGrokBotStore } from "../lib/grok-bot/store";
import "./demo.css";

type SlotKey = keyof GrokBotSlots;

interface SlotDefinition {
  capability: string;
  contract: string;
  id: SlotKey;
  label: string;
  props: string[];
  signature: string;
}

const SLOT_ORDER: SlotKey[] = [
  "conversationRow",
  "chatHeader",
  "transcriptEntry",
  "composer",
];

const SLOT_DEFINITIONS: Record<SlotKey, SlotDefinition> = {
  conversationRow: {
    id: "conversationRow",
    label: "Conversation row",
    signature: "GrokBotConversationRowSlotProps",
    capability:
      "Replace the complete direct/group row while keeping open, context-menu, keyboard, active, and collapsed behavior.",
    contract:
      "Forward onOpen, onContextMenu, and onKeyDown. Keep onOpenMenu available for host-owned menus.",
    props: ["agent", "active", "collapsed", "onOpen", "onOpenMenu", "onContextMenu", "onKeyDown"],
  },
  chatHeader: {
    id: "chatHeader",
    label: "Chat header",
    signature: "GrokBotChatHeaderSlotProps",
    capability:
      "Rework identity, status, provenance, and actions on desktop or mobile without replacing the transcript or composer.",
    contract:
      "Read agent/content from props. Store hooks remain available for desktop, screen, and settings actions.",
    props: ["agent?", "content", "surface", "onBack?"],
  },
  transcriptEntry: {
    id: "transcriptEntry",
    label: "Transcript entry",
    signature: "GrokBotTranscriptEntrySlotProps",
    capability:
      "Decorate or recompose each entry while preserving the default message/card implementation through children.",
    contract:
      "Render children. Use entry, index, and isLast for grouping, provenance, virtualization keys, or annotations.",
    props: ["children", "entry", "index", "isLast"],
  },
  composer: {
    id: "composer",
    label: "Composer",
    signature: "GrokBotComposerSlotProps",
    capability:
      "Add omnibox controls, quick actions, model selectors, context chips, or transport status around the stock composer.",
    contract:
      "Render children. useGrokBotActions().sendMessage is available for host-owned quick actions.",
    props: ["agent?", "children", "surface"],
  },
};

const SLOT_CODE: Record<SlotKey, string> = {
  conversationRow: `<GrokBotApp
  slots={{
    conversationRow: CustomConversationRow,
  }}
/>`,
  chatHeader: `<GrokBotApp
  slots={{
    chatHeader: CustomChatHeader,
  }}
/>`,
  transcriptEntry: `<GrokBotApp
  slots={{
    transcriptEntry: CustomTranscriptEntry,
  }}
/>`,
  composer: `<GrokBotApp
  slots={{
    composer: CustomComposer,
  }}
/>

function CustomComposer({ children }) {
  const actions = useGrokBotActions()
  return <section>
    <button onClick={() =>
      actions.sendMessage('Status ping')
    }>Quick action</button>
    {children}
  </section>
}`,
};

interface ExtensionLayer {
  api: string;
  detail: string;
  label: string;
  status: "API" | "LIVE" | "NEXT";
}

const EXTENSION_LAYERS: ExtensionLayer[] = [
  {
    label: "Content",
    api: "content · activeAgentId",
    detail: "Replace agents, transcripts, tools, computers, viewer identity, and reply scripts.",
    status: "API",
  },
  {
    label: "Identity",
    api: "agent · palette · CSS vars",
    detail: "Control title, description, colors, avatar geometry, idle motion, and hover response.",
    status: "API",
  },
  {
    label: "Appearance",
    api: "theme · className",
    detail: "Switch auto/light/dark, retarget design tokens, and scope host-specific visual rules.",
    status: "API",
  },
  {
    label: "Runtime",
    api: "computer · ASR adapters",
    detail: "Swap VNC/noVNC computer renderers and connect external speech recognition.",
    status: "API",
  },
  {
    label: "Render slots",
    api: "row · header · entry · composer",
    detail: "Replace or wrap complete surfaces on desktop and mobile while retaining engine behavior.",
    status: "LIVE",
  },
  {
    label: "Headless",
    api: "store · actions · hooks · parts",
    detail: "Compose a custom shell while reusing state projection, business actions, and low-level UI.",
    status: "API",
  },
  {
    label: "Transport boundary",
    api: "stream · persistence · groups",
    detail: "Currently internal. Forking these requires a dedicated adapter contract in the next SDK layer.",
    status: "NEXT",
  },
];

function CustomConversationRow({
  active,
  agent,
  collapsed,
  onContextMenu,
  onKeyDown,
  onOpen,
}: GrokBotConversationRowSlotProps) {
  const preview = agent.isComposingMessage
    ? agent.composingBeat?.label ?? "Typing..."
    : agent.status?.label ?? agent.lastEntry?.text ?? "No messages yet";

  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-haspopup="menu"
      className="bb-lab-row"
      data-active={active || undefined}
      data-collapsed={collapsed || undefined}
      data-group={agent.isGroup || undefined}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      title={collapsed ? agent.name : undefined}
      type="button"
    >
      <span className="bb-lab-row__avatar">
        <AgentAvatar
          agent={agent}
          size={collapsed ? 30 : 34}
          working={agent.isRunning || agent.isComposingMessage}
        />
      </span>
      <span className="bb-lab-row__copy">
        <span className="bb-lab-row__title">
          <strong>{agent.name}</strong>
          <span>{agent.isGroup ? "GROUP" : "DIRECT"}</span>
        </span>
        <span className="bb-lab-row__preview">{preview}</span>
      </span>
      <span className="bb-lab-row__signal" aria-hidden="true" />
    </button>
  );
}

function CustomChatHeader({
  agent,
  content,
  onBack,
  surface,
}: GrokBotChatHeaderSlotProps) {
  const { state, actions } = useGrokBotStore();
  const screenOpen =
    Boolean(agent) &&
    state.screenOverlay?.origin.kind === "agent" &&
    state.screenOverlay.origin.agentId === agent?.id;

  const toggleScreen = () => {
    if (!agent) return;
    if (screenOpen) {
      actions.closeScreen();
      return;
    }
    actions.openScreen({ kind: "agent", agentId: agent.id }, "agent");
  };

  const identity = (
    <div className="bb-lab-header__identity">
      <AgentAvatar
        agent={agent}
        name={agent?.name ?? "Agent"}
        size={30}
        working={Boolean(agent?.isRunning || agent?.isComposingMessage)}
      />
      <span>
        <small>
          {content.appName} / {surface} chatHeader slot
        </small>
        <strong>{agent?.name ?? "No active conversation"}</strong>
      </span>
    </div>
  );

  if (surface === "mobile") {
    return (
      <header className="bb-lab-header" data-surface="mobile">
        <button
          aria-label="Back to chats"
          className="bb-lab-header__mobile-action"
          onClick={onBack}
          type="button"
        >
          <GrokBotIcon name="chevron-left" size={15} />
        </button>
        {identity}
        {agent?.isGroup ? (
          <span aria-hidden="true" className="bb-lab-header__mobile-spacer" />
        ) : (
          <button
            aria-label={`Open ${agent?.name ?? "agent"} screen`}
            aria-pressed={screenOpen}
            className="bb-lab-header__mobile-action"
            disabled={!agent}
            onClick={toggleScreen}
            type="button"
          >
            <GrokBotIcon name="device-desktop" size={15} />
          </button>
        )}
      </header>
    );
  }

  return (
    <header className="bb-lab-header" data-surface="desktop">
      {identity}

      <span className="bb-lab-header__mode">
        {agent?.isGroup ? "GROUP ROUTER" : "DIRECT ROUTER"}
      </span>

      <div className="bb-lab-header__actions">
        <button
          aria-label={state.isDesktopPaneOpen ? "Hide desktop pane" : "Show desktop pane"}
          aria-pressed={state.isDesktopPaneOpen}
          onClick={() => actions.setDesktopPaneOpen(!state.isDesktopPaneOpen)}
          type="button"
        >
          <GrokBotIcon name="device-desktop" size={14} />
        </button>
        <button
          aria-label={`Open ${agent?.name ?? "agent"} screen`}
          aria-pressed={screenOpen}
          disabled={!agent}
          onClick={toggleScreen}
          type="button"
        >
          <GrokBotIcon name="arrow-right-up" size={14} />
        </button>
      </div>
    </header>
  );
}

function CustomTranscriptEntry({
  children,
  entry,
  index,
  isLast,
}: GrokBotTranscriptEntrySlotProps) {
  return (
    <article
      className="bb-lab-entry"
      data-kind={entry.kind}
      data-last={isLast || undefined}
    >
      <div className="bb-lab-entry__meta" aria-hidden="true">
        <span>slot</span>
        <strong>{String(index + 1).padStart(2, "0")}</strong>
        <small>{entry.kind}</small>
      </div>
      <div className="bb-lab-entry__content">{children}</div>
    </article>
  );
}

function CustomComposer({
  agent,
  children,
  surface,
}: GrokBotComposerSlotProps) {
  const actions = useGrokBotActions();

  const sendStatusPing = () => {
    actions.sendMessage({
      text: `Status ping from composer slot${agent ? ` for ${agent.name}` : ""}.`,
      attachments: [],
    });
  };

  return (
    <section className="bb-lab-composer" data-surface={surface}>
      <div className="bb-lab-composer__toolbar">
        <span>
          <i aria-hidden="true" />
          composer slot / stock children preserved
        </span>
        <button onClick={sendStatusPing} type="button">
          <GrokBotIcon name="arrow-right-up" size={12} />
          Status ping
        </button>
      </div>
      <div className="bb-lab-composer__default">{children}</div>
    </section>
  );
}

export function ExtensibilityPage() {
  const [enabled, setEnabled] = useState<Record<SlotKey, boolean>>({
    conversationRow: true,
    chatHeader: true,
    transcriptEntry: true,
    composer: true,
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("conversationRow");
  const [dockOpen, setDockOpen] = useState(false);

  const slots: GrokBotSlots = {};
  if (enabled.conversationRow) slots.conversationRow = CustomConversationRow;
  if (enabled.chatHeader) slots.chatHeader = CustomChatHeader;
  if (enabled.transcriptEntry) slots.transcriptEntry = CustomTranscriptEntry;
  if (enabled.composer) slots.composer = CustomComposer;

  const activeCount = SLOT_ORDER.reduce(
    (count, slot) => count + (enabled[slot] ? 1 : 0),
    0,
  );
  const selected = SLOT_DEFINITIONS[selectedSlot];

  const toggleSlot = (slot: SlotKey) => {
    setEnabled((current) => ({ ...current, [slot]: !current[slot] }));
  };

  const restoreDefaults = () => {
    setEnabled({
      conversationRow: true,
      chatHeader: true,
      transcriptEntry: true,
      composer: true,
    });
  };

  return (
    <main className="bb-ext-lab">
      <aside
        className="bb-ext-controls"
        data-open={dockOpen || undefined}
        id="extensibility-slot-controls"
      >
        <button
          aria-controls="extensibility-slot-controls-body"
          aria-expanded={dockOpen}
          className="bb-ext-controls__dock-toggle"
          onClick={() => setDockOpen((open) => !open)}
          type="button"
        >
          <span>
            <i aria-hidden="true" />
            Slot controls
          </span>
          <strong>{activeCount}/4 live</strong>
          <span aria-hidden="true">{dockOpen ? "Down" : "Up"}</span>
        </button>

        <div className="bb-ext-controls__body" id="extensibility-slot-controls-body">
          <header className="bb-ext-controls__intro">
            <div className="bb-ext-controls__eyebrow">
              <span>EXTENSIBILITY LAB</span>
              <span>v1</span>
            </div>
            <h1>Replace behavior.<br />Keep the engine.</h1>
            <p>
              Six public extension layers and four live render slots. Toggle
              overrides without forking conversation state, transport, menus,
              or responsive shells.
            </p>
          </header>

          <div className="bb-ext-controls__summary">
            <span>
              <strong>{activeCount}</strong> / 4 live slots enabled
            </span>
            <button onClick={restoreDefaults} type="button">
              Restore all
            </button>
          </div>

          <section className="bb-ext-map" aria-label="Extension capability map">
            <div className="bb-ext-map__heading">
              <span>EXTENSION MAP</span>
              <small>public contract / depth</small>
            </div>
            <div className="bb-ext-map__grid">
              {EXTENSION_LAYERS.map((layer) => (
                <article data-status={layer.status} key={layer.label}>
                  <header>
                    <strong>{layer.label}</strong>
                    <span>{layer.status}</span>
                  </header>
                  <code>{layer.api}</code>
                  <p>{layer.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="bb-ext-slots" aria-label="Replaceable slots">
            {SLOT_ORDER.map((slot, index) => {
              const definition = SLOT_DEFINITIONS[slot];
              const isEnabled = enabled[slot];
              const isSelected = selectedSlot === slot;

              return (
                <div
                  className="bb-ext-slot"
                  data-enabled={isEnabled || undefined}
                  data-selected={isSelected || undefined}
                  key={slot}
                >
                  <button
                    className="bb-ext-slot__select"
                    onClick={() => setSelectedSlot(slot)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{definition.label}</strong>
                      <small>{definition.signature}</small>
                    </span>
                  </button>
                  <button
                    aria-checked={isEnabled}
                    aria-label={`${isEnabled ? "Disable" : "Enable"} ${definition.label}`}
                    className="bb-ext-switch"
                    onClick={() => toggleSlot(slot)}
                    role="switch"
                    type="button"
                  >
                    <span />
                  </button>
                </div>
              );
            })}
          </section>

          <section className="bb-ext-contract" aria-label={`${selected.label} contract`}>
            <div className="bb-ext-contract__heading">
              <span>SELECTED CONTRACT</span>
              <strong>{selected.label}</strong>
            </div>
            <p>{selected.capability}</p>
            <div className="bb-ext-contract__props">
              {selected.props.map((prop) => (
                <code key={prop}>{prop}</code>
              ))}
            </div>
            <p className="bb-ext-contract__rule">{selected.contract}</p>
            <pre><code>{SLOT_CODE[selectedSlot]}</code></pre>
          </section>

          <section className="bb-ext-capabilities" aria-label="Extension capabilities">
            <h2>What stays extensible</h2>
            <ul>
              <li>Replace whole surfaces or wrap stock children.</li>
              <li>Use store actions and adapters from inside a slot.</li>
              <li>Target desktop or mobile with the same slot contract.</li>
              <li>Ship overrides from the host without changing core components.</li>
            </ul>
          </section>
        </div>
      </aside>

      <section className="bb-ext-preview" aria-label="Live extensibility preview">
        <header className="bb-ext-preview__bar">
          <div>
            <span className="bb-ext-preview__pulse" aria-hidden="true" />
            <strong>Live preview</strong>
            <span>{activeCount === 0 ? "stock slots" : `${activeCount} custom slots`}</span>
          </div>
          <code>&lt;GrokBotApp slots=&#123;slots&#125; /&gt;</code>
        </header>
        <div className="bb-ext-preview__stage">
          <GrokBotApp className="bb-ext-preview__bot" slots={slots} />
          <span className="bb-ext-preview__watermark" aria-hidden="true">
            HOST COMPOSITION / 04 SLOTS
          </span>
        </div>
      </section>
    </main>
  );
}

export default ExtensibilityPage;
