"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";

type Props = {
  onFiles: (files: File[]) => void;
};

// 一部環境のドラッグ&ドロップではMIMEタイプが空になるため、拡張子でも判定する
const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?|svg)$/i;

export function ImageDropzone({ onFiles }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const images = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || IMAGE_EXTS.test(f.name),
      );
      if (images.length === 0) {
        alert(t.dropzone.onlyImages);
        return;
      }
      onFiles(images);
    },
    [onFiles, t],
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={[
        "flex flex-col items-center justify-center cursor-pointer",
        "border-2 border-dashed rounded-2xl py-20 px-8 transition-colors",
        isDragging
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
          : "border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 hover:bg-neutral-50 dark:hover:bg-neutral-900/40",
      ].join(" ")}
    >
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-neutral-400 mb-4"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">
        {t.dropzone.title}
      </p>
      <p className="text-sm text-neutral-500 mt-2">{t.dropzone.subtitle}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
