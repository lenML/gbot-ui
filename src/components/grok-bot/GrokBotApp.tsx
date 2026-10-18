import { BabyGrokBot } from "../BabyGrokBot";
import {
  GrokBotStoreProvider,
  useActiveAgent,
  useGrokBotContent,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import { DEFAULT_DEMO_CONTENT } from "../../lib/grok-bot/demoContent";
import type { GrokBotSlots } from "../../lib/grok-bot/extensions";
import type {
  GrokBotContent,
  GrokBotIntegrations,
} from "../../lib/grok-bot/types";
import { getAgentPalette, type BabyGrokBotTheme } from "../../lib/types";
import { DesktopShell } from "./DesktopShell";
import { GrokBotMobileApp } from "./GrokBotMobileApp";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface GrokBotAppProps {
  content?: GrokBotContent;
  activeConversationId?: string;
  /** @deprecated Use activeConversationId. */
  activeAgentId?: string;
  className?: string;
  integrations?: GrokBotIntegrations;
  slots?: GrokBotSlots;
  theme?: BabyGrokBotTheme;
}

function GrokBotAppSurface({ className }: Pick<GrokBotAppProps, "className">) {
  const state = useGrokBotStore();
  const agent = useActiveAgent();
  const content = useGrokBotContent();
  const palette = agent ? getAgentPalette(agent.name, agent.hue) : null;

  return (
    <BabyGrokBot
      agentName={agent?.name ?? content.appName}
      agentTheme={
        palette
          ? {
              accent: palette.accent,
              avatar: palette.avatar,
              coat: palette.coat,
              tint: palette.tint,
              glassTint: palette.glassTint,
              bubbleBackground: palette.bubbleBackground,
              bubbleForeground: palette.bubbleForeground,
              bubbleInk: palette.bubbleForeground,
            }
          : undefined
      }
      className={cn("baby-grok-bot-app h-full min-h-0", className)}
      theme={state.theme}
      inert={false}
    >
      <DesktopShell className="min-h-0 max-[767px]:hidden" />
    </BabyGrokBot>
  );
}

export function GrokBotApp({
  content,
  activeConversationId,
  activeAgentId,
  className,
  integrations,
  slots,
  theme,
}: GrokBotAppProps) {
  return (
    <GrokBotStoreProvider
      activeAgentId={activeConversationId ?? activeAgentId}
      content={content ?? DEFAULT_DEMO_CONTENT}
      integrations={integrations}
      slots={slots}
      theme={theme}
    >
      <GrokBotAppSurface className={className} />
      <GrokBotMobileApp />
    </GrokBotStoreProvider>
  );
}

export default GrokBotApp;
