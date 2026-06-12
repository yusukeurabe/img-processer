# 複数枚同時アップロード＆圧縮のみモード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 画像を複数枚同時にアップロードして一括処理（リサイズ／切り抜き／圧縮のみ）し、ZIP一括＋個別ダウンロードできるようにする。

**Architecture:** 完全クライアントサイドのNext.js（App Router）アプリ。単一画像の state を `ImageItem[]`＋選択中IDに置き換え、サムネイル帯で編集対象を切り替える。リサイズ値・切り抜き範囲は画像ごとに保持、モード・出力設定は全画像共通。処理は1枚ずつ順次実行。ZIPは fflate で無圧縮生成。

**Tech Stack:** Next.js 16 (App Router, client components) / React 19 / TypeScript / Tailwind CSS 4 / react-image-crop / fflate（新規追加）

**Spec:** `docs/superpowers/specs/2026-06-11-multi-image-and-compress-mode-design.md`

**テストについて:** このプロジェクトに自動テスト基盤はなく、承認済みスペックで「開発サーバー＋Playwright での手動検証」と定めているため、TDD ではなく各タスクで `pnpm build`（型チェック込み）を検証に使い、最後に Task 12 で一括手動検証を行う。

**実装前の注意（AGENTS.md）:** この環境の Next.js はトレーニングデータと異なる可能性がある。本変更はすべて既存の `"use client"` コンポーネント内で完結し、ルーティング・データ取得には触れない。既存ファイルの書き方（`"use client"` 先頭宣言、`@/` パスエイリアス、`<img>` への eslint-disable コメント）をそのまま踏襲すること。迷ったら `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` を参照。

## File Structure

| ファイル | 操作 | 責務 |
|---|---|---|
| `package.json` | Modify | fflate 追加 |
| `lib/types.ts` | Modify | `Mode` に `"compress"` 追加、`ImageItem` 型、`targetSizeKB`、`metTargetSize` |
| `lib/imageProcessor.ts` | Modify | compress モード、目標サイズの品質二分探索、出力ファイル名生成 |
| `lib/zip.ts` | Create | ファイル名一意化・ZIP生成（無圧縮）・Blobダウンロード |
| `components/ImageDropzone.tsx` | Modify | 複数ファイル受け付け（`onFiles: (files: File[]) => void`） |
| `components/CropControls.tsx` | Modify | 初期範囲（PercentCrop）の復元、`(area, percentCrop)` 通知 |
| `components/ModeTabs.tsx` | Modify | 「圧縮のみ」タブ追加（3列） |
| `components/ThumbnailStrip.tsx` | Create | サムネイル一覧・選択・削除・追加・状態バッジ |
| `components/TargetSizeInput.tsx` | Create | 目標ファイルサイズ（KB）入力（PNG時は無効化） |
| `components/ResultsPanel.tsx` | Create | 結果一覧（行ごとの個別DL＋ZIP一括DL） |
| `components/ResultPanel.tsx` | Delete | ResultsPanel に置き換え（Task 11 で削除） |
| `components/ResizeControls.tsx` | 変更なし | props 駆動なので画像ごとに `key` 再マウントで使い回す |
| `app/page.tsx` | Modify | 複数枚 state・順次処理・ワイヤリング全面改修 |

各タスクの中間状態でもアプリは常にビルド可能・動作可能に保つ（API を変えたら同タスク内で呼び出し側も直す）。

---

### Task 1: ブランチ作成と fflate 追加

**Files:**
- Modify: `package.json`（pnpm が自動更新）

- [ ] **Step 1: 作業ブランチを作成**

```bash
git checkout -b feat/multi-image-and-compress
```

（superpowers:using-git-worktrees で worktree を作った場合はその中で実行。既にブランチ済みならスキップ）

- [ ] **Step 2: fflate を追加**

```bash
pnpm add fflate
```

Expected: `package.json` の dependencies に `"fflate"` が追加される。

- [ ] **Step 3: ビルド確認**

```bash
pnpm build
```

Expected: エラーなく完了（"Compiled successfully" を含む出力）。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: ZIP生成用に fflate を追加"
```

---

### Task 2: 型定義の拡張（lib/types.ts）

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: types.ts を以下の内容に全面更新**

既存の型はそのまま残し、`Mode` の拡張・`OutputOptions.targetSizeKB`・`ProcessResult.metTargetSize`・`ItemStatus`・`ImageItem` を追加する。ファイル全体を以下にする:

```ts
import type { PercentCrop } from "react-image-crop";

