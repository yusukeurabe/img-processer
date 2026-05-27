# img-processer

画像加工サービス。ブラウザだけで動く、画像のリサイズ・切り抜き・圧縮ツールです。画像はサーバーに送信されません。

## 機能

- **リサイズ**: 縦横ピクセル数を指定して縮小/拡大。アスペクト比ロックとプリセット (25/50/75/100%) 付き
- **切り抜き**: ドラッグハンドルで自由に範囲指定。アスペクト比プリセット (自由 / 1:1 / 4:3 / 3:4 / 16:9 / 9:16)
- **出力形式**: JPEG / PNG / WebP の3形式、品質スライダーで圧縮率を調整
- **完全クライアントサイド**: 画像はアップロードされず、ブラウザ内の Canvas / OffscreenCanvas で処理

## 技術スタック

- Next.js 16 (App Router, 静的エクスポート)
- React 19 + TypeScript
- Tailwind CSS v4
- [react-image-crop](https://www.npmjs.com/package/react-image-crop)

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
