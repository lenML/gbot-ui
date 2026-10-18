import type { CSSProperties, ReactNode } from "react";

export type BabyGrokBotTheme = "auto" | "cursor-light" | "cursor-dark";

export type CssVariableStyle = CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};

export type AgentHue =
  | number
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "violet"
  | "magenta";

export interface AgentThemeFields {
  avatar?: string;
  coat?: string;
  accent?: string;
  tint?: string;
  glassTint?: string;
  bubbleBackground?: string;
  bubbleForeground?: string;
  bubbleInk?: string;
}

export type AgentTheme = CssVariableStyle & AgentThemeFields;

export interface AgentPalette {
  avatar: string;
  coat: string;
  accent: string;
  tint: string;
  glassTint: string;
  bubbleBackground: string;
  bubbleForeground: string;
  pillBackground: string;
  pillForeground: string;
}

export interface BabyGrokBotProps {
  children: ReactNode;
  agentName?: string;
  theme?: BabyGrokBotTheme;
  agentTheme?: AgentTheme;
  className?: string;
  mounted?: boolean;
  inert?: boolean;
}

export interface GrokBotMarkProps {
  className?: string;
  foreground?: string;
  background?: string;
}

export type CardBadgeTone = "info" | "warning" | "success" | "accent" | "muted";

export interface CardBadgeProps {
  label: string;
  tone: CardBadgeTone;
  spinner?: boolean;
}

export interface TranscriptAgent {
  name: string;
  hue?: AgentHue;
}

export interface TranscriptBaseEntry {
  id?: string;
  timestampMs?: number;
  reactions?: readonly string[];
  className?: string;
}

export interface TranscriptMessageEntry extends TranscriptBaseEntry {
  kind: "message";
  role: "user" | "assistant";
  content: string;
  author?: string;
  agent?: TranscriptAgent;
}

export interface TranscriptSystemEvent {
  type: string;
  agent?: TranscriptAgent;
  name?: string;
  label?: string;
}

export interface TranscriptSystemEntry extends TranscriptBaseEntry {
  kind: "system";
  event?: TranscriptSystemEvent;
  type?: string;
  agent?: TranscriptAgent;
  label?: string;
}

export interface TranscriptUserEntry extends TranscriptBaseEntry {
  kind: "user";
  content: string;
  author?: string;
}

export interface TranscriptAgentEntry extends TranscriptBaseEntry {
  kind: "agent";
  content: string;
  author?: string;
  agent?: TranscriptAgent;
}

export type TranscriptEntry =
  | TranscriptMessageEntry
  | TranscriptSystemEntry
  | TranscriptUserEntry
  | TranscriptAgentEntry;

export interface TranscriptProps {
  entries: TranscriptEntry[];
  isAgentComposing?: boolean;
  className?: string;
}

const HUE_ALIASES: Record<string, number> = {
  gray: 0,
  red: 6,
  orange: 28,
  yellow: 43,
  green: 145,
  teal: 174,
  blue: 214,
  indigo: 238,
  violet: 270,
  magenta: 326,
};

const AGENT_HUES = [326, 43, 214, 174, 270, 6, 28, 145, 238, 302];

const KNOWN_AGENT_HUES: Record<string, number> = {
  "support desk": 326,
  "sales outbound": 43,
  "account manager": 270,
  "inbox manager": 214,
};

export function getAgentHue(name = "agent", hue?: AgentHue): number {
  if (typeof hue === "number" && Number.isFinite(hue)) return hue;
  if (typeof hue === "string" && HUE_ALIASES[hue] !== undefined) {
    return HUE_ALIASES[hue];
  }

  const knownHue = KNOWN_AGENT_HUES[name.trim().toLowerCase()];
  if (knownHue !== undefined) return knownHue;

  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return AGENT_HUES[hash % AGENT_HUES.length] ?? 326;
}

export function getAgentPalette(name = "agent", hue?: AgentHue): AgentPalette {
  const resolvedHue = getAgentHue(name, hue);
  const avatar = `hsl(${resolvedHue} 72% 58%)`;
  const bubbleBackground = `light-dark(hsl(${resolvedHue} 66% 43%), hsl(${resolvedHue} 70% 68%))`;
  const accent = `light-dark(hsl(${resolvedHue} 70% 42%), hsl(${resolvedHue} 82% 72%))`;
  const tint = `light-dark(hsl(${resolvedHue} 68% 88%), hsl(${resolvedHue} 42% 30%))`;

  return {
    avatar,
    coat: avatar,
    accent,
    tint,
    glassTint: tint,
    bubbleBackground,
    bubbleForeground: "#ffffff",
    pillBackground: `light-dark(color-mix(in srgb, ${avatar} 14%, #ffffff), color-mix(in srgb, ${avatar} 22%, #16161a))`,
    pillForeground: `light-dark(color-mix(in srgb, ${avatar} 62%, #101014), color-mix(in srgb, ${avatar} 82%, #ffffff))`,
  };
}