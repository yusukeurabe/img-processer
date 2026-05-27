"use client";

import { useEffect, useMemo } from "react";
import { formatBytes } from "@/lib/imageProcessor";
import { FORMAT_EXTENSION, type OutputFormat } from "@/lib/types";

type Props = {
  originalFile: File;
  resultBlob: Blob;
  resultWidth: number;
  resultHeight: number;
  format: OutputFormat;
};

export function ResultPanel({
  originalFile,
  resultBlob,
  resultWidth,
  resultHeight,
  format,
}: Props) {
  const previewUrl = useMemo(() => URL.createObjectURL(resultBlob), [resultBlob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const ratio = resultBlob.size / originalFile.size;
  const reduction = 1 - ratio;

  const downloadName = useMemo(() => {
    const base = originalFile.name.replace(/\.[^.]+$/, "");
    return `${base}_processed.${FORMAT_EXTENSION[format]}`;
  }, [originalFile.name, format]);

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 bg-white dark:bg-neutral-950">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">処理結果</h3>
        <a
          href={previewUrl}
          download={downloadName}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          ダウンロード
        </a>
      </div>
      <div className="rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="処理結果"
          className="max-h-72 w-auto object-contain"
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-neutral-500">サイズ</dt>
        <dd className="text-right tabular-nums">
          {resultWidth} × {resultHeight} px
        </dd>
        <dt className="text-neutral-500">元ファイル</dt>
        <dd className="text-right tabular-nums">{formatBytes(originalFile.size)}</dd>
        <dt className="text-neutral-500">出力ファイル</dt>
        <dd className="text-right tabular-nums font-medium">
          {formatBytes(resultBlob.size)}
        </dd>
        <dt className="text-neutral-500">削減率</dt>
        <dd
          className={[
            "text-right tabular-nums font-medium",
            reduction > 0 ? "text-emerald-600" : "text-amber-600",
          ].join(" ")}
        >
          {reduction > 0 ? "-" : "+"}
          {Math.abs(reduction * 100).toFixed(1)}%
        </dd>
      </dl>
    </div>
  );
}
