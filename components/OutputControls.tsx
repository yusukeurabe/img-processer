"use client";

import { useI18n } from "@/components/LanguageProvider";
import { FORMAT_LABEL, type OutputFormat } from "@/lib/types";

type Props = {
  format: OutputFormat;
  quality: number;
  onFormatChange: (f: OutputFormat) => void;
  onQualityChange: (q: number) => void;
};

const FORMATS: OutputFormat[] = ["image/jpeg", "image/png", "image/webp"];

export function OutputControls({
  format,
  quality,
  onFormatChange,
  onQualityChange,
}: Props) {
  const { t } = useI18n();
  const qualityDisabled = format === "image/png";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-neutral-500 mb-2">{t.output.format}</div>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => {
            const active = format === f;
            return (
              <button
                type="button"
                key={f}
                onClick={() => onFormatChange(f)}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700",
                ].join(" ")}
              >
                {FORMAT_LABEL[f]}
              </button>
            );
          })}
        </div>
      </div>
      <div className={qualityDisabled ? "opacity-40 pointer-events-none" : ""}>
        <label className="block">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">
              {t.output.quality}{" "}
              {qualityDisabled ? t.output.qualityDisabledNote : ""}
            </span>
            <span className="text-xs text-neutral-700 dark:text-neutral-300 tabular-nums">
              {Math.round(quality * 100)}
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.01}
            value={quality}
            onChange={(e) => onQualityChange(Number(e.target.value))}
            disabled={qualityDisabled}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
            <span>{t.output.smallerFile}</span>
            <span>{t.output.betterQuality}</span>
          </div>
        </label>
      </div>
    </div>
  );
}
