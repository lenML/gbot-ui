import { useSyncExternalStore } from "react";
import type { BabyGrokBotTheme } from "./types";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => onStoreChange();

  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  media.addEventListener("change", handleMediaChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", handleMediaChange);
  };
}

function getSnapshot() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  return (
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function useResolvedBabyGrokBotTheme(
  theme: BabyGrokBotTheme,
): Exclude<BabyGrokBotTheme, "auto"> {
  const systemDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (theme === "auto") {
    return systemDark ? "cursor-dark" : "cursor-light";
  }

  return theme;
}
