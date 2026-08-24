"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Users,
  Clock,
  ArrowRight,
  CircleDot,
  Loader2,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

/* ── Types ──────────────────────────────────────────────────────── */

interface TableData {
  id: string;
  tableNo: number;
  label: string | null;
  capacity: number;
  isActive: boolean;
  session?: {
    id: string;
    isActive: boolean;
    startedAt: string;
    order?: {
      id: string;
      orderNo: string;
      status: string;
      total: number;
      guestName: string | null;
      payment?: { status: string } | null;
    } | null;
  } | null;
}

type TableStatus = "available" | "occupied" | "needs_billing";

interface Props {
  restaurantId: string;
  currency: string;
  onTableSelect: (tableNo: number) => void;
}

async function staffFetch<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function getTableStatus(table: TableData): TableStatus {
  if (!table.session?.isActive) return "available";
  const order = table.session.order;
  if (!order) return "occupied";
  if (
    order.status === "DELIVERED" &&
    (!order.payment || order.payment.status !== "COMPLETED")
  ) {
    return "needs_billing";
  }
  return "occupied";
}

const STATUS_META: Record<
  TableStatus,
  { label: string; glow: string; dot: string; hex: number }
> = {
  available: {
    label: "Available",
    glow: "#22c55e",
    dot: "bg-green-500",
    hex: 0x22c55e,
  },
  occupied: {
    label: "Occupied",
    glow: "#eaa94d",
    dot: "bg-amber-500",
    hex: 0xeaa94d,
  },
  needs_billing: {
    label: "Needs billing",
    glow: "#ef4444",
    dot: "bg-red-500",
    hex: 0xef4444,
  },
};

/* ── 3D Table Mesh ──────────────────────────────────────────────── */

function Table3D({
  x,
  z,
  tableNo,
  status,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  x: number;
  z: number;
  tableNo: number;
  status: TableStatus;
  selected: boolean;
  hovered: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null!);
  const glow = useRef<THREE.Mesh>(null!);
  const { hex, glow: glowHex } = STATUS_META[status];

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    // Subtle bobbing when active
    const idle = status === "available" ? 0 : Math.sin(t * 1.4 + tableNo) * 0.04;
    group.current.position.y = idle;
    // Selected / hovered scale pop
    const targetScale = selected ? 1.08 : hovered ? 1.05 : 1;
    group.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.18,
    );

    if (glow.current) {
      const pulse = 1 + Math.sin(t * 2.2 + tableNo) * 0.08;
      glow.current.scale.setScalar(
        (status === "available" ? 1 : 1.2) * pulse,
      );
    }
  });

  const tabletopHex = 0x7a4a22;
  const legHex = 0x2a1e14;

  return (
    <group
      ref={group}
      position={[x, 0, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Status glow ring on floor */}
      <mesh
        ref={glow}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.9, 1.3, 64]} />
        <meshBasicMaterial
          color={glowHex}
          transparent
          opacity={status === "available" ? 0.25 : 0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floor shadow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.15} />
      </mesh>

      {/* Four legs */}
      {[
        [-0.55, -0.55],
        [0.55, -0.55],
        [-0.55, 0.55],
        [0.55, 0.55],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 0.4, p[1]]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={legHex} roughness={0.8} />
        </mesh>
      ))}

      {/* Tabletop */}
      <RoundedBox
        args={[1.5, 0.12, 1.5]}
        radius={0.08}
        smoothness={4}
        position={[0, 0.86, 0]}
      >
        <meshStandardMaterial
          color={tabletopHex}
          roughness={0.55}
          metalness={0.15}
          emissive={selected || hovered ? hex : "#000"}
          emissiveIntensity={selected ? 0.35 : hovered ? 0.18 : 0}
        />
      </RoundedBox>

      {/* Accent strip on the tabletop edge reflecting status */}
      <mesh position={[0, 0.93, 0]}>
        <torusGeometry args={[0.85, 0.015, 8, 64]} />
        <meshStandardMaterial
          color={hex}
          emissive={hex}
          emissiveIntensity={status === "available" ? 0.3 : 0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Four chairs — simple cylinders */}
      {[
        [-1.1, 0],
        [1.1, 0],
        [0, -1.1],
        [0, 1.1],
      ].map((p, i) => (
        <group key={i} position={[p[0], 0, p[1]]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 20]} />
            <meshStandardMaterial color="#433125" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.125, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.25, 10]} />
            <meshStandardMaterial color={legHex} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Table number label (HTML overlay) */}
      <Billboard position={[0, 1.55, 0]}>
        <Html transform center pointerEvents="none">
          <div
            className="flex items-center justify-center font-black text-white"
            style={{
              fontSize: "24px",
              textShadow: "0px 2px 4px rgba(0,0,0,0.8), 0px 0px 2px rgba(0,0,0,1)",
            }}
          >
            {tableNo}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

