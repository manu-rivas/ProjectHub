export const WIKI_HOME = ["README.md", "PRODUCT.md", "AGENTS.md"] as const;

export function wikiSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return slug.slice(0, 80) || "section";
}

export function wikiTitle(name: string, excerpt = ""): string {
  const heading = excerpt.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return name.replace(/\.md$/i, "");
}

export function wikiToc(markdown: string): { id: string; text: string; level: number }[] {
  const rows: { id: string; text: string; level: number }[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/[*_`]/g, "").trim();
    rows.push({ id: wikiSlug(text), text, level: match[1].length });
  }
  return rows;
}

export function expandWikiLinks(markdown: string): string {
  return markdown.replace(
    /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g,
    (_all, page: string, hash?: string, label?: string) => {
      const name = page.trim();
      const file = name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
      const href = hash?.trim() ? `${file}#${hash.trim()}` : file;
      return `[${(label || name).trim()}](${href})`;
    },
  );
}

export function sortWikiPages<T extends { name: string }>(pages: T[]): T[] {
  return pages.slice().sort((a, b) => {
    const ai = WIKI_HOME.findIndex((name) => name.toLowerCase() === a.name.toLowerCase());
    const bi = WIKI_HOME.findIndex((name) => name.toLowerCase() === b.name.toLowerCase());
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function matchWikiPage<T extends { name: string }>(pages: T[], name: string): T | undefined {
  const needle = name.trim().toLowerCase();
  return pages.find((page) => page.name.toLowerCase() === needle);
}

export function wikiFileFromHref(href: string | undefined): { file: string; hash: string } | null {
  if (!href) return null;
  if (/^(https?:|mailto:|data:)/i.test(href)) return null;
  if (href.startsWith("#")) return { file: "", hash: href.slice(1) };
  const withoutQuery = href.split("?")[0];
  const [pathPart, hash = ""] = withoutQuery.split("#");
  const clean = pathPart.replace(/^\.\//, "").replace(/^\//, "");
  if (clean.includes("/")) return null;
  if (/\.md$/i.test(clean)) return { file: clean, hash };
  if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(clean)) return { file: `${clean}.md`, hash };
  return null;
}

export function isWikiFileName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/i.test(name.trim());
}
