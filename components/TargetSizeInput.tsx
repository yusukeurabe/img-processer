"use client";

import { useI18n } from "@/components/LanguageProvider";
import type { OutputFormat } from "@/lib/types";

type Props = {
  targetSizeKB: number | null;
  format: OutputFormat;
  onChange: (kb: number | null) => void;
};

export function TargetSizeInput({ targetSizeKB, format, onChange }: Props) {
  const { t } = useI18n();
  const disabled = format === "image/png";

  return (
    <div className={disabled ? "opacity-40" : ""}>
      <label className="block">
        <div className="text-xs text-neutral-500 mb-1">
          {t.targetSize.label}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder={t.targetSize.placeholder}
            value={targetSizeKB ?? ""}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                onChange(null);
                return;
              }
              const n = Number(v);
              onChange(Number.isFinite(n) && n > 0 ? n : null);
            }}
            className="w-28 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm tabular-nums"
          />
          <span className="text-sm text-neutral-500">{t.targetSize.unit}</span>
        </div>
      </label>
      <p className="text-xs text-neutral-500 mt-1">
        {disabled ? t.targetSize.noteDisabled : t.targetSize.note}
      </p>
    </div>
  );
}
