import { useEffect, useState } from "react";
import { useGrokBotStore } from "../../lib/grok-bot/store";
import type {
  AgentSetting,
  AgentToolConfig,
  GrokBotAgent,
  GrokBotAvatarShape,
} from "../../lib/grok-bot/types";
import { PRODUCT_AVATAR_SHAPES } from "../../lib/grok-bot/avatarShapes";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";
import { GroupMembersEditor } from "./GroupMembersEditor";
import { getAvatarShapeData, resolveAvatarShape } from "./avatarShapeData";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

function permissionLabel(tool: AgentToolConfig) {
  switch (tool.permission) {
    case "allow":
      return "Always allow";
    case "deny":
      return "Blocked";
    default:
      return "Ask first";
  }
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="baby-grok-bot-settings-toggle"
      data-checked={checked || undefined}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="baby-grok-bot-settings-toggle__thumb" />
    </button>
  );
}

function Section({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="baby-grok-bot-settings-section">
      <div className="baby-grok-bot-settings-section__header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="baby-grok-bot-settings-section__body">{children}</div>
    </section>
  );
}

function NotificationRow({
  setting,
  onToggle,
}: {
  setting: AgentSetting | null;
  onToggle: (enabled: boolean) => void;
}) {
  if (!setting) {
    return (
      <p className="baby-grok-bot-settings-empty">
        No notification setting is available.
      </p>
    );
  }

  return (
    <div className="baby-grok-bot-settings-row">
      <span className="min-w-0 flex-1">
        <span className="baby-grok-bot-settings-row__title">
          {setting.label}
        </span>
        {setting.description ? (
          <span className="baby-grok-bot-settings-row__description">
            {setting.description}
          </span>
        ) : null}
      </span>
      <Toggle
        checked={setting.isEnabled}
        label={setting.label}
        onChange={onToggle}
      />
    </div>
  );
}

export interface AgentSettingsPanelProps {
  agentId?: string;
  className?: string;
  onOpenComputer?: () => void;
}

