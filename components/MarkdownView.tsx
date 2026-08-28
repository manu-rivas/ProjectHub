"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  projectId: string;
};

function assetUrl(projectId: string, src: string | undefined): string | undefined {
  if (!src) return src;
  if (/^(https?:|data:|mailto:|#)/i.test(src)) return src;
  const clean = src.replace(/^\.\//, "");
  return `/api/projects/${projectId}/asset?path=${encodeURIComponent(clean)}`;
}

export function MarkdownView({ markdown, projectId }: Props) {
  return (
    <div className="md-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={assetUrl(projectId, typeof src === "string" ? src : undefined)} alt={alt || ""} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
