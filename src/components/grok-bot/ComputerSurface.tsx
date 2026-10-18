import { useEffect, useState } from "react";
import type {
  GrokBotAgent,
  GrokBotComputerSession,
  TranscriptComputerUseEntry,
} from "../../lib/grok-bot/types";
import {
  useGrokBotContent,
  useGrokBotIntegrations,
} from "../../lib/grok-bot/store";
import {
  RemoteDesktopViewport,
  type DesktopWindow,
} from "../RemoteDesktopViewport";
import { desktopContentWindows } from "./desktopContent";

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export interface ComputerSurfaceProps {
  agent: GrokBotAgent;
  entry?: TranscriptComputerUseEntry | null;
  className?: string;
  expanded?: boolean;
  onExpand?: () => void;
  aspectRatioClass?: string;
  showDock?: boolean;
  windows?: DesktopWindow[];
}

export function ComputerSurface({
  agent,
  entry,
  className,
  expanded = false,
  onExpand,
  aspectRatioClass = "aspect-[16/10]",
  showDock = false,
  windows,
}: ComputerSurfaceProps) {
  const content = useGrokBotContent();
  const integrations = useGrokBotIntegrations();
  const adapter = integrations.computer;
  const resource =
    content.computers?.find((candidate) => candidate.id === agent.computerId) ??
    content.computers?.[0] ??
    null;
  const resourceId = resource?.id ?? null;
  const kind = resource?.kind ?? "cloud";
  const endpoint = resource?.endpoint;
  const entryId = entry?.id ?? "agent";
  const [adapterStatus, setAdapterStatus] = useState<
    GrokBotComputerSession["status"]
  >(() => {
    if (!adapter) return "idle";
    return resource?.status === "offline" ? "disconnected" : "connecting";
  });
  const session = {
    id: `${agent.id}:${entryId}`,
    agentId: agent.id,
    resourceId,
    kind,
    endpoint,
    status: adapterStatus,
    capabilities: resource?.capabilities ?? ["screen", "browser", "terminal"],
    metadata: {
      computerLabel: resource?.label ?? "Agent computer",
      screenKind: entry?.screenKind,
    },
  };

  useEffect(() => {
    if (!adapter) {
      setAdapterStatus("idle");
      return;
    }
    if (resource?.status === "offline") {
      setAdapterStatus("disconnected");
      return;
    }

    let cancelled = false;
    setAdapterStatus("connecting");
    Promise.resolve(adapter.connect?.(session))
      .then(() => {
        if (!cancelled) setAdapterStatus("connected");
      })
      .catch(() => {
        if (!cancelled) setAdapterStatus("error");
      });

    return () => {
      cancelled = true;
      Promise.resolve(adapter.disconnect?.(session)).catch(() => undefined);
    };
  }, [
    adapter,
    agent.id,
    endpoint,
    entryId,
    kind,
    resource?.status,
    resourceId,
  ]);

  if (adapter) {
    return (
      <div
        className={cn("baby-grok-bot-computer-surface h-full w-full", className)}
        data-computer-adapter={kind}
        data-computer-session={session.id}
      >
        {adapter.render(session)}
      </div>
    );
  }

  const fallbackWindows =
    windows ?? desktopContentWindows(entry?.screenKind);

  return (
    <RemoteDesktopViewport
      aspectRatioClass={aspectRatioClass}
      className={className}
      expanded={expanded}
      onExpand={onExpand}
      showDock={showDock}
      wallpaperUrl={`/wallpapers/cloud-agents-${Math.max(1, (content.agents.findIndex((candidate) => candidate.agent.id === agent.id) % 4) + 1)}.webp`}
      wallpaperUrlDark={`/wallpapers/cloud-agents-${Math.max(1, ((content.agents.findIndex((candidate) => candidate.agent.id === agent.id) + 2) % 4) + 1)}.webp`}
      windows={fallbackWindows}
    />
  );
}

export default ComputerSurface;
