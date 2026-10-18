import { motion, useReducedMotion } from "motion/react";
import type { CssVariableStyle, BabyGrokBotProps } from "../lib/types";
import { getAgentPalette } from "../lib/types";
import { useResolvedBabyGrokBotTheme } from "../lib/theme";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function BabyGrokBot({
  children,
  agentName,
  theme = "auto",
  agentTheme,
  className,
  mounted = true,
  inert = true,
}: BabyGrokBotProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const resolvedTheme = useResolvedBabyGrokBotTheme(theme);
  const palette = getAgentPalette(agentName);
  const {
    glassTint,
    tint,
    bubbleBackground,
    bubbleForeground,
    bubbleInk,
    accent,
    avatar,
    coat,
    ...styleOverrides
  } = agentTheme ?? {};

  const style: CssVariableStyle = {
    "--grok-bot-current-agent-tint": palette.glassTint,
    "--grok-bot-current-agent-bubble": palette.bubbleBackground,
    "--grok-bot-current-agent-bubble-ink": palette.bubbleForeground,
    "--grok-bot-current-agent-accent": palette.accent,
    "--grok-bot-current-agent-coat": palette.coat,
    ...styleOverrides,
  };

  if (glassTint ?? tint) {
    style["--grok-bot-current-agent-tint"] = glassTint ?? tint;
  }
  if (bubbleBackground) {
    style["--grok-bot-current-agent-bubble"] = bubbleBackground;
  }
  if (bubbleInk ?? bubbleForeground) {
    style["--grok-bot-current-agent-bubble-ink"] =
      bubbleInk ?? bubbleForeground;
  }
  if (accent) style["--grok-bot-current-agent-accent"] = accent;
  if (avatar ?? coat) {
    style["--grok-bot-current-agent-coat"] = avatar ?? coat;
  }

  return (
    <motion.div
      animate={{ opacity: mounted ? 1 : 0 }}
      aria-hidden={!mounted || undefined}
      className={cn(
        "baby-grok-bot transition-opacity duration-300 ease-out motion-reduce:transition-none",
        className,
      )}
      data-agent-name={agentName}
      data-mounted={mounted || undefined}
      data-theme={resolvedTheme}
      inert={inert || undefined}
      initial={false}
      style={style}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}