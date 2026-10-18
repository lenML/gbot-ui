import { useEffect, useRef, useState } from "react";
import {
  useGrokBotActions,
  useGrokBotIntegrations,
  useGrokBotStore,
} from "../../lib/grok-bot/store";
import type {
  GrokBotAsrCapability,
  GrokBotAsrPhase,
} from "../../lib/grok-bot/types";
import { GrokBotIcon } from "./AgentAvatar";
import "../../styles/iteration-mobile.css";

const DEMO_PARTIAL_DELAY_MS = 520;
const DEMO_FINAL_DELAY_MS = 1_760;
const DEMO_PARTIAL = "Schedule a follow-up for tomorrow morning";
const DEMO_FINAL =
  "Schedule a follow-up for tomorrow morning and include the launch notes.";
const DEFAULT_DEMO_ASR_CAPABILITY: GrokBotAsrCapability = {
  supported: true,
  partialResults: true,
  finalResults: true,
  permission: "granted",
};

const WAVE_BARS = [7, 11, 15, 9, 13, 6];

const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Voice transcription failed. Try again.";
}

function unsupportedReason(capability: GrokBotAsrCapability): string {
  if (!capability.supported) {
    return "Speech recognition is unavailable.";
  }
  if (capability.permission === "denied") {
    return "Microphone permission denied.";
  }
  return "";
}

function isActivePhase(phase: GrokBotAsrPhase): boolean {
  return (
    phase === "requesting-permission" ||
    phase === "recording" ||
    phase === "processing"
  );
}

export interface AsrButtonProps {
  className?: string;
  onCancel?: () => void;
  onTranscript?: (text: string) => void;
}

