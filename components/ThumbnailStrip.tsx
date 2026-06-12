"use client";

import { useRef } from "react";
import type { ImageItem } from "@/lib/types";

// 一部環境ではMIMEタイプが空になるため、拡張子でも判定する（ImageDropzoneと同じ基準）
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?|svg)$/i;

type Props = {
  items: ImageItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
};

export function ThumbnailStrip({
  items,
  selectedId,
  onSelect,
  onRemove,
  onAddFiles,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <div key={item.id} className="relative shrink-0">
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.source.file.name}
              className={[
                "block h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors",
                active
                  ? "border-indigo-500"
                  : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-600",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.source.url}
                alt={item.source.file.name}
                className="h-full w-full object-cover"
              />
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`${item.source.file.name} を削除`}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-neutral-700 text-white text-xs leading-none hover:bg-red-600"
            >
              ×
            </button>
            {item.status !== "idle" && (
              <span
                className={[
                  "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full text-[10px] leading-4 text-center text-white",
                  item.status === "done"
                    ? "bg-emerald-500"
                    : item.status === "error"
                      ? "bg-red-500"
                      : "bg-indigo-500 animate-pulse",
                ].join(" ")}
              >
                {item.status === "done" ? "✓" : item.status === "error" ? "!" : "…"}
              </span>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="画像を追加"
        className="shrink-0 h-16 w-16 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:border-indigo-400 hover:text-indigo-500 text-2xl"
      >
        ＋
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter(
            (f) => f.type.startsWith("image/") || IMAGE_EXTS.test(f.name),
          );
          if (files.length > 0) onAddFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
