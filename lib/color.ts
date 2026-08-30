import { CARD_COLORS, type CardColor } from "./types";

const PRESETS = new Set<string>(CARD_COLORS.map((item) => item.id));

export function isPresetColor(value: string | null | undefined): value is CardColor {
  return Boolean(value && PRESETS.has(value));
}

export function isHexColor(value: string | null | undefined): value is string {
  return Boolean(value && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value));
}

export function normalizeColor(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (isPresetColor(trimmed)) return trimmed;
  if (isHexColor(trimmed)) return trimmed.toLowerCase();
  return null;
}

export function cardTintClass(color: string | null | undefined): string {
  return isPresetColor(color) ? `index-card-tint-${color}` : "";
}

export function cardTintStyle(color: string | null | undefined): { "--card-stripe": string; background: string } | undefined {
  if (!isHexColor(color)) return undefined;
  return {
    "--card-stripe": color,
    background: `color-mix(in srgb, ${color} 20%, var(--card))`,
  };
}
