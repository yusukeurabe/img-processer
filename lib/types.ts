export type Mode = "resize" | "crop";

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
};

export type SourceImage = {
  file: File;
  url: string;
  bitmap: ImageBitmap;
  naturalWidth: number;
  naturalHeight: number;
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
