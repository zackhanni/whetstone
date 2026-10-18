"use client";

import { useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackTests,
  SANDPACK_THEMES,
  type SandpackFile,
} from "@codesandbox/sandpack-react";
import clsx from "clsx";
import type { ChallengeBundle } from "@/lib/content";
import { RUNNER_DEPENDENCIES } from "@/learning/sandbox";
import { WhetstoneButton } from "./whetstone-button";

// Sandpack's dark theme with a lighter comment colour: its #757575 on #151515 is 3.96:1, under
// the 4.5:1 WCAG AA minimum for small text; #8a8a8a is 5.3:1.
const RUNNER_THEME = {
  ...SANDPACK_THEMES.dark,
  syntax: { ...SANDPACK_THEMES.dark.syntax, comment: { color: "#8a8a8a", fontStyle: "italic" as const } },
};

export function ChallengeRunner({ bundle }: { bundle: ChallengeBundle }) {
  const { meta, files, solution } = bundle;
  const entryPath = `/${meta.entry}`;
  const [tab, setTab] = useState<"preview" | "tests">("preview");
  const [showSolution, setShowSolution] = useState(false);

  // Map the challenge files into Sandpack's virtual FS. The entry is editable + active;
  // App.tsx is the (hidden) preview root; everything else is visible but read-only.
  // Memoized, like `customSetup` below: Sandpack resets its whole file state (dropping the
  // learner's edits) whenever either prop is a new object, and this component re-renders on
  // every tab click and, in drill mode, every second.
  const sandpackFiles = useMemo(() => {
    const out: Record<string, SandpackFile> = {};
    for (const [name, code] of Object.entries(files)) {
      const path = `/${name}`;
      if (name === meta.entry) {
        out[path] = { code: showSolution && solution ? solution : code, active: true };
      } else {
        out[path] = { code, readOnly: true, hidden: name === "App.tsx" };
      }
    }
    return out;
  }, [files, meta.entry, showSolution, solution]);
  const customSetup = useMemo(
    () => ({
      dependencies: {
        ...RUNNER_DEPENDENCIES,
        // A challenge may declare its own packages (e.g. TanStack Query) in meta.json.
        ...meta.dependencies,
      },
    }),
    [meta.dependencies],
  );
  const options = useMemo(() => ({ activeFile: entryPath }), [entryPath]);

  const tabBtn = (id: "preview" | "tests", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={clsx(
        "rounded-md px-2.5 py-1 text-sm",
        tab === id ? "bg-sky-700 text-white" : "text-slate-400 hover:text-slate-200",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
        {tabBtn("preview", "Preview")}
        {tabBtn("tests", "Run tests")}
        {solution && (
          <WhetstoneButton
            tone="neutral"
            variant="outline"
            size="xs"
            className="ml-auto"
            onClick={() => setShowSolution((s) => !s)}
          >
            {showSolution ? "Reset to starter" : "Show solution"}
          </WhetstoneButton>
        )}
      </div>
      <SandpackProvider
        // Remount on toggle: a fresh provider loads the starter or solution, drops the learner's
        // edits and restarts the bundler clients, so the tests panel never shows the other
        // version's results (the "Show solution" step in scripts/check-challenges-browser.ts
        // relies on this).
        key={showSolution ? "solution" : "starter"}
        template="react-ts"
        theme={RUNNER_THEME}
        files={sandpackFiles}
        options={options}
        customSetup={customSetup}
      >
        <SandpackLayout>
          <SandpackCodeEditor showLineNumbers showTabs style={{ height: 460 }} />
          {/* Both panels stay mounted and the tab only hides one. Each panel registers its
              bundler client when it mounts; one that mounts after Sandpack has started gets a
              client the provider never wires up, so swapping panels left "Run tests" empty. */}
          <SandpackPreview style={{ height: 460, display: tab === "preview" ? undefined : "none" }} />
          <SandpackTests style={{ height: 460, display: tab === "tests" ? undefined : "none" }} />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
