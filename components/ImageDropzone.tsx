"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  onFiles: (files: File[]) => void;
};

export function ImageDropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const images = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (images.length === 0) {
        alert("画像ファイルを選択してください");
        return;
      }
      onFiles(images);
    },
    [onFiles],
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
        クリックして画像を選択 または ドラッグ&ドロップ（複数可）
      </p>
      <p className="text-sm text-neutral-500 mt-2">
        JPEG / PNG / WebP などの画像ファイル
      </p>
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
