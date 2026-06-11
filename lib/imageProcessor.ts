import {
  FORMAT_EXTENSION,
  type OutputFormat,
  type ProcessOptions,
  type ProcessResult,
  type SourceImage,
} from "./types";

export async function loadImage(file: File): Promise<SourceImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const url = URL.createObjectURL(file);
  return {
    file,
    url,
    bitmap,
    naturalWidth: bitmap.width,
    naturalHeight: bitmap.height,
  };
}

export function disposeSource(source: SourceImage | null): void {
  if (!source) return;
  URL.revokeObjectURL(source.url);
  source.bitmap.close();
}

export async function processImage(
  source: SourceImage,
  opts: ProcessOptions,
): Promise<ProcessResult> {
  const { bitmap } = source;

  let sx = 0;
  let sy = 0;
  let sWidth = bitmap.width;
  let sHeight = bitmap.height;
  let dWidth: number;
  let dHeight: number;

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

  const targetBytes =
    opts.output.targetSizeKB != null &&
    opts.output.targetSizeKB > 0 &&
    opts.output.format !== "image/png"
      ? opts.output.targetSizeKB * 1024
      : null;

  if (targetBytes !== null) {
    const { blob, metTargetSize } = await renderToTargetSize(
      bitmap, sx, sy, sWidth, sHeight, dWidth, dHeight,
      opts.output.format, targetBytes,
    );
    return { blob, width: dWidth, height: dHeight, metTargetSize };
  }

  const blob = await renderToBlob(
    bitmap,
    sx,
    sy,
    sWidth,
    sHeight,
    dWidth,
    dHeight,
    opts.output.format,
    opts.output.quality,
  );

  return { blob, width: dWidth, height: dHeight };
}

async function renderToBlob(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  format: string,
  quality: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(dw, dh);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
    return canvas.convertToBlob({ type: format, quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      format,
      quality,
    );
  });
}

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
    // ブラウザが指定形式でエンコードできない場合（例: SafariのWebP→PNGフォールバック）、
    // 品質が結果に影響しないため探索を打ち切る
    if (blob.type !== format) {
      return { blob, metTargetSize: blob.size <= targetBytes };
    }
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
