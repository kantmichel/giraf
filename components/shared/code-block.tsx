"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  useEffect(() => {
    if (!codeString) return;
    codeToHtml(codeString, {
      lang: language || "text",
      themes: {
        light: "one-light",
        dark: "one-dark-pro",
      },
      defaultColor: false,
    })
      .then(setHtml)
      .catch(() => setHtml(null));
  }, [codeString, language]);

  function handleCopy() {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-4 max-w-full overflow-hidden not-prose">
      {language && (
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted px-4 py-1.5">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            {language}
          </span>
        </div>
      )}
      <div className="relative">
        {html ? (
          <div
            className={`overflow-x-auto ${language ? "rounded-b-lg rounded-t-none" : "rounded-lg"} border border-border text-sm [&_pre]:!m-0 [&_pre]:!p-4 [&_pre]:!rounded-none [&_pre]:!border-0`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre
            className={`overflow-x-auto ${language ? "rounded-b-lg rounded-t-none" : "rounded-lg"} border border-border bg-[#0d1117] p-4`}
          >
            <code className={`text-sm text-gray-100 ${className || ""}`}>
              {codeString}
            </code>
          </pre>
        )}
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md border border-gray-600 bg-gray-800 p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-gray-700 group-hover:opacity-100"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
