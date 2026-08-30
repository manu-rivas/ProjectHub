"use client";

import { SetupWizard } from "@/components/SetupWizard";
import type { PublicSettings } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FALLBACK: PublicSettings = {
  scanRoots: [],
  depth: 2,
  ignore: [],
  trashPath: "",
  cloneRoot: "",
  githubTokenSet: false,
  storage: "json",
  setupComplete: false,
  usePortless: false,
  supabaseConfigured: false,
};

export default function SetupPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/setup")
      .then((response) => response.json())
      .then((data: { settings?: PublicSettings }) => {
        if (!cancelled) setSettings(data.settings || FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setSettings(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--ink-soft)]">
        Checking this machine…
      </div>
    );
  }

  return (
    <SetupWizard
      settings={settings}
      onDone={() => router.push("/")}
    />
  );
}
