"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCw, Crop as CropIcon, Loader2 } from "lucide-react";

type AspectPreset = {
  id: string;
  label: string;
  value: number | undefined;
};

const ASPECTS: AspectPreset[] = [
  { id: "1x1", label: "1:1", value: 1 },
  { id: "4x3", label: "4:3", value: 4 / 3 },
  { id: "16x9", label: "16:9", value: 16 / 9 },
  { id: "3x4", label: "3:4", value: 3 / 4 },
  { id: "free", label: "Free", value: undefined },
];

interface Props {
  open: boolean;
  imageSrc: string;
  fileName?: string;
  initialAspectId?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedBlob(
  src: string,
  area: Area,
  rotation: number,
  mime: string,
): Promise<Blob> {
  const img = await createImage(src);
  const rad = (rotation * Math.PI) / 180;

  const boxW = Math.abs(Math.cos(rad) * img.width) + Math.abs(Math.sin(rad) * img.height);
  const boxH = Math.abs(Math.sin(rad) * img.width) + Math.abs(Math.cos(rad) * img.height);

  const bigCanvas = document.createElement("canvas");
  bigCanvas.width = boxW;
  bigCanvas.height = boxH;
  const bigCtx = bigCanvas.getContext("2d");
  if (!bigCtx) throw new Error("Canvas 2D not supported");
  bigCtx.translate(boxW / 2, boxH / 2);
  bigCtx.rotate(rad);
  bigCtx.drawImage(img, -img.width / 2, -img.height / 2);

  const out = document.createElement("canvas");
  out.width = Math.round(area.width);
  out.height = Math.round(area.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");

  ctx.drawImage(
    bigCanvas,
    Math.round(area.x),
    Math.round(area.y),
    Math.round(area.width),
    Math.round(area.height),
    0,
    0,
    Math.round(area.width),
    Math.round(area.height),
  );

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      mime,
      0.92,
    );
  });
}

export default function ImageCropDialog({
  open,
  imageSrc,
  fileName = "image.jpg",
  initialAspectId = "4x3",
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectId, setAspectId] = useState(initialAspectId);
  const [area, setArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspectId(initialAspectId);
      setArea(null);
    }
  }, [open, imageSrc, initialAspectId]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  const aspectValue = ASPECTS.find((a) => a.id === aspectId)?.value;

  const handleConfirm = async () => {
    if (!area) return;
    setWorking(true);
    try {
      const mime =
        fileName.toLowerCase().endsWith(".png")
          ? "image/png"
          : fileName.toLowerCase().endsWith(".webp")
            ? "image/webp"
            : "image/jpeg";
      const blob = await getCroppedBlob(imageSrc, area, rotation, mime);
      const outName = fileName.replace(/(\.[^.]+)?$/, "") + ".jpg";
      const file = new File([blob], outName, { type: mime });
      onConfirm(file);
    } catch (e) {
      console.error(e);
    } finally {
      setWorking(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed left-1/2 top-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-3xl max-h-[92vh] rounded-2xl bg-[var(--canvas)] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)] shrink-0">
              <div className="flex items-center gap-2">
                <CropIcon className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-base font-bold text-[var(--text-1)]">
                  Crop & Adjust
                </h2>
              </div>
              <button
                onClick={onCancel}
                className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative bg-[var(--canvas-sub)] h-[55vh] min-h-[320px]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectValue}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                restrictPosition={false}
                objectFit="contain"
              />
            </div>

            <div className="px-5 py-4 border-t border-[var(--border-soft)] space-y-3 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mr-1">
                  Aspect
                </span>
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAspectId(a.id)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                      aspectId === a.id
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)] hover:bg-[var(--surface-alt)] transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Rotate 90°
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-3)] w-12 shrink-0">
                    Zoom
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent)]"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-3)] w-14 shrink-0">
                    Rotate
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent)]"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onCancel}
                  disabled={working}
                  className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={working || !area}
                  className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {working ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <CropIcon className="h-4 w-4" />
                      Crop & Use
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