/* ── Scene ──────────────────────────────────────────────────────── */

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#111" roughness={0.9} metalness={0} />
    </mesh>
  );
}

function FloorGrid() {
  const ref = useRef<THREE.GridHelper>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.Material & { opacity?: number };
    mat.opacity = 0.18 + Math.sin(clock.getElapsedTime() * 0.6) * 0.03;
  });
  return (
    <gridHelper
      ref={ref}
      args={[60, 60, "#eaa94d", "#333"]}
      position={[0, 0.001, 0]}
    />
  );
}

function Scene({
  tables,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  tables: Array<TableData & { x: number; z: number; status: TableStatus }>;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.35} color="#fff5ee" />
      <directionalLight
        position={[8, 14, 8]}
        intensity={1.1}
        color="#ffe7c4"
        castShadow
      />
      <pointLight position={[-6, 6, -6]} intensity={0.6} color="#ea7c1c" />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#fff5ee" />

      <Floor />
      <FloorGrid />

      {tables.map((t) => (
        <Table3D
          key={t.id}
          x={t.x}
          z={t.z}
          tableNo={t.tableNo}
          status={t.status}
          selected={selectedId === t.id}
          hovered={hoveredId === t.id}
          onHover={(h) => onHover(h ? t.id : null)}
          onSelect={() => onSelect(t.id)}
        />
      ))}
    </>
  );
}

/* ── Main view ──────────────────────────────────────────────────── */