export type Mode = "resize" | "crop" | "compress";

export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeOptions = {
  width: number;
  height: number;
};

export type OutputOptions = {
  format: OutputFormat;
  quality: number;
  /** 目標ファイルサイズ（KB）。指定時は品質を自動調整して目標以下を目指す（JPEG/WebPのみ） */
  targetSizeKB?: number;
};

export type ProcessOptions = {
  mode: Mode;
  resize?: ResizeOptions;
  crop?: CropArea;
  output: OutputOptions;
};

export type ProcessResult = {
  blob: Blob;
  width: number;
  height: number;
  /** targetSizeKB 指定時のみ設定: 目標サイズ以下に収まったか */
  metTargetSize?: boolean;
};

export type SourceImage = {
  file: File;
  url: string;
  bitmap: ImageBitmap;
  naturalWidth: number;
  naturalHeight: number;
};

export type ItemStatus = "idle" | "processing" | "done" | "error";

export type ImageItem = {
  id: string;
  source: SourceImage;
  /** 画像ごとのリサイズ指定。初期値は元寸法 */
  resize: ResizeOptions;
  /** 切り抜きUI復元用。未編集なら null */
  percentCrop: PercentCrop | null;
  /** ピクセル換算の切り抜き範囲。初期値は画像全体 */
  cropArea: CropArea | null;
  status: ItemStatus;
  result: ProcessResult | null;
  error: string | null;
};

export const FORMAT_LABEL: Record<OutputFormat, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

export const FORMAT_EXTENSION: Record<OutputFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
```

- [ ] **Step 2: ビルド確認**

```bash
pnpm build
```

Expected: 成功（追加のみで既存コードは壊れない。`Mode` の追加値は既存の分岐では未使用のため影響なし）。

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: compressモード・ImageItem・目標サイズの型を追加"
```

---

### Task 3: 圧縮のみモードと目標サイズ探索（lib/imageProcessor.ts）

**Files:**
- Modify: `lib/imageProcessor.ts`

- [ ] **Step 1: processImage に compress 分岐を追加**

`processImage` 内の分岐（現在 `if (opts.mode === "crop") {...} else {...}`）を以下に変更:

```ts
  if (opts.mode === "crop") {
    if (!opts.crop) throw new Error("crop area is required in crop mode");
    sx = Math.max(0, Math.round(opts.crop.x));
    sy = Math.max(0, Math.round(opts.crop.y));
    sWidth = Math.min(bitmap.width - sx, Math.round(opts.crop.width));
    sHeight = Math.min(bitmap.height - sy, Math.round(opts.crop.height));
    dWidth = sWidth;
    dHeight = sHeight;
  } else if (opts.mode === "resize") {
    if (!opts.resize) throw new Error("resize options are required in resize mode");
    dWidth = Math.max(1, Math.round(opts.resize.width));
    dHeight = Math.max(1, Math.round(opts.resize.height));
  } else {
    // compress: 寸法は変えずに再エンコードのみ
    dWidth = bitmap.width;
    dHeight = bitmap.height;
  }
```

- [ ] **Step 2: 目標サイズ指定時の分岐を追加**

`processImage` の `const blob = await renderToBlob(...)` の直前に挿入し、return を分ける:

```ts
  const targetBytes =
    opts.output.targetSizeKB != null && opts.output.format !== "image/png"
      ? opts.output.targetSizeKB * 1024
      : null;

  if (targetBytes !== null) {
    const { blob, metTargetSize } = await renderToTargetSize(
      bitmap, sx, sy, sWidth, sHeight, dWidth, dHeight,
      opts.output.format, targetBytes,
    );
    return { blob, width: dWidth, height: dHeight, metTargetSize };
  }
```

（既存の `renderToBlob` 呼び出しと `return { blob, width: dWidth, height: dHeight };` はそのまま残す）

- [ ] **Step 3: renderToTargetSize と outputFileName を追加**

ファイル末尾（`formatBytes` の前）に追加。import 文を `import { FORMAT_EXTENSION, type OutputFormat, type ProcessOptions, type ProcessResult, type SourceImage } from "./types";` に変更する:

