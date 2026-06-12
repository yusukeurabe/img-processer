"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ModeTabs } from "@/components/ModeTabs";
import { ResizeControls } from "@/components/ResizeControls";
import { CropControls } from "@/components/CropControls";
import { OutputControls } from "@/components/OutputControls";
import { ResultPanel } from "@/components/ResultPanel";
import {
  disposeSource,
  loadImage,
  processImage,
} from "@/lib/imageProcessor";
import type {
  CropArea,
  Mode,
  OutputFormat,
  ProcessResult,
  SourceImage,
} from "@/lib/types";

export default function Home() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [mode, setMode] = useState<Mode>("resize");
  const [resize, setResize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(0.82);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => disposeSource(source);
    // intentionally only run on unmount of the current source
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    try {
      const next = await loadImage(file);
      setSource((prev) => {
        disposeSource(prev);
        return next;
      });
      setResize({ width: next.naturalWidth, height: next.naturalHeight });
      setCropArea({
        x: 0,
        y: 0,
        width: next.naturalWidth,
        height: next.naturalHeight,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の読み込みに失敗しました");
    }
  }, []);

  const handleReset = useCallback(() => {
    setSource((prev) => {
      disposeSource(prev);
      return null;
    });
    setResult(null);
    setError(null);
  }, []);

  const canProcess = useMemo(() => {
    if (!source) return false;
    if (mode === "resize") return resize.width > 0 && resize.height > 0;
    if (mode === "crop") return cropArea !== null && cropArea.width > 0 && cropArea.height > 0;
    return false;
  }, [source, mode, resize, cropArea]);

  const handleProcess = useCallback(async () => {
    if (!source || !canProcess) return;
    setBusy(true);
    setError(null);
    try {
      const next = await processImage(source, {
        mode,
        resize: mode === "resize" ? resize : undefined,
        crop: mode === "crop" ? cropArea ?? undefined : undefined,
        output: { format, quality },
      });
      setResult(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [source, canProcess, mode, resize, cropArea, format, quality]);

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
        {source && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            別の画像を選ぶ
          </button>
        )}
      </header>

      {!source ? (
        <ImageDropzone onFiles={(files) => handleFile(files[0])} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <section className="space-y-4">
            {mode === "crop" ? (
              <CropControls
                imageUrl={source.url}
                naturalWidth={source.naturalWidth}
                naturalHeight={source.naturalHeight}
                onCropChange={setCropArea}
              />
            ) : (
              <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.url}
                  alt="プレビュー"
                  className="max-h-[60vh] w-auto object-contain rounded-lg"
                />
              </div>
            )}
            {result && (
              <ResultPanel
                originalFile={source.file}
                resultBlob={result.blob}
                resultWidth={result.width}
                resultHeight={result.height}
                format={format}
              />
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-5 bg-white dark:bg-neutral-950">
              <ModeTabs mode={mode} onChange={setMode} />
              {mode === "resize" ? (
                <ResizeControls
                  naturalWidth={source.naturalWidth}
                  naturalHeight={source.naturalHeight}
                  width={resize.width}
                  height={resize.height}
                  onChange={setResize}
                />
              ) : (
                <p className="text-xs text-neutral-500">
                  左の画像をドラッグして範囲を指定してください。
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-950">
              <OutputControls
                format={format}
                quality={quality}
                onFormatChange={setFormat}
                onQualityChange={setQuality}
              />
            </div>

            <button
              type="button"
              onClick={handleProcess}
              disabled={!canProcess || busy}
              className={[
                "w-full rounded-xl py-3 text-sm font-semibold transition-colors",
                canProcess && !busy
                  ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed",
              ].join(" ")}
            >
              {busy ? "処理中…" : "画像を処理する"}
            </button>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
