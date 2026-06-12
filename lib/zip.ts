import { zipSync, type Zippable } from "fflate";

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
  const entries: Zippable = {};
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
