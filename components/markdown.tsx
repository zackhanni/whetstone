"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 leading-relaxed text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="text-xl font-semibold text-slate-100" {...p} />,
          h2: (p) => <h2 className="mt-4 text-lg font-semibold text-slate-100" {...p} />,
          h3: (p) => <h3 className="mt-3 font-semibold text-slate-100" {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
          blockquote: (p) => (
            <blockquote className="border-l-2 border-sky-500 pl-3 italic text-slate-300" {...p} />
          ),
          // A new tab, like InlineMarkdown's links: following a link from a reading or an
          // explanation shouldn't throw away the answers in progress on this page.
          a: (p) => <a className="text-sky-400 underline" target="_blank" rel="noreferrer" {...p} />,
          pre: (p) => (
            <pre
              className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-200 ring-1 ring-slate-800"
              {...p}
            />
          ),
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className ?? "");
            return isBlock ? (
              <code className="font-mono text-[0.85em]" {...rest}>
                {children}
              </code>
            ) : (
              <code
                className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.85em] text-sky-300"
                {...rest}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
