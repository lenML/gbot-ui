import type {
  AgentLastEntry,
  GrokBotSystemEvent,
  MultipleChoiceAnswer,
  MultipleChoiceOption,
} from "./types";

export interface FormattedSystemEvent {
  lead: string;
  target: string;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatAgentTime(timestampMs?: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs == null || timestampMs <= 0) {
    return "";
  }

  const date = new Date(timestampMs);
  const now = new Date();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDelta <= 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta < 7) return date.toLocaleDateString([], { weekday: "short" });
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "numeric", day: "numeric" });
  }
  return date.toLocaleDateString([], {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

export function formatChoiceAnswer(
  answer: MultipleChoiceAnswer,
  options: readonly MultipleChoiceOption[],
): string {
  if (answer == null) return "";
  if (answer.kind === "custom") return answer.value;

  return answer.optionIds
    .map((optionId) => options.find((option) => option.id === optionId)?.label ?? optionId)
    .join(", ");
}

export function formatLastEntryPreview(entry?: AgentLastEntry | null): string {
  return entry?.text ?? "";
}

export function formatSystemEvent(event: GrokBotSystemEvent): FormattedSystemEvent {
  switch (event.type) {
    case "messaged-agents": {
      const targets = event.targets;
      return {
        lead: "Messaged",
        target:
          targets.length === 1 ? targets[0]?.name ?? "an agent" : `${targets.length} agents`,
      };
    }
    case "renamed":
      return { lead: "Renamed to", target: event.name };
    case "created-routine":
      return { lead: "Created routine", target: event.name };
    case "memory-updated":
      return { lead: `Updated memory for`, target: event.agent.name };
    case "shared-context":
      return { lead: `${event.source.name} shared`, target: event.summary };
    case "received-context": {
      const names = event.sources.map((source) => source.name);
      const target =
        names.length < 2
          ? names[0] ?? ""
          : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
      return { lead: "Messages from", target };
    }
  }
}

export function formatTranscriptTimestamp(timestampMs?: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs == null || timestampMs <= 0) {
    return "";
  }

  const date = new Date(timestampMs);
  const now = new Date();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (dayDelta <= 0) return time;
  if (dayDelta === 1) return `Yesterday ${time}`;
  if (dayDelta < 7) {
    return `${date.toLocaleDateString([], { weekday: "long" })} ${time}`;
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}