export function AgentSettingsPanel({
  agentId,
  className,
  onOpenComputer,
}: AgentSettingsPanelProps) {
  const { state, actions } = useGrokBotStore();
  const activeConversation = state.agents.find(
    (candidate) => candidate.id === state.activeAgentId,
  );
  const agent =
    state.botProfiles.find(
      (candidate) => candidate.id === (agentId ?? state.settingsAgentId),
    ) ??
    state.agents.find(
      (candidate) => candidate.id === (agentId ?? state.settingsAgentId),
    ) ??
    state.botProfiles.find(
      (candidate) =>
        candidate.id === (activeConversation?.botId ?? activeConversation?.id),
    ) ??
    state.botProfiles[0] ??
    null;
  const [draft, setDraft] = useState<
    Pick<GrokBotAgent, "name" | "title" | "description">
  >({
    name: agent?.name ?? "",
    title: agent?.title ?? "",
    description: agent?.description ?? "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft({
      name: agent?.name ?? "",
      title: agent?.title ?? "",
      description: agent?.description ?? "",
    });
    setSaved(false);
  }, [agent?.id, agent?.name, agent?.title, agent?.description]);

  if (!agent) {
    return (
      <div className={cn("baby-grok-bot-settings-panel", className)}>
        <p className="baby-grok-bot-settings-empty">No agent selected.</p>
      </div>
    );
  }

  const tools = agent.tools ?? state.content.tools ?? [];
  const computers = state.content.computers ?? [];
  const notification =
    agent.settings?.find((setting) =>
      `${setting.id} ${setting.label}`.toLowerCase().includes("notif"),
    ) ?? null;
  const nameChanged = draft.name.trim() !== agent.name;
  const titleChanged = (draft.title ?? "") !== (agent.title ?? "");
  const descriptionChanged =
    (draft.description ?? "") !== (agent.description ?? "");
  const profileChanged = nameChanged || titleChanged || descriptionChanged;
  const avatarShape = resolveAvatarShape(agent.avatarModel?.shape ?? "blob");
  const groupCandidates = state.botProfiles;

  const saveProfile = () => {
    if (!draft.name.trim()) return;
    actions.updateAgentProfile(agent.id, {
      name: draft.name,
      title: draft.title,
      description: draft.description,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div
      className={cn("baby-grok-bot-settings-panel", className)}
      data-agent-id={agent.id}
    >
      <div className="baby-grok-bot-settings-identity">
        <AgentAvatar agent={agent} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-5">
            {agent.name}
          </span>
          <span className="block truncate text-[11px] leading-4 text-[var(--cursor-text-tertiary)]">
            {agent.isGroup
              ? `${agent.memberIds.length} members`
              : (agent.title ?? "Agent profile")}
          </span>
        </span>
        {agent.isGroup ? (
          <span className="baby-grok-bot-settings-kind">Group</span>
        ) : null}
      </div>

      <Section
        title="Profile"
        description="Name and identity shown across chats and messages."
      >
        <label className="baby-grok-bot-settings-field">
          <span>Avatar shape</span>
          <select
            aria-label="Avatar shape"
            onChange={(event) =>
              actions.updateAgentProfile(agent.id, {
                avatarModel: {
                  ...agent.avatarModel,
                  shape: event.target.value as GrokBotAvatarShape,
                },
              })
            }
            value={avatarShape}
          >
            {PRODUCT_AVATAR_SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {getAvatarShapeData(shape).label}
              </option>
            ))}
          </select>
        </label>
        <label className="baby-grok-bot-settings-field">
          <span>Name</span>
          <input
            aria-label="Agent name"
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            value={draft.name}
          />
        </label>
        <label className="baby-grok-bot-settings-field">
          <span>Title</span>
          <input
            aria-label="Agent title"
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="What this agent does"
            value={draft.title ?? ""}
          />
        </label>
        <label className="baby-grok-bot-settings-field">
          <span>Description</span>
          <textarea
            aria-label="Agent description"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Instructions and scope"
            rows={4}
            value={draft.description ?? ""}
          />
        </label>
        <div className="baby-grok-bot-settings-actions">
          <button
            className="baby-grok-bot-settings-save"
            disabled={!profileChanged || !draft.name.trim()}
            onClick={saveProfile}
            type="button"
          >
            {saved ? "Saved" : "Save profile"}
          </button>
          <button
            className="baby-grok-bot-settings-reset"
            disabled={!profileChanged}
            onClick={() =>
              setDraft({
                name: agent.name,
                title: agent.title ?? "",
                description: agent.description ?? "",
              })
            }
            type="button"
          >
            Reset
          </button>
        </div>
      </Section>

      <Section
        title="Appearance"
        description="Theme applies across all conversations."
      >
        <label className="baby-grok-bot-settings-field">
          <span>Theme</span>
          <select
            aria-label="Theme"
            onChange={(event) =>
              actions.setTheme(event.target.value as typeof state.theme)
            }
            value={state.theme}
          >
            <option value="auto">Follow system</option>
            <option value="cursor-light">Light</option>
            <option value="cursor-dark">Dark</option>
          </select>
        </label>
      </Section>

      {agent.isGroup ? (
        <GroupMembersEditor
          candidates={groupCandidates}
          group={agent}
          onAdd={(memberId) => actions.addGroupMember(agent.id, memberId)}
          onRemove={(memberId) => actions.removeGroupMember(agent.id, memberId)}
        />
      ) : (
        <>
          <Section
            title="Tools"
            description="Capabilities this agent can use. Changes apply immediately."
          >
            <div className="baby-grok-bot-settings-tools">
              {tools.map((tool) => (
                <div className="baby-grok-bot-settings-tool" key={tool.id}>
                  <span
                    className="baby-grok-bot-settings-tool__icon"
                    aria-hidden="true"
                  >
                    <GrokBotIcon
                      name={
                        tool.id === "screen"
                          ? "device-desktop"
                          : tool.id === "email"
                            ? "globe"
                            : "brain"
                      }
                      size={14}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="baby-grok-bot-settings-row__title">
                      {tool.label}
                    </span>
                    <span className="baby-grok-bot-settings-row__description">
                      {tool.description ?? permissionLabel(tool)}
                    </span>
                  </span>
                  <Toggle
                    checked={tool.isEnabled}
                    label={`${tool.label} enabled`}
                    onChange={(enabled) =>
                      actions.setAgentToolEnabled(agent.id, tool.id, enabled)
                    }
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Computer"
            description="Assign a cloud, local, or VNC-backed machine."
          >
            <label className="baby-grok-bot-settings-field">
              <span>Assigned computer</span>
              <select
                aria-label="Assigned computer"
                onChange={(event) =>
                  actions.assignAgentComputer(
                    agent.id,
                    event.target.value || null,
                  )
                }
                value={agent.computerId ?? ""}
              >
                <option value="">No computer</option>
                {computers.map((computer) => (
                  <option key={computer.id} value={computer.id}>
                    {computer.label} - {computer.status ?? "available"}
                  </option>
                ))}
              </select>
            </label>
            <div className="baby-grok-bot-settings-computer">
              <span
                className="baby-grok-bot-settings-computer__icon"
                aria-hidden="true"
              >
                <GrokBotIcon name="device-desktop" size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="baby-grok-bot-settings-row__title">
                  {computers.find(
                    (computer) => computer.id === agent.computerId,
                  )?.label ?? "No computer assigned"}
                </span>
                <span className="baby-grok-bot-settings-row__description">
                  {computers.find(
                    (computer) => computer.id === agent.computerId,
                  )?.kind ?? "Configure a runtime"}
                </span>
              </span>
              {onOpenComputer ? (
                <button
                  className="baby-grok-bot-settings-link"
                  onClick={onOpenComputer}
                  type="button"
                >
                  Open
                </button>
              ) : null}
            </div>
          </Section>

          <Section title="Notifications">
            <NotificationRow
              onToggle={(enabled) =>
                notification &&
                actions.setAgentSettingEnabled(
                  agent.id,
                  notification.id,
                  enabled,
                )
              }
              setting={notification}
            />
          </Section>
        </>
      )}
    </div>
  );
}

export default AgentSettingsPanel;
