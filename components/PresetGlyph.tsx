import { isPresetIcon } from "@/lib/preset-icons";
import type { ReactNode } from "react";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden fill="none">
      {children}
    </svg>
  );
}

function glyph(icon: string) {
  switch (icon) {
    case "🚀":
      return (
        <Svg>
          <path d="M12 3c3.2 2.4 5 6.2 5 10.2 0 2.4-1.2 4.6-3.2 6.1L12 21l-1.8-1.7C8.2 17.8 7 15.6 7 13.2 7 9.2 8.8 5.4 12 3Z" fill="#c4782a" />
          <circle cx="12" cy="11" r="2" fill="#fffdf6" />
          <path d="M9 17.5c-.8 1.4-2.2 2.3-3.8 2.5.6-1.6 1.6-2.9 3-3.6M15 17.5c.8 1.4 2.2 2.3 3.8 2.5-.6-1.6-1.6-2.9-3-3.6" stroke="#9c4a3c" strokeWidth="1.4" strokeLinecap="round" />
        </Svg>
      );
    case "💡":
      return (
        <Svg>
          <path d="M12 3.5a6 6 0 0 1 3.6 10.8V16.5h-7.2v-2.2A6 6 0 0 1 12 3.5Z" fill="#e2b13c" />
          <path d="M9.6 17.4h4.8M10.2 19.4h3.6" stroke="#8a6a18" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case "🧪":
      return (
        <Svg>
          <path d="M9 3.5h6M10.2 3.5v5.2L6.4 19.2a2 2 0 0 0 1.8 2.8h7.6a2 2 0 0 0 1.8-2.8l-3.8-10.5V3.5" stroke="#3d6b4f" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.2 14.5h7.6" stroke="#3d6b4f" strokeWidth="1.4" />
          <path d="M7.4 16.2c1.6.8 3 .5 4.6-.4 1.7-.9 3.2-.7 4.7.2v2.4a2 2 0 0 1-1.8 2.8H9.2a2 2 0 0 1-1.8-2.8v-2.2Z" fill="#7eb89a" />
        </Svg>
      );
    case "📦":
      return (
        <Svg>
          <path d="M4.5 8.2 12 4.5l7.5 3.7v8.6L12 20.5 4.5 16.8V8.2Z" fill="#c4782a" />
          <path d="M12 4.5v16M4.5 8.2 12 12l7.5-3.8" stroke="#fffdf6" strokeWidth="1.4" />
        </Svg>
      );
    case "🤖":
      return (
        <Svg>
          <rect x="5" y="7.5" width="14" height="11" rx="3" fill="#5c5348" />
          <circle cx="9.2" cy="12.4" r="1.5" fill="#f0d3a8" />
          <circle cx="14.8" cy="12.4" r="1.5" fill="#f0d3a8" />
          <path d="M12 4.5v3M8.5 16.6h7" stroke="#2a241c" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case "🌐":
      return (
        <Svg>
          <circle cx="12" cy="12" r="8" stroke="#3d6a8a" strokeWidth="1.6" />
          <ellipse cx="12" cy="12" rx="3.4" ry="8" stroke="#3d6a8a" strokeWidth="1.4" />
          <path d="M4.4 12h15.2M6.2 8.2h11.6M6.2 15.8h11.6" stroke="#3d6a8a" strokeWidth="1.3" />
        </Svg>
      );
    case "📚":
      return (
        <Svg>
          <path d="M5 6.2h5.2v12.2H5.8A.8.8 0 0 1 5 17.6V6.2Z" fill="#9c4a3c" />
          <path d="M10.4 5.4h5.4v13H11.2a.8.8 0 0 1-.8-.8V5.4Z" fill="#3d6b4f" />
          <path d="M15.8 7.2 19 6.2v11.4l-3.2 1V7.2Z" fill="#c4782a" />
        </Svg>
      );
    case "🛠️":
      return (
        <Svg>
          <path d="M14.6 4.8a3.6 3.6 0 0 0-4.4 4.4L6.4 13a2.3 2.3 0 1 0 3.2 3.2l3.8-3.8a3.6 3.6 0 0 0 4.4-4.4l-2.4 2.4-2.2-2.2 2.4-2.4Z" fill="#6b5340" />
          <path d="m8.2 15.2 2.4 2.4" stroke="#fffdf6" strokeWidth="1.3" strokeLinecap="round" />
        </Svg>
      );
    case "⭐":
      return (
        <Svg>
          <path d="M12 3.4 14.4 9l6.1.6-4.6 4.1 1.4 6-5.3-3.1-5.3 3.1 1.4-6L3.5 9.6 9.6 9 12 3.4Z" fill="#c4782a" />
        </Svg>
      );
    case "🔥":
      return (
        <Svg>
          <path d="M12 3.2s1.8 3 1.2 5.4c2.4-1 4.6 1.4 4.6 4.2A6 6 0 0 1 6.2 12c0-3.4 2.8-5.4 5.8-8.8Z" fill="#c4782a" />
          <path d="M12 11.2c.6 1.2.5 2.2 0 3.2-1.6-.4-2.6.6-2.6 2 0 1.6 1.4 2.8 3 2.8a4 4 0 0 0 4-4.2c0-1.8-1.4-3-3.4-3.8Z" fill="#e8c36a" />
        </Svg>
      );
    case "🧠":
      return (
        <Svg>
          <path d="M9.2 6.2a3.2 3.2 0 0 1 5.6 0 3.1 3.1 0 0 1 3 4.6 3.2 3.2 0 0 1-1.6 5.4c-.4 1.4-1.6 2.4-3.2 2.6h-2.4c-1.6-.2-2.8-1.2-3.2-2.6A3.2 3.2 0 0 1 5.8 10.8a3.1 3.1 0 0 1 3.4-4.6Z" fill="#6b3d62" />
          <path d="M12 6.4v12.2M8.4 10.5c1 .4 1.8.3 2.6-.2M13.2 13.4c.9.4 1.8.4 2.7 0" stroke="#ead7e4" strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
      );
    case "🎯":
      return (
        <Svg>
          <circle cx="12" cy="12" r="8" stroke="#9c4a3c" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="5" stroke="#9c4a3c" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.1" fill="#9c4a3c" />
        </Svg>
      );
    case "📝":
      return (
        <Svg>
          <path d="M7 4.5h8.2L17.5 7v12.5H7V4.5Z" fill="#fffdf6" stroke="#5c5348" strokeWidth="1.4" />
          <path d="M15.2 4.6v2.8h2.6M9 11h6.2M9 14.2h6.2M9 17.2h4" stroke="#5c5348" strokeWidth="1.3" strokeLinecap="round" />
        </Svg>
      );
    case "🧩":
      return (
        <Svg>
          <path d="M8 5.5h3.2a2 2 0 1 1 1.6 0H16a1.5 1.5 0 0 1 1.5 1.5v3.2a2 2 0 1 1 0 1.6V16A1.5 1.5 0 0 1 16 17.5h-3.2a2 2 0 1 0-1.6 0H8A1.5 1.5 0 0 1 6.5 16v-3.2a2 2 0 1 0 0-1.6V7A1.5 1.5 0 0 1 8 5.5Z" fill="#3d6a8a" />
        </Svg>
      );
    case "🔒":
      return (
        <Svg>
          <path d="M8.2 11V8.4a3.8 3.8 0 0 1 7.6 0V11" stroke="#2a241c" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="6.2" y="10.8" width="11.6" height="8.4" rx="2" fill="#c4782a" />
          <circle cx="12" cy="14.6" r="1.2" fill="#fffdf6" />
          <path d="M12 15.6v2" stroke="#fffdf6" strokeWidth="1.4" strokeLinecap="round" />
        </Svg>
      );
    case "🎨":
      return (
        <Svg>
          <path d="M12 4a8 8 0 1 0 0 16c1.4 0 1.6-1.2.6-2-.8-.6-.6-1.6.4-2 2.4-1 5-1.6 5-4A8 8 0 0 0 12 4Z" fill="#eadfc8" stroke="#5c5348" strokeWidth="1.3" />
          <circle cx="9" cy="9.2" r="1.15" fill="#9c4a3c" />
          <circle cx="13.4" cy="8.4" r="1.15" fill="#3d6a8a" />
          <circle cx="8.2" cy="13" r="1.15" fill="#3d6b4f" />
          <circle cx="12.2" cy="12.6" r="1.15" fill="#c4782a" />
        </Svg>
      );
    default:
      return null;
  }
}

export function PresetGlyph({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const drawn = glyph(icon);
  if (drawn) {
    return (
      <span className={className} aria-hidden>
        {drawn}
      </span>
    );
  }
  return (
    <span className={`project-mark-emoji ${className || ""}`} aria-hidden>
      {icon}
    </span>
  );
}

export function hasDrawnGlyph(icon: string | null | undefined): boolean {
  return isPresetIcon(icon);
}
