"use client";

import { useI18n } from "@/components/LanguageProvider";
import type { Mode } from "@/lib/types";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

const TABS: Mode[] = ["resize", "crop", "compress"];

export function ModeTabs({ mode, onChange }: Props) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900">
      {TABS.map((value) => {
        const active = mode === value;
        return (
          <button
            type="button"
            key={value}
            onClick={() => onChange(value)}
            className={[
              "rounded-lg px-4 py-3 text-left transition-colors",
              active
                ? "bg-white dark:bg-neutral-800 shadow-sm"
                : "hover:bg-white/60 dark:hover:bg-neutral-800/60",
            ].join(" ")}
          >
            <div className="font-medium text-sm">{t.modes[value].label}</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              {t.modes[value].description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