```ts
const TARGET_MIN_QUALITY = 0.05;
const TARGET_SEARCH_STEPS = 8;

/** 品質を二分探索し、targetBytes 以下に収まる最高品質の結果を返す */
async function renderToTargetSize(
  bitmap: ImageBitmap,
  sx: number, sy: number, sw: number, sh: number,
  dw: number, dh: number,
  format: string,
  targetBytes: number,
): Promise<{ blob: Blob; metTargetSize: boolean }> {
  let lo = TARGET_MIN_QUALITY;
  let hi = 1;
  let best: Blob | null = null;
  for (let i = 0; i < TARGET_SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2;
    const blob = await renderToBlob(bitmap, sx, sy, sw, sh, dw, dh, format, mid);
    if (blob.size <= targetBytes) {
      best = blob;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (best) return { blob: best, metTargetSize: true };
  // 探索範囲内で目標を満たせなかった場合は最低品質で再試行し、その結果を返す
  const fallback = await renderToBlob(bitmap, sx, sy, sw, sh, dw, dh, format, TARGET_MIN_QUALITY);
  return { blob: fallback, metTargetSize: fallback.size <= targetBytes };
}

/** 出力ファイル名: 元のベース名 + _processed + 出力形式の拡張子 */
export function outputFileName(originalName: string, format: OutputFormat): string {
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base}_processed.${FORMAT_EXTENSION[format]}`;
}
```

- [ ] **Step 4: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add lib/imageProcessor.ts
git commit -m "feat: 圧縮のみモードと目標ファイルサイズの品質自動調整を実装"
```

---

### Task 4: ZIP生成ユーティリティ（lib/zip.ts 新規）

**Files:**
- Create: `lib/zip.ts`

- [ ] **Step 1: lib/zip.ts を作成**

```ts
import { zipSync } from "fflate";

/** 同名のファイル名に _2, _3 … を付けて一意化する（拡張子の前に挿入） */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
    const m = name.match(/^(.*?)(\.[^.]+)?$/);
    const base = m?.[1] ?? name;
    const ext = m?.[2] ?? "";
    let n = 2;
    let candidate = `${base}_${n}${ext}`;
    while (used.has(candidate)) {
      n += 1;
      candidate = `${base}_${n}${ext}`;
    }
    used.add(candidate);
    return candidate;
  });
}

/** 処理済み画像をZIPに固める。画像は圧縮済みのため無圧縮（store）で格納する */
export async function buildZip(
  files: { name: string; blob: Blob }[],
): Promise<Blob> {
  const names = uniqueNames(files.map((f) => f.name));
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (let i = 0; i < files.length; i++) {
    entries[names[i]] = [
      new Uint8Array(await files[i].blob.arrayBuffer()),
      { level: 0 },
    ];
  }
  return new Blob([zipSync(entries)], { type: "application/zip" });
}

/** Blob をファイルとしてダウンロードさせる */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 2: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add lib/zip.ts
git commit -m "feat: ZIP生成・ファイル名一意化・ダウンロードのユーティリティを追加"
```

---

### Task 5: ImageDropzone の複数ファイル対応

**Files:**
- Modify: `components/ImageDropzone.tsx`
- Modify: `app/page.tsx`（呼び出し側の暫定アダプタ）

- [ ] **Step 1: ImageDropzone を複数対応に変更**

`components/ImageDropzone.tsx` の Props・handleFiles・案内文・input を変更:

```ts
type Props = {
  onFiles: (files: File[]) => void;
};
```

```ts
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
```

- 関数シグネチャを `export function ImageDropzone({ onFiles }: Props)` に変更
- 案内文を `クリックして画像を選択 または ドラッグ&ドロップ（複数可）` に変更
- `<input>` に `multiple` を追加:

```tsx
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
```

- [ ] **Step 2: page.tsx の呼び出しを暫定対応**

`app/page.tsx` の `<ImageDropzone onFile={handleFile} />` を以下に変更（このタスクではまだ1枚目だけ使う。Task 11 で全面改修する）:

```tsx
        <ImageDropzone onFiles={(files) => handleFile(files[0])} />
```

