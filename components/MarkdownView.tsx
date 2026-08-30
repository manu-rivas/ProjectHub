"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import { wikiFileFromHref, wikiSlug } from "@/lib/wiki";

type Props = {
  markdown: string;
  projectId: string;
  onWikiLink?: (file: string, hash?: string) => void;
};

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function Heading({
  as: Tag,
  children,
}: {
  as: "h1" | "h2" | "h3" | "h4";
  children?: ReactNode;
}) {
  const id = wikiSlug(textOf(children));
  return <Tag id={id}>{children}</Tag>;
}

function assetUrl(projectId: string, src: string | undefined): string | undefined {
  if (!src) return src;
  if (/^(https?:|data:|mailto:|#)/i.test(src)) return src;
  const clean = src.replace(/^\.\//, "");
  return `/api/projects/${projectId}/asset?path=${encodeURIComponent(clean)}`;
}

export function MarkdownView({ markdown, projectId, onWikiLink }: Props) {
  return (
    <div className="md-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: ({ children }) => <Heading as="h1">{children}</Heading>,
          h2: ({ children }) => <Heading as="h2">{children}</Heading>,
          h3: ({ children }) => <Heading as="h3">{children}</Heading>,
          h4: ({ children }) => <Heading as="h4">{children}</Heading>,
          a: ({ href, children }) => {
            const wiki = wikiFileFromHref(href);
            if (onWikiLink && wiki) {
              return (
                <a
                  href={wiki.file ? `#wiki/${wiki.file}${wiki.hash ? `/${wiki.hash}` : ""}` : `#${wiki.hash}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onWikiLink(wiki.file, wiki.hash || undefined);
                  }}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(projectId, typeof src === "string" ? src : undefined)} alt={alt || ""} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
