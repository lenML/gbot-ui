import { memo } from "react";
import type { CardBadgeProps } from "../lib/types";

export const CardBadge = memo(function CardBadge({
  label,
  tone,
  spinner = false,
}: CardBadgeProps) {
  return (
    <span className="baby-grok-bot-card-badge" data-tone={tone}>
      {spinner ? (
        <span aria-hidden="true" className="baby-grok-bot-spinner size-3">
          <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
            <circle
              cx="6"
              cy="6"
              opacity="0.28"
              r="4.5"
              stroke="currentColor"
            />
            <path
              d="M6 1.5A4.5 4.5 0 0 1 10.5 6"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="baby-grok-bot-card-badge__dot"
        />
      )}
      {label}
    </span>
  );
});

CardBadge.displayName = "CardBadge";