- [ ] **Step 3: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add components/ImageDropzone.tsx app/page.tsx
git commit -m "feat: ドロップゾーンを複数ファイル対応に変更"
```

---

### Task 6: CropControls の範囲復元対応

**Files:**
- Modify: `components/CropControls.tsx`
- Modify: `app/page.tsx`（呼び出し側の暫定アダプタ）

- [ ] **Step 1: Props と state 初期化・通知を変更**

`components/CropControls.tsx` を変更する。

import に `useRef` を追加: `import { useEffect, useRef, useState } from "react";`

Props を変更:

```ts
type Props = {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  /** 保存済みの切り抜き範囲（％）。あれば復元する */
  initialCrop?: PercentCrop | null;
  onCropChange: (area: CropArea, percentCrop: PercentCrop) => void;
};
```

コンポーネント本体の冒頭を変更（aspect 変更時のみリセットし、マウント直後に initialCrop を上書きしないよう useRef でガードする）:

```ts
export function CropControls({
  imageUrl,
  naturalWidth,
  naturalHeight,
  initialCrop,
  onCropChange,
}: Props) {
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [crop, setCrop] = useState<PercentCrop>(
    () => initialCrop ?? defaultCrop(undefined, naturalWidth, naturalHeight),
  );
  const prevAspect = useRef(aspect);

  // このコンポーネントは画像ごとに key で再マウントされる前提
  // （マウント中に naturalWidth/Height は変わらない）
  useEffect(() => {
    if (prevAspect.current === aspect) return;
    prevAspect.current = aspect;
    setCrop(defaultCrop(aspect, naturalWidth, naturalHeight));
  }, [aspect, naturalWidth, naturalHeight]);

  // 親が毎レンダーで新しい関数を渡しても通知ループにならないよう、
  // コールバックは最新参照で保持し effect の依存から外す
  const onCropChangeRef = useRef(onCropChange);
  useEffect(() => {
    onCropChangeRef.current = onCropChange;
  });

  useEffect(() => {
    onCropChangeRef.current(
      {
        x: (crop.x / 100) * naturalWidth,
        y: (crop.y / 100) * naturalHeight,
        width: (crop.width / 100) * naturalWidth,
        height: (crop.height / 100) * naturalHeight,
      },
      crop,
    );
  }, [crop, naturalWidth, naturalHeight]);
```

**重要:** 通知 effect の依存配列に `onCropChange` を入れてはならない。入れると、親がインラインアロー関数を渡したときに「effect発火→親setState→再レンダー→新しい関数→effect発火…」の無限ループになる（実測で毎秒約2.2万コミット）。上記の最新参照（ref）パターンが恒久対策。

（return 以降の JSX は変更なし）

- [ ] **Step 2: page.tsx の呼び出しを暫定対応**

`app/page.tsx` の `onCropAreaChange={setCropArea}` を以下に変更（setState 関数は安定参照なのでそのまま渡す。余分な第2引数は無視される）:

```tsx
                onCropChange={setCropArea}
```

- [ ] **Step 3: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add components/CropControls.tsx app/page.tsx
git commit -m "feat: 切り抜き範囲の保存・復元に対応"
```

---

### Task 7: ModeTabs に「圧縮のみ」タブを追加

**Files:**
- Modify: `components/ModeTabs.tsx`
- Modify: `app/page.tsx`（暫定で compress を動作させる）

- [ ] **Step 1: タブを3つに変更**

`components/ModeTabs.tsx` の `TABS` 配列とグリッド列数を変更:

```ts
const TABS: { value: Mode; label: string; description: string }[] = [
  { value: "resize", label: "リサイズ", description: "縦横ピクセル数に縮小/拡大" },
  { value: "crop", label: "切り抜き", description: "範囲を指定して切り抜き" },
  { value: "compress", label: "圧縮のみ", description: "サイズはそのまま軽量化" },
];
```

ラッパーの className を `"grid grid-cols-3 gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900"` に変更。

- [ ] **Step 2: page.tsx で compress を暫定動作させる**

`app/page.tsx` の `canProcess` に compress 分岐を追加:

```ts
  const canProcess = useMemo(() => {
    if (!source) return false;
    if (mode === "resize") return resize.width > 0 && resize.height > 0;
    if (mode === "crop") return cropArea !== null && cropArea.width > 0 && cropArea.height > 0;
    return true; // compress
  }, [source, mode, resize, cropArea]);
```

右パネルのモード別表示（`{mode === "resize" ? <ResizeControls .../> : <p>...</p>}` の箇所）を3分岐に変更:

```tsx
              {mode === "resize" ? (
                <ResizeControls
                  naturalWidth={source.naturalWidth}
                  naturalHeight={source.naturalHeight}
                  width={resize.width}
                  height={resize.height}
                  onChange={setResize}
                />
              ) : mode === "crop" ? (
                <p className="text-xs text-neutral-500">
                  左の画像をドラッグして範囲を指定してください。
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  サイズ（ピクセル数）はそのまま、出力形式と品質でファイル容量を軽くします。
                </p>
              )}
```

（`processImage` は Task 3 で compress 対応済みのため、`handleProcess` は変更不要）

- [ ] **Step 3: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add components/ModeTabs.tsx app/page.tsx
git commit -m "feat: 圧縮のみモードのタブを追加"
```

---

### Task 8: ThumbnailStrip（新規コンポーネント）

**Files:**
- Create: `components/ThumbnailStrip.tsx`

このタスクではコンポーネントを作るだけで、ワイヤリングは Task 11 で行う。

- [ ] **Step 1: components/ThumbnailStrip.tsx を作成**

```tsx
"use client";

import { useRef } from "react";
import type { ImageItem } from "@/lib/types";

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
          const files = Array.from(e.target.files ?? []).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length > 0) onAddFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

