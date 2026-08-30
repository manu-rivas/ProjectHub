import { Noto_Color_Emoji, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const emoji = Noto_Color_Emoji({
  variable: "--font-emoji",
  subsets: ["emoji"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "ProjectHub",
  description: "A local studio board for the projects you start, park, and forget.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${emoji.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
