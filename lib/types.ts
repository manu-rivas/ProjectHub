export type CardColor = "amber" | "moss" | "clay" | "sky" | "plum" | "ink";

export const CARD_COLORS: { id: CardColor; label: string; swatch: string }[] = [
  { id: "amber", label: "Amber", swatch: "#c4782a" },
  { id: "moss", label: "Moss", swatch: "#3d6b4f" },
  { id: "clay", label: "Clay", swatch: "#9c4a3c" },
  { id: "sky", label: "Sky", swatch: "#3d6a8a" },
  { id: "plum", label: "Plum", swatch: "#6b3d62" },
  { id: "ink", label: "Ink", swatch: "#2a241c" },
];

export type PublishedState = "unset" | "yes" | "no";
export type StorageBackend = "json" | "sqlite";

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

export type ProjectAction = {
  id: string;
  label: string;
  command: string;
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
  actions: ProjectAction[];
  templateId: string | null;
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
  storage: StorageBackend;
  setupComplete: boolean;
};

export type PublicSettings = {
  scanRoots: string[];
  depth: number;
  ignore: string[];
  trashPath: string;
  cloneRoot: string;
  githubTokenSet: boolean;
  storage: StorageBackend;
  setupComplete: boolean;
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

export const DOC_FILES = ["README.md", "PRODUCT.md", "AGENTS.md"] as const;
export type DocFileName = (typeof DOC_FILES)[number];

export const TRASH_CONFIRM_PHRASE = "MOVE TO TRASH";
export const TRASH_CONFIRM_PHRASES = ["MOVE TO TRASH", "MOVER A PAPELERA"] as const;
