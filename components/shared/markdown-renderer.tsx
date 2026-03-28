"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { CodeBlock } from "./code-block";
import type { Components } from "react-markdown";

const components: Components = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ children, className, ...props }: any) => {
    const isInline = !className && !String(children).includes("\n");
    if (isInline) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre: ({ children }: any) => <>{children}</>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ children }: any) => (
    <div className="my-4 max-w-full overflow-x-auto">
      <table className="divide-y divide-border text-sm">
        {children}
      </table>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: ({ children }: any) => (
    <th className="bg-muted px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: ({ children }: any) => (
    <td className="border-t border-border px-4 py-2">{children}</td>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-blockquote:border-border prose-blockquote:text-muted-foreground prose-hr:border-border prose-li:marker:text-muted-foreground prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
