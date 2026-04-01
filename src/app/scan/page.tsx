"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Hash,
  ArrowRight,
  Mountain,
  Flashlight,
  FlashlightOff,
  CheckCircle2,
  BedDouble,
  CameraOff,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

export default function ScanPage() {
  return (
    <Suspense>
      <ScanPageContent />
    </Suspense>
  );
}

type CameraError = "permission_denied" | "no_camera" | "not_supported" | null;

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantSlug = searchParams.get("restaurant");
  const { showToast } = useToast();

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [starting, setStarting] = useState(false);

  // Manual entry
  const [tableNum, setTableNum] = useState("");
  const [roomNum, setRoomNum] = useState("");
  const [inputMode, setInputMode] = useState<"table" | "room">("table");

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolvedRef = useRef(false); // prevent double-navigate

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFlashlightOn(false);
  }, []);

  // Clean up on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const navigateToMenu = useCallback(
    (slug: string, table?: string | null, room?: string | null) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      stopCamera();
      setScanSuccess(true);
      const params = new URLSearchParams();
      if (table) params.set("table", table);
      if (room) params.set("room", room);
      const qs = params.toString();
      setTimeout(() => {
        router.push(`/menu/${slug}${qs ? `?${qs}` : ""}`);
      }, 900);
    },
    [router, stopCamera],
  );

  const handleQRData = useCallback(
    (data: string) => {
      if (resolvedRef.current) return;
      // Try parsing as full URL first (e.g. https://domain.com/menu/slug?table=5)
      try {
        const url = new URL(data);
        const match = url.pathname.match(/^\/menu\/([^/?#]+)/);
        if (match) {
          navigateToMenu(match[1], url.searchParams.get("table"), url.searchParams.get("room"));
          return;
        }
      } catch {
        // not a full URL
      }
      // Try as a path (e.g. /menu/slug?table=5)
      try {
        const url = new URL(data, window.location.origin);
        const match = url.pathname.match(/^\/menu\/([^/?#]+)/);
        if (match) {
          navigateToMenu(match[1], url.searchParams.get("table"), url.searchParams.get("room"));
          return;
        }
      } catch {
        // ignore
      }
      // If we have a restaurantSlug from the URL param, use that with any table number in the QR
      if (restaurantSlug) {
        navigateToMenu(restaurantSlug);
        return;
      }
      showToast("QR code not recognized as a HimaVolt table code", "error");
    },
    [navigateToMenu, restaurantSlug, showToast],
  );

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Dynamically import jsQR to avoid SSR issues
    import("jsqr").then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        handleQRData(code.data);
      } else {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    });
  }, [handleQRData]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("not_supported");
      return;
    }
    setStarting(true);
    setCameraError(null);
    resolvedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // Check torch support
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(!!caps.torch);
      setCameraActive(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("permission_denied");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("no_camera");
        } else {
          setCameraError("not_supported");
        }
      } else {
        setCameraError("not_supported");
      }
    } finally {
      setStarting(false);
    }
  }, [scanFrame]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashlightOn } as MediaTrackConstraintSet],
      });
      setFlashlightOn((v) => !v);
    } catch {
      // torch not supported on this device
    }
  }, [flashlightOn]);

  const handleTableSubmit = () => {
    if (!restaurantSlug) {
      showToast("Scan a QR code first or use a direct menu link", "info");
      return;
    }
    if (inputMode === "table" && tableNum) {
      navigateToMenu(restaurantSlug, tableNum);
    } else if (inputMode === "room" && roomNum) {
      navigateToMenu(restaurantSlug, undefined, roomNum);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,153,51,0.04),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(10,77,60,0.03),transparent_50%)]" />

      <Link
        href="/"
        className="absolute top-5 left-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex items-center gap-2"
      >
        <Mountain className="h-7 w-7 text-[#eaa94d]" strokeWidth={2.5} />
        <span className="text-xl font-extrabold tracking-tight text-[#3e1e0c]">
          Hima<span className="text-[#eaa94d]">Volt</span>
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 w-full max-w-sm px-6 space-y-8"
      >
        {restaurantSlug && (
          <p className="text-center text-sm text-gray-500">
            Scanning for{" "}
            <strong className="text-[#3e1e0c]">
              {restaurantSlug.replace(/-/g, " ")}
            </strong>
          </p>
        )}

        {/* Camera / Viewfinder box */}
        <div
          className={`relative mx-auto flex h-64 w-64 items-center justify-center rounded-3xl border-2 transition-all duration-500 overflow-hidden ${
            scanSuccess
              ? "border-[#3e1e0c] bg-[#3e1e0c]/10 shadow-2xl shadow-[#3e1e0c]/20"
              : cameraActive
                ? "border-[#eaa94d] shadow-xl shadow-[#eaa94d]/15"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          {/* Live camera video */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              cameraActive && !scanSuccess ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Flashlight toggle (only when camera active) */}
          {cameraActive && !scanSuccess && (
            <button
              onClick={toggleTorch}
              className={`absolute top-3 right-3 z-20 p-2 rounded-full backdrop-blur transition-colors ${
                torchSupported
                  ? "bg-white/60 hover:bg-white/80 text-gray-700"
                  : "bg-white/30 text-gray-400 cursor-not-allowed"
              }`}
              title={torchSupported ? "Toggle flashlight" : "Flashlight not supported on this device"}
            >
              {flashlightOn ? (
                <Flashlight className="w-5 h-5 text-[#eaa94d]" />
              ) : (
                <FlashlightOff className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 h-10 w-10 rounded-tl-3xl border-t-4 border-l-4 border-[#3e1e0c] z-10 pointer-events-none" />
          <div className="absolute top-0 right-0 h-10 w-10 rounded-tr-3xl border-t-4 border-r-4 border-[#3e1e0c] z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-[#3e1e0c] z-10 pointer-events-none" />
          <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-[#3e1e0c] z-10 pointer-events-none" />

          {/* Overlay states */}
          <AnimatePresence mode="wait">
            {scanSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 z-20"
              >
                <div className="bg-white rounded-full p-2 shadow-lg">
                  <CheckCircle2 className="h-12 w-12 text-[#3e1e0c]" />
                </div>
                <p className="text-[#3e1e0c] font-bold text-lg">Redirecting…</p>
              </motion.div>
            ) : cameraActive ? (
              /* Scanning line animation */
              <motion.div
                key="scanline"
                className="absolute inset-x-[8%] z-10 pointer-events-none"
                initial={{ top: "5%" }}
                animate={{ top: ["5%", "90%", "5%"] }}
                transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
                style={{ position: "absolute" }}
              >
                <div className="h-[3px] w-full rounded-full bg-[#eaa94d] shadow-[0_0_14px_4px_rgba(234,169,77,0.7)]" />
              </motion.div>
            ) : cameraError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 px-4 text-center z-10"
              >
                {cameraError === "permission_denied" ? (
                  <>
                    <ShieldAlert className="h-10 w-10 text-amber-400" />
                    <p className="text-xs font-bold text-gray-700">Camera access denied</p>
                    <p className="text-[10px] text-gray-400 leading-snug">
                      Allow camera in your browser settings, then tap Scan again
                    </p>
                  </>
                ) : cameraError === "no_camera" ? (
                  <>
                    <CameraOff className="h-10 w-10 text-gray-300" />
                    <p className="text-xs font-bold text-gray-600">No camera found</p>
                    <p className="text-[10px] text-gray-400">Use the manual entry below</p>
                  </>
                ) : (
                  <>
                    <CameraOff className="h-10 w-10 text-gray-300" />
                    <p className="text-xs font-bold text-gray-600">Camera not supported</p>
                    <p className="text-[10px] text-gray-400">Use the manual entry below</p>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 text-gray-300 z-10"
              >
                <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
                  <rect x="4" y="4" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="10" y="10" width="10" height="10" rx="1" fill="currentColor" />
                  <rect x="38" y="4" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="44" y="10" width="10" height="10" rx="1" fill="currentColor" />
                  <rect x="4" y="38" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="10" y="44" width="10" height="10" rx="1" fill="currentColor" />
                  <line x1="38" y1="38" x2="60" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="38" y1="38" x2="38" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="38" y1="60" x2="46" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="60" y1="38" x2="60" y2="46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="52" y1="52" x2="60" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <p className="text-xs font-medium text-gray-400">Tap below to scan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scan / Stop button */}
        <button
          onClick={cameraActive ? stopCamera : startCamera}
          disabled={starting || scanSuccess}
          className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
            scanSuccess
              ? "bg-gray-300 cursor-not-allowed shadow-none"
              : cameraActive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                : starting
                  ? "bg-gray-300 cursor-not-allowed shadow-none"
                  : "bg-[#3e1e0c] hover:bg-[#2d1508] hover:shadow-xl hover:-translate-y-0.5 shadow-[#3e1e0c]/25"
          }`}
        >
          {starting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting camera…
            </>
          ) : scanSuccess ? (
            "Redirecting…"
          ) : cameraActive ? (
            "Stop Camera"
          ) : (
            "Scan Table QR"
          )}
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Manual entry */}
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setInputMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                inputMode === "table"
                  ? "bg-[#3e1e0c] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              Table Number
            </button>
            <button
              onClick={() => setInputMode("room")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                inputMode === "room"
                  ? "bg-[#3e1e0c] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              Room Number
            </button>
          </div>

          <p className="text-sm font-bold text-[#3e1e0c] text-center">
            {inputMode === "table"
              ? "Enter table number manually"
              : "Enter guest house room number"}
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              {inputMode === "table" ? (
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              ) : (
                <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
              <input
                type="text"
                inputMode="numeric"
                value={inputMode === "table" ? tableNum : roomNum}
                onChange={(e) => {
                  if (inputMode === "table") {
                    setTableNum(e.target.value.replace(/\D/g, "").slice(0, 3));
                  } else {
                    setRoomNum(e.target.value.slice(0, 10));
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleTableSubmit()}
                placeholder={inputMode === "table" ? "e.g. 07" : "e.g. 101"}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-center text-lg font-bold text-[#3e1e0c] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:border-[#eaa94d]/30 focus:bg-white transition-all tracking-[0.3em]"
              />
            </div>
            <button
              onClick={handleTableSubmit}
              disabled={
                !restaurantSlug ||
                (inputMode === "table" ? tableNum.length < 1 : roomNum.length < 1)
              }
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl transition-all ${
                restaurantSlug &&
                (inputMode === "table" ? tableNum.length >= 1 : roomNum.length >= 1)
                  ? "bg-[#eaa94d] text-white shadow-md hover:bg-[#d67620]"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          {!restaurantSlug && (inputMode === "table" ? tableNum : roomNum) && (
            <p className="text-center text-[11px] text-amber-600">
              Scan a QR code first — manual entry needs a restaurant to be selected
            </p>
          )}
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs font-bold text-[#3e1e0c] hover:underline">
            Skip &amp; Browse Restaurants
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
