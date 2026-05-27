import type { ProcessOptions, ProcessResult, SourceImage } from "./types";

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
  } else {
    if (!opts.resize) throw new Error("resize options are required in resize mode");
    dWidth = Math.max(1, Math.round(opts.resize.width));
    dHeight = Math.max(1, Math.round(opts.resize.height));
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
