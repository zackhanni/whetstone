"use client";

import ReactMarkdown from "react-markdown";

/**
 * Markdown for one-line content fields — quiz prompts and options, fill-blank prompts,
 * predict-output questions. Authors write `inline code` and **emphasis** in them, which plain
 * text would show as literal backticks and asterisks. Only inline elements render (paragraph
 * wrappers are unwrapped), so the result can sit inside a <p>, <label> or <span>.
 */
const INLINE_ELEMENTS = ["code", "em", "strong", "del", "a"];

export function InlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={INLINE_ELEMENTS}
      unwrapDisallowed
      components={{
        code: ({ children: code }) => (
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.85em] text-sky-300">{code}</code>
        ),
        a: (p) => <a className="text-sky-400 underline" target="_blank" rel="noreferrer" {...p} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
