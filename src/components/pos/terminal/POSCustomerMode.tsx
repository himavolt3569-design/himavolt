"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import FoodParticles from "@/components/three/FoodParticles";
import {
  Search,
  X,
  Lock,
  LockOpen,
  LayoutGrid as LayoutGridIcon,
  UtensilsCrossed,
  Info,
  Keyboard,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string;
  category: { name: string };
}

interface Props {
  restaurantName: string;
  terminalName: string;
  menuItems: MenuItem[];
  categories: Category[];
  currency: string;
  /**
   * Called when staff wants to exit — via the hardware-style exit combo
   * (Ctrl+Shift+X by default) or the explicit exit button.
   * The parent is responsible for validating (e.g. requiring a PIN in future).
   */
  onRequestExit: () => void;
  /** Customisable exit combo. Default: Ctrl+Shift+X. */
  exitCombo?: { ctrl: boolean; shift: boolean; alt?: boolean; key: string };
}

const DEFAULT_EXIT = {
  ctrl: true,
  shift: true,
  alt: false,
  key: "x",
};

export default function POSCustomerMode({
  restaurantName,
  terminalName,
  menuItems,
  categories,
  currency,
  onRequestExit,
  exitCombo = DEFAULT_EXIT,
}: Props) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [attemptFeedback, setAttemptFeedback] = useState<null | "locked" | "exiting">(null);

  // Block common browser exits so a customer can't navigate away.
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  // Hardware-button exit: a specific key combo only staff knows/has-on-pedal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // The wizard collapses Cmd → ctrl when capturing on macOS, so honour
      // either e.ctrlKey or e.metaKey when the stored combo expects ctrl.
      const ctrlPressed = e.ctrlKey || e.metaKey;
      const match =
        ctrlPressed === !!exitCombo.ctrl &&
        e.shiftKey === !!exitCombo.shift &&
        e.altKey === !!exitCombo.alt &&
        e.key.toLowerCase() === exitCombo.key.toLowerCase();

      if (match) {
        e.preventDefault();
        setAttemptFeedback("exiting");
        onRequestExit();
        return;
      }

      // Visual feedback if someone hits Esc or F-keys, reminding them it's locked.
      if (
        e.key === "Escape" ||
        e.key === "F11" ||
        (e.altKey && e.key === "F4") ||
        (ctrlPressed && ["w", "r", "t", "n"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        setAttemptFeedback("locked");
        window.setTimeout(() => setAttemptFeedback((f) => (f === "locked" ? null : f)), 1600);
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [exitCombo, onRequestExit]);

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (activeCat === "ALL") return true;
      const childIds = categories
        .filter((c) => c.parentId === activeCat)
        .map((c) => c.id);
      return item.categoryId === activeCat || childIds.includes(item.categoryId);
    });
  }, [search, activeCat, menuItems, categories]);

  const exitLabel = comboLabel(exitCombo);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--canvas-sub)] font-sans">
      {/* Ambient 3D particles layer — decorative only, pointer-events none */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-60 mix-blend-screen"
      >
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.8} color="#fff5ee" />
            <pointLight position={[4, 4, 6]} intensity={1.4} color="#eaa94d" />
            <pointLight position={[-6, -2, 4]} intensity={0.8} color="#e58f2a" />
            <FoodParticles count={60} />
          </Suspense>
        </Canvas>
      </div>

      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4 shadow-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Browse the menu
          </p>
          <h1 className="mt-0.5 text-xl font-black tracking-tight text-[var(--text-1)] sm:text-2xl">
            {restaurantName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-[var(--accent-muted)] px-4 py-2 ring-1 ring-[var(--accent-border)] sm:flex">
            <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="text-[11px] font-bold tracking-wide text-[var(--accent-text)]">
              Customer mode
            </span>
          </div>

          <button
            onClick={() => setAttemptFeedback("locked")}
            title={`Exit requires ${exitLabel}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] text-[var(--text-3)] transition-colors hover:bg-[var(--surface)]"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search + categories */}
      <div className="relative z-10 shrink-0 space-y-3 border-b border-[var(--border)] bg-[var(--canvas)]/95 px-6 pb-4 pt-3 backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the menu…"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--canvas-sub)] py-3 pl-11 pr-10 text-sm font-medium focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]/40"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-3)] hover:bg-[var(--surface)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-slim">
          <CategoryPill
            label="All"
            active={activeCat === "ALL"}
            onClick={() => setActiveCat("ALL")}
            icon={<LayoutGridIcon className="h-3.5 w-3.5" />}
          />
          {topCategories.map((c) => (
            <CategoryPill
              key={c.id}
              label={c.name}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-12 pt-5 scrollbar-slim">
        {filteredItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <UtensilsCrossed className="h-12 w-12 text-[var(--text-3)]" />
            <p className="text-sm font-semibold text-[var(--text-2)]">
              No items match your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredItems.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                currency={currency}
                onTap={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer strip reassuring customer */}
      <div className="relative z-10 flex shrink-0 items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--canvas)]/80 px-6 py-3 text-[11px] text-[var(--text-3)] backdrop-blur-sm">
        <Info className="h-3.5 w-3.5" />
        <span className="font-medium">
          Ask any staff to place your order for{" "}
          <span className="font-semibold text-[var(--text-2)]">
            {terminalName}
          </span>
          .
        </span>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedItem(null);
            }}
          >
            <motion.div
              initial={{ y: 40, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.97 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-[var(--canvas)] sm:rounded-3xl"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative h-60 w-full bg-[var(--canvas-sub)]">
                {selectedItem.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <UtensilsCrossed className="h-16 w-16 text-[var(--text-3)]" />
                  </div>
                )}
              </div>

              <div className="space-y-3 p-5">
                <div className="flex items-start gap-2">
                  <VegDot isVeg={selectedItem.isVeg} />
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-[var(--text-1)]">
                      {selectedItem.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-[var(--text-3)]">
                      {selectedItem.category.name}
                    </p>
                  </div>
                </div>

                <p className="text-lg font-black text-[var(--accent)]">
                  {formatPrice(selectedItem.price, currency)}
                </p>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-3 text-center text-xs text-[var(--text-2)]">
                  Ask any staff to add this to your order.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked/exiting feedback */}
      <AnimatePresence>
        {attemptFeedback && (
          <motion.div
            key={attemptFeedback}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center"
          >
            <div
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg ${
                attemptFeedback === "locked"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-green-500 text-white"
              }`}
            >
              {attemptFeedback === "locked" ? (
                <>
                  <Lock className="h-4 w-4" />
                  Staff only. Press <kbd className="rounded bg-black/25 px-1.5 py-0.5 text-[11px] font-bold">{exitLabel}</kbd> to exit.
                </>
              ) : (
                <>
                  <LockOpen className="h-4 w-4" />
                  Returning to terminal…
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-bold transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/25"
          : "border-[var(--border)] bg-[var(--canvas-sub)] text-[var(--text-2)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <div
      className={`mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 ${
        isVeg ? "border-green-600" : "border-red-600"
      }`}
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isVeg ? "bg-green-600" : "bg-red-600"
        }`}
      />
    </div>
  );
}

function FoodCard({
  item,
  currency,
  onTap,
}: {
  item: MenuItem;
  currency: string;
  onTap: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);

  function handleMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    el.style.setProperty("--tilt-x", `${y}deg`);
    el.style.setProperty("--tilt-y", `${x}deg`);
  }

  function handleLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <button
      ref={cardRef}
      onClick={onTap}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] text-left shadow-sm transition-all hover:border-[var(--accent-border)] hover:shadow-xl"
      style={{
        transform:
          "perspective(900px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))",
        transition: "transform 0.15s ease-out, box-shadow 0.2s ease-out",
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--canvas-sub)]">
        {item.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed className="h-10 w-10 text-[var(--text-3)]" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <VegDot isVeg={item.isVeg} />
        </div>
      </div>

      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-[13px] font-bold text-[var(--text-1)]">
          {item.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-3)]">
            {item.category.name}
          </span>
          <span className="text-[13px] font-black text-[var(--accent)]">
            {formatPrice(item.price, currency)}
          </span>
        </div>
      </div>
    </button>
  );
}

function comboLabel(c: {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}) {
  const parts: string[] = [];
  if (c.ctrl) parts.push("Ctrl");
  if (c.shift) parts.push("Shift");
  if (c.alt) parts.push("Alt");
  parts.push(c.key.toUpperCase());
  return parts.join(" + ");
}
