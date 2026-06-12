"use client";

import { useI18n } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/i18n";

const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
];

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex shrink-0 rounded-lg border border-neutral-200 dark:border-neutral-800 p-0.5 text-xs font-medium"
    >
      {LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          aria-pressed={lang === l.value}
          className={[
            "rounded-md px-2.5 py-1 transition-colors",
            lang === l.value
              ? "bg-indigo-500 text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
          ].join(" ")}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