export default function POSTables3DView({
  restaurantId,
  currency,
  onTableSelect,
}: Props) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchTables = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await staffFetch<{ tables?: TableData[] } | TableData[]>(
        `/api/restaurants/${restaurantId}/tables`,
      );
      const raw = Array.isArray(data) ? data : data.tables ?? [];
      setTables(raw);
    } catch {
      // silent — keep last good data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchTables(true);
    const id = setInterval(() => fetchTables(false), 30000);
    return () => clearInterval(id);
  }, [fetchTables]);

  // Layout tables in a grid. Spread so each table has ~3 units of breathing room.
  const positioned = useMemo(() => {
    const count = tables.length;
    if (count === 0) return [];
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 3.4;
    const offsetX = ((cols - 1) * spacing) / 2;
    const rows = Math.ceil(count / cols);
    const offsetZ = ((rows - 1) * spacing) / 2;
    return tables.map((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...t,
        x: col * spacing - offsetX,
        z: row * spacing - offsetZ,
        status: getTableStatus(t),
      };
    });
  }, [tables]);

  const counts = useMemo(() => {
    const c: Record<TableStatus, number> = {
      available: 0,
      occupied: 0,
      needs_billing: 0,
    };
    positioned.forEach((t) => {
      c[t.status] += 1;
    });
    return c;
  }, [positioned]);

  const selected = positioned.find((t) => t.id === selectedId) ?? null;

  function timeSince(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  const cameraDistance = Math.max(
    10,
    Math.min(26, Math.sqrt(Math.max(tables.length, 1)) * 3.6),
  );

  return (
    <div className="relative flex h-full w-full bg-[#0a0a0a] text-white">
      {/* 3D Canvas */}
      <div className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <p className="text-sm text-white/50">Loading floor plan…</p>
            </div>
          </div>
        ) : positioned.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <CircleDot className="mx-auto h-10 w-10 text-white/30" />
              <p className="mt-3 text-sm font-semibold text-white/80">
                No tables yet.
              </p>
              <p className="mt-1 text-xs text-white/50">
                Owner: add tables from Dashboard → Tables.
              </p>
            </div>
          </div>
        ) : (
          <Canvas
            shadows
            camera={{
              position: [cameraDistance * 0.4, cameraDistance * 0.95, cameraDistance],
              fov: 38,
            }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 1.5]}
          >
            <Suspense fallback={null}>
              <Scene
                tables={positioned}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onSelect={setSelectedId}
              />
              <fog attach="fog" args={["#0a0a0a", cameraDistance * 1.4, cameraDistance * 2.4]} />
            </Suspense>
          </Canvas>
        )}

        {/* Top overlay: legend + refresh */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
            <Legend status="available" count={counts.available} />
            <span className="h-6 w-px bg-white/10" />
            <Legend status="occupied" count={counts.occupied} />
            <span className="h-6 w-px bg-white/10" />
            <Legend status="needs_billing" count={counts.needs_billing} />
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => fetchTables(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-semibold text-white/85 backdrop-blur-md transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Hint */}
        {positioned.length > 0 && !selected && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <div className="rounded-full bg-black/65 px-4 py-1.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10 backdrop-blur-sm">
              Click any table to see details or take its order
            </div>
          </div>
        )}
      </div>

      {/* Side detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            key={selected.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="relative flex w-[340px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--canvas-sub)]"
          >
            <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-3)]">
                  Table
                </p>
                <h3 className="mt-1 text-4xl font-black tracking-tight text-[var(--text-1)]">
                  {selected.tableNo}
                </h3>
                {selected.label && (
                  <p className="mt-1 text-xs text-[var(--text-2)]">{selected.label}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-full p-1.5 text-[var(--text-3)] transition-colors hover:bg-[var(--canvas)] hover:text-[var(--text-1)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 p-5">
              <StatusBadge status={selected.status} />

              <div className="grid grid-cols-2 gap-3">
                <Stat
                  icon={<Users className="h-4 w-4" />}
                  label="Capacity"
                  value={`${selected.capacity}`}
                />
                {selected.session?.isActive ? (
                  <Stat
                    icon={<Clock className="h-4 w-4" />}
                    label="Sitting"
                    value={timeSince(selected.session.startedAt)}
                  />
                ) : (
                  <Stat
                    icon={<Clock className="h-4 w-4" />}
                    label="Status"
                    value="Empty"
                  />
                )}
              </div>

              {selected.session?.order && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                      Current order
                    </span>
                    <span className="rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
                      {selected.session.order.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-1)]">
                    #{selected.session.order.orderNo}
                  </p>
                  {selected.session.order.guestName && (
                    <p className="mt-1 text-xs text-[var(--text-2)]">
                      {selected.session.order.guestName}
                    </p>
                  )}
                  <p className="mt-3 text-2xl font-black text-[var(--accent)]">
                    {formatPrice(selected.session.order.total, currency)}
                  </p>
                </div>
              )}

              <button
                onClick={() => onTableSelect(selected.tableNo)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-bold text-[var(--canvas)] shadow-sm transition-opacity hover:opacity-90"
              >
                Take order for table {selected.tableNo}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function Legend({ status, count }: { status: TableStatus; count: number }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-2)]">
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      <span>{meta.label}</span>
      <span className="rounded-md bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-3)]">
        {count}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: TableStatus }) {
  const meta = STATUS_META[status];
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
      style={{
        backgroundColor: `${meta.glow}15`,
        color: meta.glow,
      }}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
      {meta.label}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3">
      <div className="text-[var(--text-3)]">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">
          {label}
        </p>
        <p className="text-sm font-bold text-[var(--text-1)]">{value}</p>
      </div>
    </div>
  );
}
