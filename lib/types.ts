export type CardColor = "amber" | "moss" | "clay" | "sky" | "plum" | "ink";

export const CARD_COLORS: { id: CardColor; label: string; swatch: string }[] = [
  { id: "amber", label: "Ámbar", swatch: "#c4782a" },
  { id: "moss", label: "Musgo", swatch: "#3d6b4f" },
  { id: "clay", label: "Arcilla", swatch: "#9c4a3c" },
  { id: "sky", label: "Cielo", swatch: "#3d6a8a" },
  { id: "plum", label: "Ciruela", swatch: "#6b3d62" },
  { id: "ink", label: "Tinta", swatch: "#2a241c" },
];

export type PublishedState = "unset" | "yes" | "no";

export type Column = {
  id: string;
  title: string;
  order: number;
};

export type IdeaCard = {
  id: string;
  columnId: string;
  title: string;
  order: number;
};

export type IdeasBoard = {
  columns: Column[];
  cards: IdeaCard[];
};

export type Project = {
  id: string;
  path: string;
  name: string;
  columnId: string;
  published: PublishedState;
  notes: string;
  hidden: boolean;
  tags: string[];
  color: CardColor | null;
  missing: boolean;
  order: number;
  updatedAt: string;
  scannedAt: string | null;
  isGit: boolean;
  remoteUrl: string | null;
  docs: string[];
  mtime: string | null;
  publishedHint: boolean;
  manual: boolean;
  trashed: boolean;
  trashedAt: string | null;
  ideas: IdeasBoard;
};

export type CatalogSource = "scan" | "github" | "manual";

export type CatalogEntry = {
  id: string;
  name: string;
  path: string;
  remoteUrl: string | null;
  notes: string;
  source: CatalogSource;
  boardId: string | null;
  missing: boolean;
  trashed: boolean;
  updatedAt: string;
};

export type Settings = {
  scanRoots: string[];
  depth: number;
  ignore: string[];
  trashPath: string;
  cloneRoot: string;
  githubToken: string;
};

export type PublicSettings = {
  scanRoots: string[];
  depth: number;
  ignore: string[];
  trashPath: string;
  cloneRoot: string;
  githubTokenSet: boolean;
};

export type Store = {
  version: 1;
  settings: Settings;
  columns: Column[];
  projects: Project[];
  catalog: CatalogEntry[];
};

export type BoardPayload = {
  settings: PublicSettings;
  columns: Column[];
  projects: Project[];
};

export type DocPreview = {
  name: string;
  exists: boolean;
  excerpt: string;
};

export const TRASH_CONFIRM_PHRASE = "MOVER A PAPELERA";
