"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";

type Props = {
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
  onChange: (next: { width: number; height: number }) => void;
};

export function ResizeControls({
  naturalWidth,
  naturalHeight,
  width,
  height,
  onChange,
}: Props) {
  const { t } = useI18n();
  const [locked, setLocked] = useState(true);
  const aspect = naturalWidth / naturalHeight;

  useEffect(() => {
    if (!width || !height) {
      onChange({ width: naturalWidth, height: naturalHeight });
    }
  }, [naturalWidth, naturalHeight, width, height, onChange]);

  const updateWidth = (w: number) => {
    if (locked) onChange({ width: w, height: Math.round(w / aspect) });
    else onChange({ width: w, height });
  };
  const updateHeight = (h: number) => {
    if (locked) onChange({ width: Math.round(h * aspect), height: h });
    else onChange({ width, height: h });
  };

  const presetScale = (ratio: number) => {
    onChange({
      width: Math.max(1, Math.round(naturalWidth * ratio)),
      height: Math.max(1, Math.round(naturalHeight * ratio)),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-neutral-500 mb-2">
          {t.resize.originalSize(naturalWidth, naturalHeight)}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <label className="block">
            <span className="text-xs text-neutral-500">{t.resize.width}</span>
            <input
              type="number"
              min={1}
              max={20000}
              value={width || ""}
              onChange={(e) => updateWidth(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => setLocked(!locked)}
            title={locked ? t.resize.locked : t.resize.unlocked}
            className={[
              "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
              locked
                ? "bg-indigo-500 text-white"
                : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500",
            ].join(" ")}
          >
            {locked ? "🔒" : "🔓"}
          </button>
          <label className="block">
            <span className="text-xs text-neutral-500">{t.resize.height}</span>
            <input
              type="number"
              min={1}
              max={20000}
              value={height || ""}
              onChange={(e) => updateHeight(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>
      <div>
        <div className="text-xs text-neutral-500 mb-2">{t.resize.presets}</div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "25%", ratio: 0.25 },
            { label: "50%", ratio: 0.5 },
            { label: "75%", ratio: 0.75 },
            { label: "100%", ratio: 1 },
          ].map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={() => presetScale(p.ratio)}
              className="rounded-lg px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
