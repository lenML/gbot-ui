import type { CSSProperties } from "react";
import type { GrokBotIconName } from "../../lib/grok-bot/types";

const ICON_CODEPOINTS: Record<GrokBotIconName, string> = {
  search: "EA6D",
  close: "ED82",
  person: "EA67",
  people: "EA7E",
  info: "EA74",
  "device-desktop": "EA7A",
  plus: "EA60",
  mic: "EC12",
  "arrow-up": "EAA1",
  check: "EAB2",
  clock: "EDC0",
  globe: "EB01",
  pencil: "EA73",
  "pencil-square": "EDDD",
  loading: "EDCA",
  "check-circle": "EDBA",
  "x-circle": "EA87",
  trash: "EA81",
  "funnel-simple": "EB83",
  gear: "EAF8",
  brain: "ED87",
  image: "EAEA",
  link: "EB15",
  "chevron-left": "EAB5",
  "git-branch": "EDB4",
  "plus-minus": "F302",
  "arrow-right-up": "EDC1",
};

export interface GrokBotIconProps {
  name: GrokBotIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function GrokBotIcon({
  name,
  size = 16,
  className,
  style,
}: GrokBotIconProps) {
  const codepoint = ICON_CODEPOINTS[name];

  return (
    <span
      aria-hidden="true"
      className={className}
      data-grok-bot-icon={name}
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "CursorIcons16",
        fontSize: `${size}px`,
        lineHeight: 1,
        ...style,
      }}
    >
      {String.fromCodePoint(Number.parseInt(codepoint, 16))}
    </span>
  );
}