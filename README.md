# img-processer

画像加工サービス。ブラウザだけで動く、画像のリサイズ・切り抜き・圧縮ツールです。画像はサーバーに送信されません。

## 機能

- **複数枚同時アップロード**: 複数の画像を一括で入稿し、サムネイルで切り替えながら画像ごとに設定。まとめて処理して ZIP 一括ダウンロード（個別ダウンロードも可）
- **リサイズ**: 縦横ピクセル数を指定して縮小/拡大。アスペクト比ロックとプリセット (25/50/75/100%) 付き。複数枚では画像ごとに指定可能
- **切り抜き**: ドラッグハンドルで自由に範囲指定。アスペクト比プリセット (自由 / 1:1 / 4:3 / 3:4 / 16:9 / 9:16)。複数枚では画像ごとに範囲を保持
- **圧縮のみ**: サイズ（ピクセル数）はそのまま容量だけ軽量化。目標ファイルサイズ（KB）を指定すると品質を自動調整（JPEG/WebP）
- **出力形式**: JPEG / PNG / WebP の3形式、品質スライダーで圧縮率を調整
- **完全クライアントサイド**: 画像はアップロードされず、ブラウザ内の Canvas / OffscreenCanvas で処理（ZIP 生成もブラウザ内）

## 技術スタック

- Next.js 16 (App Router, 静的エクスポート)
- React 19 + TypeScript
- Tailwind CSS v4
- [react-image-crop](https://www.npmjs.com/package/react-image-crop)
- [fflate](https://www.npmjs.com/package/fflate)（ZIP 生成）

## 開発

```bash
pnpm install
pnpm dev
```

http://localhost:3000 を開く。

## ビルド

```bash
pnpm build
```

`out/` ディレクトリに静的ファイルが生成され、Vercel / Cloudflare Pages / Netlify などにそのままデプロイできます。
