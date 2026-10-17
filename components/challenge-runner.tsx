"use client";

import { useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackTests,
} from "@codesandbox/sandpack-react";
import clsx from "clsx";
import type { ChallengeBundle } from "@/lib/content";
import { RUNNER_DEPENDENCIES } from "@/learning/sandbox";
import { WhetstoneButton } from "./whetstone-button";

type SandpackFile = { code: string; active?: boolean; readOnly?: boolean; hidden?: boolean };

export function ChallengeRunner({ bundle }: { bundle: ChallengeBundle }) {
  const { meta, files, solution } = bundle;
  const entryPath = `/${meta.entry}`;
  const [tab, setTab] = useState<"preview" | "tests">("preview");
  const [showSolution, setShowSolution] = useState(false);

  // Map the challenge files into Sandpack's virtual FS. The entry is editable + active;
  // App.tsx is the (hidden) preview root; everything else is visible but read-only.
  const sandpackFiles: Record<string, SandpackFile> = {};
  for (const [name, code] of Object.entries(files)) {
    const path = `/${name}`;
    if (name === meta.entry) {
      sandpackFiles[path] = { code: showSolution && solution ? solution : code, active: true };
    } else {
      sandpackFiles[path] = { code, readOnly: true, hidden: name === "App.tsx" };
    }
  }

  const tabBtn = (id: "preview" | "tests", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={clsx(
        "rounded-md px-2.5 py-1 text-sm",
        tab === id ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200",
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
        // Remount when toggling solution so the editor reloads with the right code.
        key={showSolution ? "solution" : "starter"}
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        options={{ activeFile: entryPath }}
        customSetup={{
          dependencies: {
            ...RUNNER_DEPENDENCIES,
            // A challenge may declare its own packages (e.g. TanStack Query) in meta.json.
            ...meta.dependencies,
          },
        }}
      >
        <SandpackLayout>
          <SandpackCodeEditor showLineNumbers showTabs style={{ height: 460 }} />
          {tab === "preview" ? (
            <SandpackPreview style={{ height: 460 }} />
          ) : (
            <SandpackTests style={{ height: 460 }} />
          )}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