export function AsrButton({
  className,
  onCancel,
  onTranscript,
}: AsrButtonProps) {
  const state = useGrokBotStore();
  const actions = useGrokBotActions();
  const { asr: adapter } = useGrokBotIntegrations();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef(0);
  const generationRef = useRef(0);
  const capabilityGenerationRef = useRef(0);
  const partialTimerRef = useRef<number | null>(null);
  const finalTimerRef = useRef<number | null>(null);
  const processingTimerRef = useRef<number | null>(null);
  const interimRef = useRef("");
  const ownsSessionRef = useRef(false);
  const adapterPhaseSeenRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const onTranscriptRef = useRef(onTranscript);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    onCancelRef.current = onCancel;
    onTranscriptRef.current = onTranscript;
  }, [onCancel, onTranscript]);

  const clearTimers = () => {
    if (partialTimerRef.current !== null)
      window.clearTimeout(partialTimerRef.current);
    if (finalTimerRef.current !== null)
      window.clearTimeout(finalTimerRef.current);
    if (processingTimerRef.current !== null)
      window.clearTimeout(processingTimerRef.current);
    partialTimerRef.current = null;
    finalTimerRef.current = null;
    processingTimerRef.current = null;
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const generation = ++capabilityGenerationRef.current;
    let cancelled = false;

    const applyCapability = (capability: GrokBotAsrCapability) => {
      if (cancelled || generation !== capabilityGenerationRef.current) return;
      actions.setAsrCapability(capability);
    };
    const failCapability = (reason: unknown) => {
      if (cancelled || generation !== capabilityGenerationRef.current) return;
      actions.setAsrError(describeError(reason));
    };

    if (!adapter?.getCapability) {
      applyCapability(DEFAULT_DEMO_ASR_CAPABILITY);
      return () => {
        cancelled = true;
      };
    }

    try {
      Promise.resolve(adapter.getCapability()).then(
        applyCapability,
        failCapability,
      );
    } catch (reason) {
      failCapability(reason);
    }

    return () => {
      cancelled = true;
    };
  }, [actions, adapter]);

  useEffect(() => {
    if (state.asr.phase !== "recording") return;
    if (startedAtRef.current === 0) startedAtRef.current = Date.now();
    const updateElapsed = () => {
      setElapsedMs(Date.now() - startedAtRef.current);
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 120);
    return () => window.clearInterval(timer);
  }, [state.asr.phase]);

  const finish = (text: string, generation: number) => {
    if (generation !== generationRef.current) return;
    generationRef.current += 1;
    clearTimers();
    ownsSessionRef.current = false;
    adapterPhaseSeenRef.current = false;
    startedAtRef.current = 0;
    setElapsedMs(0);

    const transcript = text.trim();
    if (!transcript) {
      actions.setAsrError("No speech was detected. Try again.");
      return;
    }

    actions.commitAsrTranscript(transcript);
    onTranscriptRef.current?.(transcript);
  };

  const fail = (reason: unknown, generation: number) => {
    if (generation !== generationRef.current) return;
    generationRef.current += 1;
    clearTimers();
    ownsSessionRef.current = false;
    adapterPhaseSeenRef.current = false;
    startedAtRef.current = 0;
    setElapsedMs(0);
    interimRef.current = "";
    actions.setAsrError(describeError(reason));

    if (adapter) {
      try {
        Promise.resolve(adapter.stop()).catch(() => undefined);
      } catch {
        // Error cleanup still clears local and store state.
      }
    }
  };

  const cancel = () => {
    generationRef.current += 1;
    clearTimers();
    ownsSessionRef.current = false;
    adapterPhaseSeenRef.current = false;
    startedAtRef.current = 0;
    setElapsedMs(0);
    interimRef.current = "";

    if (adapter) {
      try {
        Promise.resolve(adapter.stop()).catch(() => undefined);
      } catch {
        // Cancellation still clears local and store state.
      }
    }

    actions.stopAsr();
    onCancelRef.current?.();
  };

  const start = () => {
    if (
      state.asr.phase === "unsupported" ||
      !state.asr.isSupported ||
      !state.asr.capability.supported
    ) {
      return;
    }

    clearTimers();
    const generation = ++generationRef.current;
    ownsSessionRef.current = true;
    adapterPhaseSeenRef.current = false;
    interimRef.current = "";
    startedAtRef.current = 0;
    setElapsedMs(0);
    actions.startAsr();

    if (adapter) {
      try {
        const startResult = adapter.start({
          agentId:
            state.agents.find((agent) => agent.id === state.activeAgentId)
              ?.botId ?? state.activeAgentId,
          onPhase: (phase) => {
            if (generation !== generationRef.current) return;
            adapterPhaseSeenRef.current = true;
            startedAtRef.current = phase === "recording" ? Date.now() : 0;
            actions.setAsrPhase(phase);
          },
          onError: (reason) => fail(reason, generation),
          onFinal: (text) => finish(text, generation),
          onPartial: (text) => {
            if (generation !== generationRef.current) return;
            interimRef.current = text;
            actions.setAsrPartial(text);
          },
        });
        Promise.resolve(startResult).then(
          () => {
            if (generation !== generationRef.current) return;
            if (adapterPhaseSeenRef.current) return;
            startedAtRef.current = Date.now();
            actions.setAsrPhase("recording");
          },
          (reason) => fail(reason, generation),
        );
      } catch (reason) {
        fail(reason, generation);
      }
      return;
    }

    startedAtRef.current = Date.now();
    actions.setAsrPhase("recording");
    partialTimerRef.current = window.setTimeout(() => {
      if (generation !== generationRef.current) return;
      interimRef.current = DEMO_PARTIAL;
      actions.setAsrPartial(DEMO_PARTIAL);
    }, DEMO_PARTIAL_DELAY_MS);
    finalTimerRef.current = window.setTimeout(() => {
      finish(DEMO_FINAL, generation);
    }, DEMO_FINAL_DELAY_MS);
  };

  const stop = () => {
    if (state.asr.phase !== "recording") return;
    const generation = generationRef.current;
    startedAtRef.current = 0;
    actions.setAsrPhase("processing");

    if (!adapter) {
      finish(interimRef.current || DEMO_FINAL, generation);
      return;
    }

    processingTimerRef.current = window.setTimeout(() => {
      fail(new Error("Transcription timed out. Try again."), generation);
    }, 12_000);
    try {
      Promise.resolve(adapter.stop()).catch((reason) =>
        fail(reason, generation),
      );
    } catch (reason) {
      fail(reason, generation);
    }
  };

  const handleClick = () => {
    if (state.asr.phase === "recording") {
      stop();
      return;
    }
    if (isActivePhase(state.asr.phase)) {
      cancel();
      return;
    }
    start();
  };

  useEffect(() => {
    if (!isActivePhase(state.asr.phase)) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!rootRef.current || rootRef.current.getClientRects().length === 0)
        return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.asr.phase]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      clearTimers();
      const ownsSession = ownsSessionRef.current;
      ownsSessionRef.current = false;
      adapterPhaseSeenRef.current = false;
      startedAtRef.current = 0;
      if (ownsSession && adapter) {
        try {
          void adapter.stop();
        } catch {
          // Adapter teardown must not prevent store cleanup.
        }
      }
      actions.stopAsr();
    },
    [actions, adapter],
  );

  const phase = state.asr.phase;
  const reason =
    state.asr.error ||
    (phase === "unsupported"
      ? unsupportedReason(state.asr.capability)
      : state.asr.capability.permission === "denied"
        ? unsupportedReason(state.asr.capability)
        : "");
  const disabled = phase === "unsupported";
  const ariaLabel =
    phase === "processing"
      ? "Cancel transcription"
      : phase === "requesting-permission"
        ? "Cancel microphone permission request"
        : phase === "recording"
          ? "Stop voice recording"
          : phase === "unsupported"
            ? "Voice input unavailable"
            : "Voice message";

  return (
    <div
      className={cn("baby-grok-bot-asr", className)}
      data-phase={phase}
      ref={rootRef}
    >
      {phase !== "idle" ? (
        <div
          aria-live="polite"
          className="baby-grok-bot-asr__status"
          role="status"
        >
          {phase === "error" ? (
            <span>
              {state.asr.error || "Voice transcription failed. Try again."}
            </span>
          ) : phase === "unsupported" ? (
            <span>{unsupportedReason(state.asr.capability)}</span>
          ) : phase === "requesting-permission" ? (
            <>
              <span aria-hidden="true" className="baby-grok-bot-asr__spinner" />
              <span>Requesting microphone permission...</span>
            </>
          ) : phase === "processing" ? (
            <>
              <span aria-hidden="true" className="baby-grok-bot-asr__spinner" />
              <span>Transcribing...</span>
            </>
          ) : (
            <>
              <span className="baby-grok-bot-asr__timer">
                {formatElapsed(elapsedMs)}
              </span>
              <span aria-hidden="true" className="baby-grok-bot-asr__wave">
                {WAVE_BARS.map((height, index) => (
                  <span
                    key={index}
                    style={{
                      animationDelay: `${index * 80}ms`,
                      height,
                    }}
                  />
                ))}
              </span>
              <span className="baby-grok-bot-asr__partial">
                {state.asr.interimTranscript || "Listening..."}
              </span>
            </>
          )}
        </div>
      ) : null}

      <button
        aria-label={ariaLabel}
        className="baby-grok-bot-asr__button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--grok-bot-current-agent-accent)]"
        disabled={disabled}
        onClick={handleClick}
        title={reason || undefined}
        type="button"
      >
        {phase === "processing" ? (
          <span aria-hidden="true" className="baby-grok-bot-asr__spinner" />
        ) : phase === "recording" ? (
          <span aria-hidden="true" className="baby-grok-bot-asr__stop" />
        ) : phase === "requesting-permission" ? (
          <GrokBotIcon name="close" size={14} />
        ) : (
          <GrokBotIcon name="mic" size={14} />
        )}
      </button>
    </div>
  );
}

export default AsrButton;
