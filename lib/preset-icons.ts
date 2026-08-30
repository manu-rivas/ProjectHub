export const PRESET_ICONS = [
  "🚀",
  "💡",
  "🧪",
  "📦",
  "🤖",
  "🌐",
  "📚",
  "🛠️",
  "⭐",
  "🔥",
  "🧠",
  "🎯",
  "📝",
  "🧩",
  "🔒",
  "🎨",
] as const;

export type PresetIcon = (typeof PRESET_ICONS)[number];

export function isPresetIcon(value: string | null | undefined): value is PresetIcon {
  return Boolean(value && (PRESET_ICONS as readonly string[]).includes(value));
}
