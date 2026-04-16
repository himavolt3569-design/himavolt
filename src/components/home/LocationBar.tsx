"use client";

import { useState } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "@/context/LocationContext";

const popularAreas = [
  "Thamel",
  "Lazimpat",
  "Baneshwor",
  "Patan",
  "Bouddha",
  "Jhamsikhel",
  "Baluwatar",
  "Maharajgunj",
];

export default function LocationBar() {
  const { location, detect, setManual } = useLocation();
  const [open, setOpen] = useState(false);
  const { status } = location;

  return (
    <div className="sticky top-[56px] z-40 bg-[var(--canvas)]/95 backdrop-blur-sm border-b border-[var(--border-soft)]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-2 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />

        {status === "detecting" && (
          <span className="text-[13px] text-[var(--text-3)]">
            Detecting location...
          </span>
        )}

        {status !== "detecting" && status !== "idle" && (
          <>
            <span className="text-[13px] font-semibold text-[var(--text-1)]">
              Delivering to{" "}
              <span className="text-[var(--accent)]">{location.area}</span>
            </span>
            <button
              onClick={() => setOpen(true)}
              className="text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] underline underline-offset-2 ml-1"
            >
              Change
            </button>
          </>
        )}

        {status === "idle" && (
          <>
            <span className="text-[13px] font-semibold text-[var(--text-1)]">
              Delivering to{" "}
              <span className="text-[var(--accent)]">{location.area}</span>
            </span>
            <button
              onClick={() => setOpen(true)}
              className="text-[11px] text-[var(--text-3)] hover:text-[var(--accent)] underline underline-offset-2 ml-1"
            >
              Change
            </button>
            <button
              onClick={detect}
              className="ml-auto text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <Navigation className="h-3 w-3" /> Detect my location
            </button>
          </>
        )}
      </div>

      {/* Area picker overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full bg-[var(--canvas)] border-b border-[var(--border-soft)] shadow-lg z-50"
          >
            <div className="mx-auto max-w-[1440px] px-4 md:px-8 lg:px-12 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[var(--text-1)]">
                  Choose your area
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[var(--text-3)] hover:text-[var(--text-2)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  detect();
                  setOpen(false);
                }}
                className="flex items-center gap-2 text-[13px] font-semibold text-[var(--accent)] hover:underline mb-3"
              >
                <Navigation className="h-3.5 w-3.5" />
                Use my current location
              </button>

              <div className="flex flex-wrap gap-2">
                {popularAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => {
                      setManual(area);
                      setOpen(false);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-[12px] font-medium border border-[var(--border)] text-[var(--text-1)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-muted)] transition-colors duration-200"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
