import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useGrokBotStore } from "../../lib/grok-bot/store";
import { AgentAvatar, GrokBotIcon } from "./AgentAvatar";

const MAX_GROUP_MEMBERS = 6;

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface CreateGroupDialogProps {
  className?: string;
  onCreated?: (groupId: string) => void;
  presentation?: "dialog" | "sheet";
}

export function CreateGroupDialog({
  className,
  onCreated,
  presentation = "dialog",
}: CreateGroupDialogProps) {
  const { state, actions } = useGrokBotStore();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.isCreateGroupOpen) return;
    const frame = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [state.isCreateGroupOpen]);

  if (!state.isCreateGroupOpen) return null;

  const candidates = state.agents.filter(
    (agent) => !agent.isGroup && !state.hiddenAgentIds.has(agent.id),
  );
  const selectedCount = state.groupDraftMemberIds.length;
  const atLimit = selectedCount >= MAX_GROUP_MEMBERS;
  const canCreate = selectedCount > 0;

  const handleCreate = () => {
    const groupId = actions.createGroup(state.groupDraftName);
    if (groupId) onCreated?.(groupId);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      actions.closeCreateGroup();
    }
  };

  return (
    <div
      className={cn("baby-grok-bot-dialog-layer", className)}
      data-presentation={presentation}
      onKeyDown={handleKeyDown}
    >
      <button
        aria-label="Close create group"
        className="baby-grok-bot-dialog-layer__backdrop"
        onClick={actions.closeCreateGroup}
        type="button"
      />
      <div
        aria-labelledby="baby-grok-bot-create-group-title"
        aria-modal="true"
        className="baby-grok-bot-dialog"
        role="dialog"
      >
        <header className="baby-grok-bot-dialog__header">
          <span className="baby-grok-bot-dialog__icon" aria-hidden="true">
            <GrokBotIcon name="people" size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <h2 id="baby-grok-bot-create-group-title">Create group</h2>
            <p>Start one shared chat with up to six bots.</p>
          </span>
          <button
            aria-label="Close create group"
            className="baby-grok-bot-window-action"
            onClick={actions.closeCreateGroup}
            type="button"
          >
            <GrokBotIcon name="close" size={13} />
          </button>
        </header>

        <div className="baby-grok-bot-dialog__body">
          <label className="baby-grok-bot-dialog__field">
            <span>Group name</span>
            <input
              aria-label="Group name"
              maxLength={80}
              onChange={(event) => actions.setGroupDraftName(event.target.value)}
              placeholder="e.g. Renewal room"
              ref={nameRef}
              value={state.groupDraftName}
            />
          </label>

          <div className="baby-grok-bot-group-picker">
            <div className="baby-grok-bot-group-picker__header">
              <span>
                <strong>Members</strong>
                <small>Bots become equal participants in the group chat.</small>
              </span>
              <span className="baby-grok-bot-group-picker__count" data-limit={atLimit || undefined}>
                {selectedCount}/{MAX_GROUP_MEMBERS}
              </span>
            </div>

            <div
              aria-label="Group members"
              aria-multiselectable="true"
              className="baby-grok-bot-group-picker__list"
              role="listbox"
            >
              {candidates.length > 0 ? (
                candidates.map((candidate) => {
                  const selected = state.groupDraftMemberIds.includes(candidate.id);
                  const disabled = !selected && atLimit;
                  return (
                    <button
                      aria-selected={selected}
                      className="baby-grok-bot-group-candidate"
                      data-selected={selected || undefined}
                      disabled={disabled}
                      key={candidate.id}
                      onClick={() => actions.toggleGroupDraftMember(candidate.id)}
                      role="option"
                      type="button"
                    >
                      <AgentAvatar agent={candidate} size={34} />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[13px] font-medium leading-4">
                          {candidate.name}
                        </span>
                        <span className="block truncate text-[11px] leading-4 text-[var(--cursor-text-tertiary)]">
                          {candidate.title ?? candidate.description ?? "Agent"}
                        </span>
                      </span>
                      <span className="baby-grok-bot-group-candidate__check" aria-hidden="true">
                        {selected ? <GrokBotIcon name="check" size={13} /> : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="baby-grok-bot-dialog__empty">Create a bot before creating a group.</p>
              )}
            </div>
          </div>
        </div>

        <footer className="baby-grok-bot-dialog__footer">
          <span className="baby-grok-bot-dialog__hint">
            {selectedCount === 0
              ? "Select at least one bot."
              : atLimit
                ? "Member limit reached."
                : `${selectedCount} participant${selectedCount === 1 ? "" : "s"} selected.`}
          </span>
          <button
            className="baby-grok-bot-dialog__cancel"
            onClick={actions.closeCreateGroup}
            type="button"
          >
            Cancel
          </button>
          <button
            className="baby-grok-bot-dialog__create"
            disabled={!canCreate}
            onClick={handleCreate}
            type="button"
          >
            Create group
          </button>
        </footer>
      </div>
    </div>
  );
}

export default CreateGroupDialog;