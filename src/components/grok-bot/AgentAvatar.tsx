import type { CSSProperties, ReactNode } from "react";
import { getAgentPalette } from "../../lib/types";
import type { AgentHue } from "../../lib/types";
import type {
  AgentStatus,
  GrokBotAgent,
  GrokBotGroupMember,
  GrokBotIconName,
} from "../../lib/grok-bot/types";
import { GrokBotAvatarMark } from "./GrokBotAvatarMark";
import type { AvatarMotionMode, AvatarShape, AvatarState } from "./GrokBotAvatarMark";
import { PRODUCT_AVATAR_SHAPES } from "../../lib/grok-bot/avatarShapes";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface GrokBotIconProps {
  name: GrokBotIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function GrokBotIcon({
  name,
  size = 16,
  strokeWidth = 1.6,
  className,
}: GrokBotIconProps) {
  let content: ReactNode;

  switch (name) {
    case "search":
      content = (
        <>
          <circle cx="8.5" cy="8.5" r="5.25" />
          <path d="m12.4 12.4 4.1 4.1" />
        </>
      );
      break;
    case "close":
      content = <path d="m5 5 10 10M15 5 5 15" />;
      break;
    case "person":
      content = (
        <>
          <circle cx="10" cy="6.5" r="3" />
          <path d="M4.5 16c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
        </>
      );
      break;
    case "people":
      content = (
        <>
          <circle cx="7.3" cy="7" r="2.5" />
          <circle cx="13.7" cy="7.8" r="2" />
          <path d="M2.8 16c.6-2.7 2.1-4 4.5-4s3.9 1.3 4.5 4M11.4 12.6c.7-.4 1.5-.6 2.3-.6 2 0 3.3 1.1 3.8 3.4" />
        </>
      );
      break;
    case "info":
      content = (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 9v4.5M10 6.5h.01" />
        </>
      );
      break;
    case "device-desktop":
      content = (
        <>
          <rect x="2.5" y="3.5" width="15" height="10.5" rx="1.5" />
          <path d="M7.5 17h5M10 14v3" />
        </>
      );
      break;
    case "plus":
      content = <path d="M10 4v12M4 10h12" />;
      break;
    case "mic":
      content = (
        <>
          <rect x="7" y="2.5" width="6" height="10" rx="3" />
          <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3" />
        </>
      );
      break;
    case "arrow-up":
      content = <path d="M10 16V4M5.5 8.5 10 4l4.5 4.5" />;
      break;
    case "check":
      content = <path d="m4.5 10.2 3.3 3.3 7.7-7.7" />;
      break;
    case "clock":
      content = (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4.4l3 1.8" />
        </>
      );
      break;
    case "globe":
      content = (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M3 10h14M10 3c1.7 1.9 2.6 4.2 2.6 7S11.7 15.1 10 17c-1.7-1.9-2.6-4.2-2.6-7S8.3 4.9 10 3Z" />
        </>
      );
      break;
    case "pencil":
      content = <path d="m4 14.7-.7 2.7 2.7-.7L15.8 6.9l-2-2L4 14.7ZM12.7 6l2 2" />;
      break;
    case "pencil-square":
      content = (
        <>
          <path d="M4 3.5h7M4 3.5v13h13v-7" />
          <path d="m9 11-.5 2.5L11 13l5.7-5.7-2-2L9 11Z" />
        </>
      );
      break;
    case "loading":
      content = <path d="M16.5 10a6.5 6.5 0 1 1-2.1-4.8" />;
      break;
    case "check-circle":
      content = (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="m6.5 10.1 2.2 2.2 4.9-4.9" />
        </>
      );
      break;
    case "x-circle":
      content = (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="m7 7 6 6M13 7l-6 6" />
        </>
      );
      break;
    case "trash":
      content = (
        <>
          <path d="M4.5 6h11M8 3.5h4M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5" />
        </>
      );
      break;
    case "funnel-simple":
      content = <path d="M3.5 5h13L12 10.5V16l-4 1v-6.5L3.5 5Z" />;
      break;
    case "gear":
      content = (
        <>
          <circle cx="10" cy="10" r="2.7" />
          <path d="m10 2.5.8 1.7 1.8.5 1.5-1 1.2 1.2-1 1.5.5 1.8 1.7.8v1.7l-1.7.8-.5 1.8 1 1.5-1.2 1.2-1.5-1-1.8.5-.8 1.7H10l-.8-1.7-1.8-.5-1.5 1-1.2-1.2 1-1.5-.5-1.8-1.7-.8V10l1.7-.8.5-1.8-1-1.5 1.2-1.2 1.5 1 1.8-.5.8-1.7H10Z" />
        </>
      );
      break;
    case "brain":
      content = (
        <>
          <path d="M9.4 4.4A2.8 2.8 0 0 0 4.5 6a2.6 2.6 0 0 0-1 4.6 2.8 2.8 0 0 0 2.2 4.4c.4.7 1.1 1.2 2 1.2 1 0 1.7-.5 1.7-1.8V4.4Z" />
          <path d="M10.6 4.4A2.8 2.8 0 0 1 15.5 6a2.6 2.6 0 0 1 1 4.6 2.8 2.8 0 0 1-2.2 4.4c-.4.7-1.1 1.2-2 1.2-1 0-1.7-.5-1.7-1.8V4.4Z" />
        </>
      );
      break;
    case "image":
      content = (
        <>
          <rect x="3" y="3.5" width="14" height="13" rx="2" />
          <circle cx="7" cy="7.5" r="1.2" />
          <path d="m4.5 14 4-4 3 3 2-2 2 3" />
        </>
      );
      break;
    case "link":
      content = (
        <>
          <path d="m8 12 4-4M6.2 13.8l-1 1a2.8 2.8 0 0 1-4-4l2.5-2.5a2.8 2.8 0 0 1 4 0" />
          <path d="m13.8 6.2 1-1a2.8 2.8 0 0 1 4 4l-2.5 2.5a2.8 2.8 0 0 1-4 0" />
        </>
      );
      break;
    case "chevron-left":
      content = <path d="m12.5 4-6 6 6 6" />;
      break;
    case "git-branch":
      content = (
        <>
          <circle cx="6" cy="4.5" r="1.5" />
          <circle cx="14" cy="15.5" r="1.5" />
          <circle cx="6" cy="15.5" r="1.5" />
          <path d="M6 6v8M7.5 7.5c3.6 0 6.5 2.9 6.5 6.5" />
        </>
      );
      break;
    case "plus-minus":
      content = <path d="M4 6h5M6.5 3.5v5M11 14h5M3.5 16.5h13" />;
      break;
    case "arrow-right-up":
      content = <path d="M5 15 15 5M7 5h8v8" />;
      break;
    default:
      content = null;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 20 20"
      width={size}
    >
      {content}
    </svg>
  );
}

type AgentAvatarAgent = {
  name?: string;
  hue?: AgentHue;
  isGroup?: boolean;
  isRunning?: boolean;
  isComposingMessage?: boolean;
  status?: AgentStatus | null;
  hasUnread?: boolean;
  avatarModel?: GrokBotAgent["avatarModel"];
  memberIds?: GrokBotAgent["memberIds"];
  members?: GrokBotAgent["members"];
  avatarDataUrl?: string | null;
  avatarPhotoUrl?: string | null;
};

export interface AgentAvatarProps {
  name?: string;
  hue?: AgentHue;
  size?: number;
  isGroup?: boolean;
  group?: boolean;
  working?: boolean;
  unread?: boolean;
  status?: AgentStatus | null;
  className?: string;
  agent?: AgentAvatarAgent;
  avatarState?: AvatarState;
  shape?: AvatarShape;
  dataUrl?: string | null;
  motion?: AvatarMotionMode;
  paused?: boolean;
  isStatic?: boolean;
  emphasis?: boolean;
  followPointer?: boolean;
}

const STATUS_MOTION: Partial<Record<GrokBotIconName, AvatarState>> = {
  search: "thinking",
  globe: "thinking",
  brain: "thinking",
  pencil: "working",
  "pencil-square": "working",
  mic: "listening",
  loading: "working",
  clock: "working",
  "device-desktop": "working",
  "git-branch": "working",
  "check-circle": "done",
  "x-circle": "alert",
  "arrow-up": "speaking",
  "arrow-right-up": "speaking",
};

function hashString(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fallbackShape(seed: string, allowGrok = false): AvatarShape {
  const shapes: readonly AvatarShape[] = allowGrok
    ? ["grok", ...PRODUCT_AVATAR_SHAPES]
    : PRODUCT_AVATAR_SHAPES;
  return shapes[hashString(seed) % shapes.length] ?? "blob";
}

function resolveMotion(
  explicit: AvatarState | undefined,
  model: AvatarState | undefined,
  composing: boolean,
  running: boolean,
  working: boolean | undefined,
  status: AgentStatus | null,
): AvatarState {
  if (explicit) return explicit;
  if (model) return model;
  if (composing) return "thinking";
  if (working === true || running) return "working";
  if (working === false) return "idle";
  if (status) return STATUS_MOTION[status.icon] ?? "idle";
  return "idle";
}

function resolveGroupMembers(
  agent: AgentAvatarAgent | undefined,
  groupName: string,
): GrokBotGroupMember[] {
  if (agent?.members?.length) return agent.members;
  if (agent?.memberIds?.length) {
    return agent.memberIds.map((id) => ({ id, name: id }));
  }

  return [0, 1, 2].map((index) => ({
    id: `${groupName}-${index}`,
    name: `${groupName} ${index + 1}`,
    hue: [214, 326, 43][index],
    avatarModel: { shape: fallbackShape(`${groupName}-${index}`), motion: "idle" },
  }));
}

export function AgentAvatar({
  name,
  hue,
  size = 36,
  isGroup,
  group,
  working,
  unread,
  status,
  className,
  agent,
  avatarState,
  shape,
  dataUrl,
  motion = "auto",
  paused = false,
  isStatic = false,
  emphasis = false,
  followPointer = true,
}: AgentAvatarProps) {
  const resolvedName = agent?.name ?? name ?? "Agent";
  const resolvedHue = agent?.hue ?? hue;
  const resolvedGroup = isGroup ?? group ?? agent?.isGroup ?? false;
  const resolvedWorking =
    working ?? Boolean(agent?.isRunning || agent?.isComposingMessage);
  const resolvedUnread = unread ?? agent?.hasUnread ?? false;
  const resolvedStatus = status ?? agent?.status ?? null;
  const palette = getAgentPalette(resolvedName, resolvedHue);
  const model = agent?.avatarModel;
  const resolvedShape = shape ?? model?.shape ?? fallbackShape(resolvedName, true);
  const resolvedMotion = resolveMotion(
    avatarState,
    model?.motion,
    Boolean(agent?.isComposingMessage),
    Boolean(agent?.isRunning),
    working,
    resolvedStatus,
  );
  const resolvedSeed = model?.seed ?? hashString(`${resolvedName}:${resolvedShape}`);
  const resolvedDataUrl =
    dataUrl ?? agent?.avatarDataUrl ?? agent?.avatarPhotoUrl ?? null;
  const resolvedColor = model?.color ?? palette.avatar;
  const resolvedMotionMode: AvatarMotionMode = isStatic ? "off" : motion;
  const groupMembers = resolvedGroup ? resolveGroupMembers(agent, resolvedName) : [];
  const groupOverflow = Math.max(0, groupMembers.length - 4);
  const groupSlots = groupOverflow > 0 ? groupMembers.slice(0, 3) : groupMembers.slice(0, 4);
  const badgeSize = Math.max(7, Math.round(size * 0.24));
  const badgeIconSize = Math.max(7, Math.round(size * 0.24));
  const ring = Math.max(1.5, Math.round(size * 0.045));
  const kind = resolvedDataUrl ? "photo" : resolvedGroup ? "group" : "persona";
  const ariaLabel = [
    resolvedName,
    resolvedGroup ? "group" : null,
    resolvedStatus?.label,
    resolvedWorking ? "working" : null,
    resolvedUnread ? "unread" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "grok-bot-agent-avatar relative inline-flex shrink-0 items-center justify-center rounded-full",
        className,
      )}
      data-group={resolvedGroup || undefined}
      data-kind={kind}
      data-motion={resolvedMotion}
      data-shape={kind === "persona" ? resolvedShape : undefined}
      data-unread={resolvedUnread || undefined}
      data-working={resolvedWorking || undefined}
      role="img"
      style={
        {
          "--grok-bot-agent-avatar-size": `${size}px`,
          height: size,
          width: size,
        } as CSSProperties
      }
    >
      <span
        className="grok-bot-agent-avatar__surface"
        style={
          resolvedGroup
            ? { background: palette.pillBackground, color: palette.pillForeground }
            : {
                background: "var(--grok-bot-bg-editor, #fff)",
                color: resolvedColor,
              }
        }
      >
        {kind === "photo" ? (
          <span className="grok-bot-agent-avatar__photo">
            <GrokBotAvatarMark
              background="var(--grok-bot-bg-editor, #fff)"
              foreground={resolvedColor}
              motion="off"
              seed={resolvedSeed}
              shape={resolvedShape}
              size={size}
              state={resolvedMotion}
            />
            <img
              alt=""
              draggable={false}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
              src={resolvedDataUrl ?? undefined}
            />
          </span>
        ) : kind === "group" ? (
          <span
            aria-hidden="true"
            className="grok-bot-agent-avatar__group"
            data-count={groupSlots.length + (groupOverflow > 0 ? 1 : 0)}
          >
            {groupSlots.map((member, index) => {
              const memberPalette = getAgentPalette(member.name, member.hue);
              return (
                <span
                  className="grok-bot-agent-avatar__group-cell"
                  data-slot={index}
                  key={member.id}
                >
                  <GrokBotAvatarMark
                    background="var(--grok-bot-bg-editor, #fff)"
                    className="h-full w-full"
                    foreground={member.avatarModel?.color ?? memberPalette.avatar}
                    motion="off"
                    seed={member.avatarModel?.seed ?? hashString(member.id)}
                    shape={member.avatarModel?.shape ?? fallbackShape(member.id)}
                    size={Math.max(16, Math.round(size * 0.42))}
                    state={member.avatarModel?.motion ?? "idle"}
                  />
                </span>
              );
            })}
            {groupOverflow > 0 ? (
              <span className="grok-bot-agent-avatar__group-more">
                +{groupOverflow}
              </span>
            ) : null}
          </span>
        ) : (
          <GrokBotAvatarMark
            background="var(--grok-bot-bg-editor, #fff)"
            className="h-full w-full"
            emphasis={emphasis || resolvedWorking}
            followPointer={followPointer}
            foreground={resolvedColor}
            motion={resolvedMotionMode}
            paused={paused}
            seed={resolvedSeed}
            shape={resolvedShape}
            size={size}
            state={resolvedMotion}
          />
        )}
      </span>

      {resolvedStatus ? (
        <span
          className="grok-bot-agent-avatar__badge"
          style={{
            background: palette.accent,
            boxShadow: `0 0 0 ${ring}px var(--grok-bot-bg-editor, #fff)`,
            color: "#fff",
            height: badgeSize,
            width: badgeSize,
          }}
          title={resolvedStatus.label}
        >
          <GrokBotIcon
            name={resolvedStatus.icon}
            size={badgeIconSize}
            strokeWidth={2}
          />
        </span>
      ) : resolvedWorking ? (
        <span
          aria-hidden="true"
          className="grok-bot-agent-avatar__badge bg-[#34c759]"
          style={{
            boxShadow: `0 0 0 ${ring}px var(--grok-bot-bg-editor, #fff)`,
            height: badgeSize,
            width: badgeSize,
          }}
        />
      ) : resolvedUnread ? (
        <span
          aria-hidden="true"
          className="grok-bot-agent-avatar__badge"
          style={{
            background: "var(--grok-bot-fill-accent)",
            boxShadow: `0 0 0 ${ring}px var(--grok-bot-bg-editor, #fff)`,
            height: badgeSize,
            width: badgeSize,
          }}
        />
      ) : null}
    </span>
  );
}

export default AgentAvatar;
