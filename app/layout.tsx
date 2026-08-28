import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
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

export const metadata: Metadata = {
  title: "ProjectHub",
  description: "Tablero local de proyectos para Cursor y Codex",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
