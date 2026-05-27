"use client";

import type { Mode } from "@/lib/types";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

const TABS: { value: Mode; label: string; description: string }[] = [
  { value: "resize", label: "リサイズ", description: "縦横ピクセル数に縮小/拡大" },
  { value: "crop", label: "切り抜き", description: "範囲を指定して切り抜き" },
];

export function ModeTabs({ mode, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900">
      {TABS.map((tab) => {
        const active = mode === tab.value;
        return (
          <button
            type="button"
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={[
              "rounded-lg px-4 py-3 text-left transition-colors",
              active
                ? "bg-white dark:bg-neutral-800 shadow-sm"
                : "hover:bg-white/60 dark:hover:bg-neutral-800/60",
            ].join(" ")}
          >
            <div className="font-medium text-sm">{tab.label}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{tab.description}</div>
          </button>
        );
      })}
    </div>
  );
}
