"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import type { CropArea } from "@/lib/types";

type Props = {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  /** 保存済みの切り抜き範囲（％）。あれば復元する */
  initialCrop?: PercentCrop | null;
  onCropChange: (area: CropArea, percentCrop: PercentCrop) => void;
};

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: "自由", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

function defaultCrop(
  aspect: number | undefined,
  naturalWidth: number,
  naturalHeight: number,
): PercentCrop {
  if (aspect === undefined) {
    return { unit: "%", x: 10, y: 10, width: 80, height: 80 };
  }
  // 表示画像はアスペクト比を維持してフィットされる前提。
  // 切り抜き枠のピクセルアスペクト = (widthPct × naturalWidth) / (heightPct × naturalHeight)
  // = (widthPct / heightPct) × (naturalWidth / naturalHeight)
  // これが指定された aspect に一致するには:
  //   widthPct / heightPct = aspect × naturalHeight / naturalWidth
  const k = (aspect * naturalHeight) / naturalWidth;
  let widthPct: number;
  let heightPct: number;
  if (k >= 1) {
    widthPct = 80;
    heightPct = widthPct / k;
  } else {
    heightPct = 80;
    widthPct = heightPct * k;
  }
  return {
    unit: "%",
    x: (100 - widthPct) / 2,
    y: (100 - heightPct) / 2,
    width: widthPct,
    height: heightPct,
  };
}

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center p-2">
        <ReactCrop
          key={aspect ?? "free"}
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          aspect={aspect}
          keepSelection
          minWidth={20}
          minHeight={20}
          className="max-h-[60vh]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="切り抜き対象"
            className="max-h-[60vh] w-auto object-contain"
          />
        </ReactCrop>
      </div>
      <div>
        <div className="text-xs text-neutral-500 mb-2">アスペクト比</div>
        <div className="flex gap-2 flex-wrap">
          {ASPECT_PRESETS.map((p) => {
            const active = aspect === p.value;
            return (
              <button
                type="button"
                key={p.label}
                onClick={() => setAspect(p.value)}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-indigo-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          {aspect === undefined
            ? "枠の角・辺をドラッグして自由にサイズ変更できます。"
            : "枠の角・辺をドラッグするとアスペクト比を保ったままサイズ変更できます。"}
        </p>
      </div>
    </div>
  );
}