```bash
pnpm build
```

Expected: 成功（未使用コンポーネントだが型チェックは通る）。

- [ ] **Step 3: Commit**

```bash
git add components/ThumbnailStrip.tsx
git commit -m "feat: サムネイル帯コンポーネントを追加"
```

---

### Task 9: TargetSizeInput（新規コンポーネント）

**Files:**
- Create: `components/TargetSizeInput.tsx`

- [ ] **Step 1: components/TargetSizeInput.tsx を作成**

```tsx
"use client";

import type { OutputFormat } from "@/lib/types";

type Props = {
  targetSizeKB: number | null;
  format: OutputFormat;
  onChange: (kb: number | null) => void;
};

export function TargetSizeInput({ targetSizeKB, format, onChange }: Props) {
  const disabled = format === "image/png";

  return (
    <div className={disabled ? "opacity-40" : ""}>
      <label className="block">
        <div className="text-xs text-neutral-500 mb-1">
          目標ファイルサイズ（任意）
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder="例: 500"
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
          <span className="text-sm text-neutral-500">KB 以下</span>
        </div>
      </label>
      <p className="text-xs text-neutral-500 mt-1">
        {disabled
          ? "PNGは可逆圧縮のため目標サイズ指定は使えません。JPEG/WebPを選択してください。"
          : "指定すると品質を自動調整して目標以下に収めます。空欄なら品質スライダーの値を使います。"}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add components/TargetSizeInput.tsx
git commit -m "feat: 目標ファイルサイズ入力コンポーネントを追加"
```

---

### Task 10: ResultsPanel（新規コンポーネント）

**Files:**
- Create: `components/ResultsPanel.tsx`

