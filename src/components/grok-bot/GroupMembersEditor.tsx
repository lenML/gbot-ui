import type { GrokBotAgent } from "../../lib/grok-bot/types";
import { GROUP_MAX_MEMBERS, GROUP_MIN_MEMBERS } from "../../lib/grok-bot/types";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";

const DEFAULT_MAX_MEMBERS = GROUP_MAX_MEMBERS;

export interface GroupMembersEditorProps {
  group: GrokBotAgent;
  candidates: GrokBotAgent[];
  maxMembers?: number;
  disabled?: boolean;
  onAdd: (agentId: string) => void;
  onRemove: (agentId: string) => void;
}

export function GroupMembersEditor({
  group,
  candidates,
  maxMembers = DEFAULT_MAX_MEMBERS,
  disabled = false,
  onAdd,
  onRemove,
}: GroupMembersEditorProps) {
  const atLimit = group.memberIds.length >= maxMembers;
  const atMin = group.memberIds.length <= GROUP_MIN_MEMBERS;
  const addableCandidates = candidates.filter(
    (candidate) => !candidate.isGroup && !group.memberIds.includes(candidate.id),
  );

  return (
    <div className="baby-grok-bot-settings-members-editor">
      <section className="baby-grok-bot-settings-section">
        <div className="baby-grok-bot-settings-section__header">
          <h3>Members</h3>
          <p>
            {group.memberIds.length}/{maxMembers} group members. Keep between{" "}
            {GROUP_MIN_MEMBERS} and {maxMembers}.
          </p>
        </div>
        <div className="baby-grok-bot-settings-section__body">
          {group.memberIds.length > 0 ? (
            <ul aria-label="Current group members" className="baby-grok-bot-settings-members">
              {group.memberIds.map((agentId) => {
                const candidate = candidates.find((item) => item.id === agentId);
                const member = group.members?.find((item) => item.id === agentId);
                const name = candidate?.name ?? member?.name ?? agentId;
                const description =
                  candidate?.title ?? member?.title ?? candidate?.description ?? "Agent";

                return (
                  <li className="baby-grok-bot-settings-member" key={agentId}>
                    <AgentAvatar
                      agent={
                        candidate ?? {
                          name,
                          hue: member?.hue,
                          avatarModel: member?.avatarModel,
                        }
                      }
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="baby-grok-bot-settings-row__title">{name}</span>
                      <span className="baby-grok-bot-settings-row__description">
                        {description}
                      </span>
                    </span>
                    <button
                      aria-label={`Remove ${name} from group`}
                      className="baby-grok-bot-settings-link"
                      disabled={disabled || atMin}
                      onClick={() => onRemove(agentId)}
                      type="button"
                    >
                      <GrokBotIcon name="trash" size={13} />
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="baby-grok-bot-settings-empty">No members in this group.</p>
          )}
        </div>
      </section>

      <section className="baby-grok-bot-settings-section">
        <div className="baby-grok-bot-settings-section__header">
          <h3>Add bots</h3>
          <p>
            {atLimit
              ? "Member limit reached."
              : "Choose a bot to add to this group."}
          </p>
        </div>
        <div className="baby-grok-bot-settings-section__body">
          {addableCandidates.length > 0 ? (
            <ul aria-label="Bots available to add" className="baby-grok-bot-settings-members">
              {addableCandidates.map((candidate) => (
                <li className="baby-grok-bot-settings-member" key={candidate.id}>
                  <AgentAvatar agent={candidate} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="baby-grok-bot-settings-row__title">
                      {candidate.name}
                    </span>
                    <span className="baby-grok-bot-settings-row__description">
                      {candidate.title ?? candidate.description ?? "Agent"}
                    </span>
                  </span>
                  <button
                    aria-label={`Add ${candidate.name} to group`}
                    className="baby-grok-bot-settings-link"
                    disabled={disabled || atLimit}
                    onClick={() => onAdd(candidate.id)}
                    type="button"
                  >
                    <GrokBotIcon name="plus" size={13} />
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="baby-grok-bot-settings-empty">No bots available to add.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default GroupMembersEditor;