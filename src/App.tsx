import { useEffect, useState } from "react";
import { DemoPage } from "./demo/DemoPage";
import { ExtensibilityPage } from "./demo/ExtensibilityPage";

type DemoEntry = "replica" | "extensibility";

function entryFromHash(): DemoEntry {
  return window.location.hash === "#extensibility"
    ? "extensibility"
    : "replica";
}

export default function App() {
  const [entry, setEntry] = useState<DemoEntry>(entryFromHash);

  useEffect(() => {
    const sync = () => setEntry(entryFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <div className="bb-demo-root">
      <nav aria-label="Demo entry" className="bb-demo-nav">
        <a
          aria-current={entry === "replica" ? "page" : undefined}
          className="bb-demo-nav__item"
          href="#replica"
        >
          Replica
        </a>
        <a
          aria-current={entry === "extensibility" ? "page" : undefined}
          className="bb-demo-nav__item"
          href="#extensibility"
        >
          Extensibility Lab
        </a>
      </nav>

      {entry === "extensibility" ? <ExtensibilityPage /> : <DemoPage />}
    </div>
  );
}