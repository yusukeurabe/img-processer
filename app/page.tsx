"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ThumbnailStrip } from "@/components/ThumbnailStrip";
import { ModeTabs } from "@/components/ModeTabs";
import { ResizeControls } from "@/components/ResizeControls";
import { CropControls } from "@/components/CropControls";
import { OutputControls } from "@/components/OutputControls";
import { TargetSizeInput } from "@/components/TargetSizeInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { disposeSource, loadImage, processImage } from "@/lib/imageProcessor";
import type { ImageItem, Mode, OutputFormat } from "@/lib/types";

export default function Home() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("resize");
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(0.82);
  const [targetSizeKB, setTargetSizeKB] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 最新の items を参照するための ref（アンマウント時の解放と順次処理で使用）
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  useEffect(() => {
    return () => itemsRef.current.forEach((i) => disposeSource(i.source));
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const updateItem = useCallback((id: string, patch: Partial<ImageItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const handleAddFiles = useCallback(async (files: File[]) => {
    if (busyRef.current) return;
    setLoadError(null);
    const loaded: ImageItem[] = [];
    const failed: string[] = [];
    for (const file of files) {
      try {
        const source = await loadImage(file);
        loaded.push({
          id: crypto.randomUUID(),
          source,
          resize: { width: source.naturalWidth, height: source.naturalHeight },
          percentCrop: null,
          cropArea: {
            x: 0,
            y: 0,
            width: source.naturalWidth,
            height: source.naturalHeight,
          },
          status: "idle",
          result: null,
          error: null,
        });
      } catch {
        failed.push(file.name);
      }
    }
    if (failed.length > 0) {
      setLoadError(`読み込めなかったファイル: ${failed.join(", ")}`);
    }
    if (loaded.length > 0) {
      setItems((prev) => [...prev, ...loaded]);
      setSelectedId((prev) => prev ?? loaded[0].id);
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    if (busyRef.current) return;
    const prev = itemsRef.current;
    const idx = prev.findIndex((i) => i.id === id);
    if (idx === -1) return;
    disposeSource(prev[idx].source);
    const next = prev.filter((i) => i.id !== id);
    setItems(next);
    setSelectedId((sel) =>
      sel === id ? (next[Math.min(idx, next.length - 1)]?.id ?? null) : sel,
    );
  }, []);

  const handleClearAll = useCallback(() => {
    if (busyRef.current) return;
    itemsRef.current.forEach((i) => disposeSource(i.source));
    setItems([]);
    setSelectedId(null);
    setLoadError(null);
    setProgress(null);
  }, []);

  const canProcess = useMemo(() => {
    if (items.length === 0) return false;
    if (mode === "resize")
      return items.every((i) => i.resize.width > 0 && i.resize.height > 0);
    if (mode === "crop")
      return items.every(
        (i) =>
          i.cropArea !== null && i.cropArea.width > 0 && i.cropArea.height > 0,
      );
    return true; // compress
  }, [items, mode]);

  const handleProcessAll = useCallback(async () => {
    if (!canProcess || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const targets = itemsRef.current;
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        status: "idle" as const,
        result: null,
        error: null,
      })),
    );
    try {
      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        setProgress({ current: i + 1, total: targets.length });
        updateItem(item.id, { status: "processing" });
        try {
          const result = await processImage(item.source, {
            mode,
            resize: mode === "resize" ? item.resize : undefined,
            crop: mode === "crop" ? (item.cropArea ?? undefined) : undefined,
            output: {
              format,
              quality,
              targetSizeKB:
                mode === "compress" &&
                format !== "image/png" &&
                targetSizeKB !== null
                  ? targetSizeKB
                  : undefined,
            },
          });
          updateItem(item.id, { status: "done", result });
        } catch (e) {
          updateItem(item.id, {
            status: "error",
            error: e instanceof Error ? e.message : "処理に失敗しました",
          });
        }
      }
    } finally {
      setProgress(null);
      setBusy(false);
      busyRef.current = false;
    }
  }, [canProcess, mode, format, quality, targetSizeKB, updateItem]);

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            画像トリミング・圧縮
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            ブラウザだけで動きます。画像はサーバーに送信されません。
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={busy}
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-50"
          >
            すべてクリア
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="space-y-4">
          <ImageDropzone onFiles={handleAddFiles} />
          {loadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              {loadError}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <section className="space-y-4">
            <ThumbnailStrip
              items={items}
              selectedId={selectedId}
              onSelect={(id) => {
                if (!busy) setSelectedId(id);
              }}
              onRemove={(id) => {
                if (!busy) handleRemove(id);
              }}
              onAddFiles={(files) => {
                if (!busy) handleAddFiles(files);
              }}
            />
            {selected && mode === "crop" ? (
              <CropControls
                key={selected.id}
                imageUrl={selected.source.url}
                naturalWidth={selected.source.naturalWidth}
                naturalHeight={selected.source.naturalHeight}
                initialCrop={selected.percentCrop}
                onCropChange={(area, percentCrop) =>
                  updateItem(selected.id, { cropArea: area, percentCrop })
                }
              />
            ) : selected ? (
              <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.source.url}
                  alt="プレビュー"
                  className="max-h-[60vh] w-auto object-contain rounded-lg"
                />
              </div>
            ) : null}
            {loadError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {loadError}
              </div>
            )}
            <ResultsPanel items={items} format={format} />
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-5 bg-white dark:bg-neutral-950">
              <ModeTabs mode={mode} onChange={setMode} />
              {mode === "resize" && selected ? (
                <ResizeControls
                  key={selected.id}
                  naturalWidth={selected.source.naturalWidth}
                  naturalHeight={selected.source.naturalHeight}
                  width={selected.resize.width}
                  height={selected.resize.height}
                  onChange={(size) => updateItem(selected.id, { resize: size })}
                />
              ) : mode === "crop" ? (
                <p className="text-xs text-neutral-500">
                  左の画像をドラッグして範囲を指定してください。サムネイルで画像を切り替えると、それぞれの範囲が保存されます。
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  サイズ（ピクセル数）はそのまま、出力形式と品質でファイル容量を軽くします。
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-950 space-y-4">
              <OutputControls
                format={format}
                quality={quality}
                onFormatChange={setFormat}
                onQualityChange={setQuality}
              />
              {mode === "compress" && (
                <TargetSizeInput
                  targetSizeKB={targetSizeKB}
                  format={format}
                  onChange={setTargetSizeKB}
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleProcessAll}
              disabled={!canProcess || busy}
              className={[
                "w-full rounded-xl py-3 text-sm font-semibold transition-colors",
                canProcess && !busy
                  ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed",
              ].join(" ")}
            >
              {busy && progress
                ? `処理中… (${progress.current}/${progress.total})`
                : items.length > 1
                  ? `すべて処理する（${items.length}枚）`
                  : "画像を処理する"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
