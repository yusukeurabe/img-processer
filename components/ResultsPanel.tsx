"use client";

import { useEffect, useState } from "react";
import { formatBytes, outputFileName } from "@/lib/imageProcessor";
import { buildZip, downloadBlob, uniqueNames } from "@/lib/zip";
import type { ImageItem, OutputFormat } from "@/lib/types";

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
          {item.error ?? "処理に失敗しました"}
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
            目標サイズに届きませんでした
          </div>
        )}
      </div>
      <a
        href={previewUrl}
        download={downloadName}
        className="shrink-0 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-2 transition-colors"
      >
        ダウンロード
      </a>
    </div>
  );
}

export function ResultsPanel({ items, format }: Props) {
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const shown = items.filter(
    (i) => i.status === "done" || i.status === "error",
  );
  const done = shown.filter((i) => i.result !== null);
  const names = uniqueNames(
    done.map((i) => outputFileName(i.source.file.name, format)),
  );
  const nameById = new Map<string, string>();
  done.forEach((item, idx) => nameById.set(item.id, names[idx]));

  if (shown.length === 0) return null;

  const handleZip = async () => {
    setZipping(true);
    setZipError(null);
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
      setZipError("ZIPの作成に失敗しました。枚数を減らして再度お試しください。");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-950">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">処理結果</h3>
        {done.length >= 2 && (
          <button
            type="button"
            onClick={handleZip}
            disabled={zipping}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            {zipping ? "ZIP作成中…" : "ZIPでまとめてダウンロード"}
          </button>
        )}
      </div>
      {zipError && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-2">{zipError}</p>
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
