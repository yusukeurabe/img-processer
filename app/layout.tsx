import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "画像トリミング・圧縮",
  description: "ブラウザだけで画像のリサイズ・切り抜き・圧縮ができるツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
        {children}
      </body>
    </html>
  );
}
