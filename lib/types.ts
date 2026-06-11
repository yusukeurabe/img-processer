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