- [ ] **Step 1: components/ResultsPanel.tsx を作成**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  const previewUrl = useMemo(
    () => (result ? URL.createObjectURL(result.blob) : null),
    [result],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    try {
      const blob = await buildZip(
        done.map((item) => ({
          name: nameById.get(item.id) ?? "image",
          // done は result !== null のフィルタ済み
          blob: item.result!.blob,
        })),
      );
      downloadBlob(blob, "images_processed.zip");
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
```

- [ ] **Step 2: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add components/ResultsPanel.tsx
git commit -m "feat: 複数枚対応の結果一覧（ZIP一括DL付き）を追加"
```

---

### Task 11: page.tsx の複数枚対応への全面改修

**Files:**
- Modify: `app/page.tsx`（全面書き換え）
- Delete: `components/ResultPanel.tsx`

- [ ] **Step 1: app/page.tsx を以下の内容に全面書き換え**

```tsx
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
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 最新の items を参照するための ref（アンマウント時の解放と順次処理で使用）
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    return () => itemsRef.current.forEach((i) => disposeSource(i.source));
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const updateItem = useCallback((id: string, patch: Partial<ImageItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const handleAddFiles = useCallback(async (files: File[]) => {
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
    if (!canProcess || busy) return;
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
    setProgress(null);
    setBusy(false);
  }, [canProcess, busy, mode, format, quality, targetSizeKB, updateItem]);

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
```

- [ ] **Step 2: 不要になった ResultPanel を削除**

```bash
git rm components/ResultPanel.tsx
```

- [ ] **Step 3: ビルド確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 4: 開発サーバーで簡易動作確認**

```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開き、複数枚アップロード→サムネイル表示→処理→結果一覧、までエラーなく動くことを目視確認したらサーバーを停止する。

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: 複数枚アップロード・順次処理・結果一覧に全面対応"
```

---

### Task 12: Playwright による手動検証と後片付け

**Files:**
- なし（検証のみ。生成物はすべて削除する）

- [ ] **Step 1: テスト画像（サイズ違い3枚）を生成**

`$TMPDIR/img-test/gen.js` を作成:

```js
const fs = require("fs");
const path = require("path");

function bmp(w, h, [r, g, b]) {
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const dataSize = rowSize * h;
  const fileSize = 54 + dataSize;
  const buf = Buffer.alloc(fileSize);
  buf.write("BM", 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(dataSize, 34);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = 54 + y * rowSize + x * 3;
      // 32px の市松模様（JPEG圧縮の効果が分かるように）
      const on = (Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0;
      buf[o] = on ? b : 255;
      buf[o + 1] = on ? g : 255;
      buf[o + 2] = on ? r : 255;
    }
  }
  return buf;
}

const dir = process.argv[2];
fs.writeFileSync(path.join(dir, "test-a.bmp"), bmp(1600, 900, [200, 60, 60]));
fs.writeFileSync(path.join(dir, "test-b.bmp"), bmp(800, 1200, [60, 160, 80]));
fs.writeFileSync(path.join(dir, "test-c.bmp"), bmp(640, 480, [70, 90, 220]));
console.log("done:", dir);
```

実行:

```bash
mkdir -p "$TMPDIR/img-test" && node "$TMPDIR/img-test/gen.js" "$TMPDIR/img-test"
ls -la "$TMPDIR/img-test"
```

Expected: `test-a.bmp`（1600×900）, `test-b.bmp`（800×1200）, `test-c.bmp`（640×480）が生成される。

- [ ] **Step 2: dev サーバーを起動**

```bash
pnpm dev
```

（バックグラウンド実行し、http://localhost:3000 が応答することを確認）

- [ ] **Step 3: Playwright MCP でスペックの検証項目を順に確認**

Playwright MCP（browser_navigate / browser_file_upload / browser_click / browser_type / browser_snapshot / browser_take_screenshot）で http://localhost:3000 を開き、スペックの「検証方法」セクションの項目を確認する:

1. 3枚を一括アップロード → サムネイル3つ表示、1枚目が選択状態
2. リサイズ: 1枚目を 800×450、2枚目を 400×600 に設定 → サムネイルを行き来して値が保持されること → 「すべて処理する（3枚）」→ 結果一覧で各画像の寸法が指定値（3枚目は元寸法 640×480）になっていること
3. 切り抜き: タブ切り替え → 1枚目と2枚目で異なる範囲をドラッグ指定 → 切り替えて範囲が復元されること → 処理して結果の寸法が範囲どおりであること
4. 圧縮のみ: 寸法が元のままで容量が減ること。目標サイズに「20」(KB) を指定して処理 → 各結果が 20KB 以下になること。PNG を選ぶと目標サイズ入力が無効化され注記が出ること
5. ZIP一括ダウンロード → ダウンロードされた zip を `unzip -l <path>` で確認し、3ファイル・`test-a_processed.jpg` 形式の名前であること
6. 2枚を×ボタンで削除して1枚にする → ZIPボタンが出ない・ボタンラベルが「画像を処理する」になること
7. 「すべてクリア」→ アップロード画面に戻ること
8. テキストファイル（例: `echo hi > "$TMPDIR/img-test/not-image.txt"`）を画像2枚と一緒に選択 → 画像だけ読み込まれること
9. 切り抜きモードで画像を表示したまま数秒待ち、再レンダリングが暴走しないこと（Task 6 レビューで検出した通知ループの回帰確認。コンソールにエラーが出ていないことも確認）

Expected: すべて確認OK。問題があれば修正してから次へ。

- [ ] **Step 4: 後片付け**

```bash
rm -rf "$TMPDIR/img-test"
```

dev サーバーを停止し、Playwright のスクリーンショット・ダウンロードした zip 等の生成物をすべて削除する（プロジェクトメモリの方針）。

- [ ] **Step 5: 最終ビルドと lint 確認**

```bash
pnpm build
```

Expected: 成功。

- [ ] **Step 6: 検証で修正が発生していれば commit**

```bash
git status
git add -A
git commit -m "fix: 手動検証で見つかった問題を修正"
```

（修正がなければスキップ）

---

## 完了後

実装完了・全タスクのチェックが付いたら **superpowers:finishing-a-development-branch** スキルを使って統合方法（マージ／PR／保留）をユーザーに確認する。**ユーザーから明示的な依頼がない限り PR は作成しない**（グローバル CLAUDE.md の方針）。
