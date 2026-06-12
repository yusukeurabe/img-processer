export type Lang = "en" | "ja";

export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "lang";

const en = {
  meta: {
    title: "Image Crop & Compress",
    description:
      "Resize, crop, and compress images entirely in your browser — nothing is uploaded.",
  },
  app: {
    title: "Image Crop & Compress",
    tagline: "Runs entirely in your browser. Your images are never uploaded.",
    clearAll: "Clear all",
    loadFailed: (names: string) => `Could not load: ${names}`,
    preview: "Preview",
    processing: (current: number, total: number) =>
      `Processing… (${current}/${total})`,
    processAll: (count: number) => `Process all (${count} images)`,
    processOne: "Process image",
    cropHint:
      "Drag on the image to select an area. Each image keeps its own selection when you switch thumbnails.",
    compressHint:
      "Keeps the pixel dimensions and reduces the file size via output format and quality.",
    processFailed: "Processing failed",
  },
  dropzone: {
    onlyImages: "Please select image files",
    title: "Click to choose images, or drag & drop (multiple allowed)",
    subtitle: "Image files such as JPEG / PNG / WebP",
  },
  thumbnails: {
    remove: (name: string) => `Remove ${name}`,
    add: "Add images",
  },
  modes: {
    resize: { label: "Resize", description: "Scale to exact dimensions" },
    crop: { label: "Crop", description: "Cut out a selected area" },
    compress: { label: "Compress", description: "Reduce file size only" },
  },
  resize: {
    originalSize: (w: number, h: number) => `Original size: ${w} × ${h} px`,
    width: "Width (px)",
    height: "Height (px)",
    locked: "Aspect ratio locked",
    unlocked: "Free",
    presets: "Presets",
  },
  crop: {
    target: "Image to crop",
    aspectRatio: "Aspect ratio",
    free: "Free",
    hintFree: "Drag the corners or edges to resize the selection freely.",
    hintFixed:
      "Drag the corners or edges to resize while keeping the aspect ratio.",
  },
  output: {
    format: "Output format",
    quality: "Quality",
    qualityDisabledNote: "(not used for PNG — lossless)",
    smallerFile: "Smaller file",
    betterQuality: "Better quality",
  },
  targetSize: {
    label: "Target file size (optional)",
    placeholder: "e.g. 500",
    unit: "KB or less",
    noteDisabled: "Not available for PNG (lossless). Choose JPEG or WebP.",
    note: "Quality is adjusted automatically to stay under the target. Leave blank to use the quality slider.",
  },
  results: {
    title: "Results",
    download: "Download",
    zipAll: "Download all as ZIP",
    zipping: "Creating ZIP…",
    zipFailed: "Failed to create the ZIP. Try again with fewer images.",
    missedTarget: "Could not reach the target size",
  },
};

export type Dict = typeof en;

const ja: Dict = {
  meta: {
    title: "画像トリミング・圧縮",
    description:
      "ブラウザだけで画像のリサイズ・切り抜き・圧縮ができるツール",
  },
  app: {
    title: "画像トリミング・圧縮",
    tagline: "ブラウザだけで動きます。画像はサーバーに送信されません。",
    clearAll: "すべてクリア",
    loadFailed: (names) => `読み込めなかったファイル: ${names}`,
    preview: "プレビュー",
    processing: (current, total) => `処理中… (${current}/${total})`,
    processAll: (count) => `すべて処理する（${count}枚）`,
    processOne: "画像を処理する",
    cropHint:
      "左の画像をドラッグして範囲を指定してください。サムネイルで画像を切り替えると、それぞれの範囲が保存されます。",
    compressHint:
      "サイズ（ピクセル数）はそのまま、出力形式と品質でファイル容量を軽くします。",
    processFailed: "処理に失敗しました",
  },
  dropzone: {
    onlyImages: "画像ファイルを選択してください",
    title: "クリックして画像を選択 または ドラッグ&ドロップ（複数可）",
    subtitle: "JPEG / PNG / WebP などの画像ファイル",
  },
  thumbnails: {
    remove: (name) => `${name} を削除`,
    add: "画像を追加",
  },
  modes: {
    resize: { label: "リサイズ", description: "縦横ピクセル数に縮小/拡大" },
    crop: { label: "切り抜き", description: "範囲を指定して切り抜き" },
    compress: { label: "圧縮のみ", description: "サイズはそのまま軽量化" },
  },
  resize: {
    originalSize: (w, h) => `元のサイズ: ${w} × ${h} px`,
    width: "幅 (px)",
    height: "高さ (px)",
    locked: "アスペクト比固定中",
    unlocked: "自由",
    presets: "プリセット",
  },
  crop: {
    target: "切り抜き対象",
    aspectRatio: "アスペクト比",
    free: "自由",
    hintFree: "枠の角・辺をドラッグして自由にサイズ変更できます。",
    hintFixed:
      "枠の角・辺をドラッグするとアスペクト比を保ったままサイズ変更できます。",
  },
  output: {
    format: "出力形式",
    quality: "品質",
    qualityDisabledNote: "（PNGは可逆圧縮のため無効）",
    smallerFile: "圧縮優先",
    betterQuality: "画質優先",
  },
  targetSize: {
    label: "目標ファイルサイズ（任意）",
    placeholder: "例: 500",
    unit: "KB 以下",
    noteDisabled:
      "PNGは可逆圧縮のため目標サイズ指定は使えません。JPEG/WebPを選択してください。",
    note: "指定すると品質を自動調整して目標以下に収めます。空欄なら品質スライダーの値を使います。",
  },
  results: {
    title: "処理結果",
    download: "ダウンロード",
    zipAll: "ZIPでまとめてダウンロード",
    zipping: "ZIP作成中…",
    zipFailed: "ZIPの作成に失敗しました。枚数を減らして再度お試しください。",
    missedTarget: "目標サイズに届きませんでした",
  },
};

export const dictionaries: Record<Lang, Dict> = { en, ja };
