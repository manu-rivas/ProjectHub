import { CARD_COLORS, type CardColor } from "./types";

const PRESETS = new Set<string>(CARD_COLORS.map((item) => item.id));

export function isPresetColor(value: string | null | undefined): value is CardColor {
  return Boolean(value && PRESETS.has(value));
}

export function isHexColor(value: string | null | undefined): value is string {
  return Boolean(value && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value));
}

export function toHex6(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#c4782a";
}

export function normalizeColor(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  let trimmed = value.trim();
  if (isPresetColor(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{3}$/.test(trimmed) || /^[0-9a-fA-F]{6}$/.test(trimmed)) trimmed = `#${trimmed}`;
  if (isHexColor(trimmed)) return toHex6(trimmed);
  return null;
}

export function cardTintClass(color: string | null | undefined): string {
  return isPresetColor(color) ? `index-card-tint-${color}` : "";
}

export function cardTintStyle(color: string | null | undefined): {
  "--card-stripe": string;
  background: string;
  borderColor: string;
} | undefined {
  if (!isHexColor(color)) return undefined;
  const hex = toHex6(color);
  return {
    "--card-stripe": hex,
    background: `color-mix(in srgb, ${hex} 22%, var(--card))`,
    borderColor: `color-mix(in srgb, ${hex} 55%, var(--rule))`,
  };
}
