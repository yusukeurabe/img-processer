"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { formatBytes, outputFileName } from "@/lib/imageProcessor";
import { buildZip, downloadBlob, uniqueNames } from "@/lib/zip";
import { FORMAT_EXTENSION, type ImageItem, type OutputFormat } from "@/lib/types";

// 実際にエンコードされた形式から拡張子を決める。Safari の WebP→PNG フォールバックや、
// 処理後に出力形式を切り替えた場合でも中身と拡張子が一致するようにする
function actualFormat(item: ImageItem, fallback: OutputFormat): OutputFormat {
  const type = item.result?.blob.type;
  return type && type in FORMAT_EXTENSION ? (type as OutputFormat) : fallback;
}

type Props = {
  items: ImageItem[];
  format: OutputFormat;
};

function ResultRow({
  item,
  downloadName,
}: {
  item: ImageItem;
  downloadName: string;
}) {
  const { t } = useI18n();
  const result = item.result;
  // StrictMode の mount→cleanup→remount でも失効しないよう、URLは effect 内で生成する
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!result) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  if (item.status === "error") {
    return (
      <div className="py-3 text-sm min-w-0">
        <div className="truncate">{item.source.file.name}</div>
        <div className="text-red-600 dark:text-red-400 text-xs mt-0.5">
          {item.error ?? t.app.processFailed}
        </div>
      </div>
    );
  }
  if (!result || !previewUrl) return null;

  const reduction = 1 - result.blob.size / item.source.file.size;

  return (
    <div className="flex items-center gap-3 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={downloadName}
        className="h-12 w-12 rounded-lg object-cover shrink-0"
      />
      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate">{downloadName}</div>
        <div className="text-xs text-neutral-500 tabular-nums mt-0.5">
          {result.width} × {result.height} px ・{" "}
          {formatBytes(item.source.file.size)} →{" "}
          {formatBytes(result.blob.size)}（
          <span className={reduction > 0 ? "text-emerald-600" : "text-amber-600"}>
            {reduction > 0 ? "-" : "+"}
            {Math.abs(reduction * 100).toFixed(1)}%
          </span>
          ）
        </div>
        {result.metTargetSize === false && (
          <div className="text-xs text-amber-600 mt-0.5">
            {t.results.missedTarget}
          </div>
        )}
      </div>
      <a
        href={previewUrl}
        download={downloadName}
        className="shrink-0 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-2 transition-colors"
      >
        {t.results.download}
      </a>
    </div>
  );
}

export function ResultsPanel({ items, format }: Props) {
  const { t } = useI18n();
  const [zipping, setZipping] = useState(false);
  const [zipFailed, setZipFailed] = useState(false);

  const shown = items.filter(
    (i) => i.status === "done" || i.status === "error",
  );
  const done = shown.filter((i) => i.result !== null);
  const names = uniqueNames(
    done.map((i) => outputFileName(i.source.file.name, actualFormat(i, format))),
  );
  const nameById = new Map<string, string>();
  done.forEach((item, idx) => nameById.set(item.id, names[idx]));

  if (shown.length === 0) return null;

  const handleZip = async () => {
    setZipping(true);
    setZipFailed(false);
    try {
      const blob = await buildZip(
        done.flatMap((item) =>
          item.result
            ? [{ name: nameById.get(item.id) ?? "image", blob: item.result.blob }]
            : [],
        ),
      );
      downloadBlob(blob, "images_processed.zip");
    } catch {
      setZipFailed(true);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-950">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{t.results.title}</h3>
        {done.length >= 2 && (
          <button
            type="button"
            onClick={handleZip}
            disabled={zipping}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            {zipping ? t.results.zipping : t.results.zipAll}
          </button>
        )}
      </div>
      {zipFailed && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">
          {t.results.zipFailed}
        </p>
      )}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
        {shown.map((item) => (
          <ResultRow
            key={item.id}
            item={item}
            downloadName={nameById.get(item.id) ?? ""}
          />
        ))}
      </div>
    </div>
  );
}
