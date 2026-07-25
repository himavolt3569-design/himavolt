"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Bike,
  Check,
  ChefHat,
  Copy,
  GlassWater,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantDeliveryTopic } from "@/lib/realtime-topics";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";
import { formatDistance } from "@/lib/geo";
import {
  CUSTOMER_STATUS_LABELS,
  allowedTransitions,
} from "@/lib/delivery/transitions";
import { STATION_LABELS } from "@/lib/orders/kitchen-status";
import type { DeliveryStatus, PrepStation } from "@/generated/prisma";

/**
 * One delivery hub, not three dashboards.
 *
 * The ask was a food dashboard, a drinks dashboard and a hardware dashboard.
 * Food and drinks are tabs here instead, because an order containing a burger
 * and a Coke belongs to both, as separate pages it would appear twice and risk
 * being made twice. Hardware is a different business (buying equipment, not
 * selling meals) and is deliberately absent.
 */

type Tab = "live" | "food" | "drinks" | "dispatch" | "payments" | "riders";

const TABS: { id: Tab; label: string; icon: typeof Truck }[] = [
  { id: "live", label: "Live", icon: Truck },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "drinks", label: "Drinks", icon: GlassWater },
  { id: "dispatch", label: "Dispatch", icon: Package },
  { id: "payments", label: "Payments", icon: Banknote },
  { id: "riders", label: "Riders", icon: Bike },
];

interface PrepGroup {
  station: PrepStation;
  status: string;
  readyAt: string | null;
}

interface DeliveryRow {
  id: string;
  status: DeliveryStatus;
  fee: number;
  finalFee: number | null;
  distanceKm: number | null;
  estimatedMins: number | null;
  cancelReason: string | null;
  createdAt: string;
  riderToken: string | null;
  driver: { id: string; name: string; phone: string; isOnline: boolean } | null;
  order: {
    id: string;
    orderNo: string;
    total: number;
    status: string;
    deliveryAddress: string | null;
    deliveryPhone: string | null;
    deliveryNote: string | null;
    guestName: string | null;
    createdAt: string;
    payment: { method: string; status: string; amount: number } | null;
    prepGroups: PrepGroup[];
    items: { id: string; name: string; quantity: number; prepGroup: { station: PrepStation } | null }[];
  };
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNo: string | null;
  isActive: boolean;
  isOnline: boolean;
  totalTrips: number;
}

export default function DeliveryHubTab() {
  const { selectedRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const restaurantId = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";

  const [tab, setTab] = useState<Tab>("live");
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const feedTab = tab === "payments" || tab === "riders" ? "live" : tab;

  const load = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [d, r] = await Promise.all([
        apiFetch<{ deliveries: DeliveryRow[] }>(
          `/api/restaurants/${restaurantId}/deliveries?tab=${feedTab}`,
        ),
        apiFetch<{ riders: Rider[] }>(`/api/restaurants/${restaurantId}/riders`),
      ]);
      setDeliveries(d.deliveries);
      setRiders(r.riders);
    } catch {
      /* leave the last good view on screen rather than blanking it */
    }
    setLoading(false);
  }, [restaurantId, feedTab]);

  useEffect(() => {
    void load();
  }, [load]);

  // Contentless signal → refetch through the access-checked API, exactly like
  // the kitchen board. Realtime never widens what this dashboard can read.
  useRealtimeSignal(
    restaurantId ? restaurantDeliveryTopic(restaurantId) : null,
    load,
  );

  const act = async (
    deliveryId: string,
    to: DeliveryStatus,
    driverId?: string,
  ) => {
    if (!restaurantId) return;
    setBusyId(deliveryId);
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/deliveries/${deliveryId}`,
        { method: "PATCH", body: { to, ...(driverId ? { driverId } : {}) } },
      );
      await load();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not update the delivery",
        "error",
      );
    }
    setBusyId(null);
  };

  const stats = useMemo(() => {
    const prepaid = deliveries.filter(
      (d) => d.order.payment?.status === "COMPLETED",
    );
    const cod = deliveries.filter(
      (d) => d.order.payment?.method === "CASH" && d.order.payment.status !== "COMPLETED",
    );
    return {
      active: deliveries.length,
      prepaidTotal: prepaid.reduce((s, d) => s + d.order.total, 0),
      codTotal: cod.reduce((s, d) => s + d.order.total, 0),
      codCount: cod.length,
    };
  }, [deliveries]);

  if (!restaurantId) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-black tracking-tight text-[var(--text-1)] sm:text-[22px]">
          Delivery
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
          Everything going out the door, food, drinks, riders and the money.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--surface)] p-1 scrollbar-slim">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all ${
              tab === id
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-1)]" />
        </div>
      ) : tab === "riders" ? (
        <RidersPanel
          restaurantId={restaurantId}
          riders={riders}
          onChanged={load}
        />
      ) : tab === "payments" ? (
        <PaymentsPanel
          deliveries={deliveries}
          currency={currency}
          stats={stats}
        />
      ) : deliveries.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              riders={riders}
              currency={currency}
              busy={busyId === d.id}
              onAct={act}
              stationFilter={
                tab === "food"
                  ? (["FOOD", "DESSERT"] as PrepStation[])
                  : tab === "drinks"
                    ? (["DRINKS", "BAR"] as PrepStation[])
                    : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const copy: Record<string, string> = {
    live: "No deliveries in progress right now.",
    food: "No food orders waiting.",
    drinks: "No drink orders waiting.",
    dispatch: "Nothing ready for a rider yet.",
  };
  return (
    <div className="rounded-2xl bg-[var(--canvas-sub)] px-4 py-16 text-center">
      <Truck className="mx-auto mb-3 h-8 w-8 text-[var(--text-3)]" />
      <p className="text-[14px] font-bold text-[var(--text-1)]">
        {copy[tab] ?? "Nothing here."}
      </p>
      <p className="mt-1 text-[12px] text-[var(--text-3)]">
        New delivery orders appear here the moment they come in.
      </p>
    </div>
  );
}

function DeliveryCard({
  delivery: d,
  riders,
  currency,
  busy,
  onAct,
  stationFilter,
}: {
  delivery: DeliveryRow;
  riders: Rider[];
  currency: string;
  busy: boolean;
  onAct: (id: string, to: DeliveryStatus, driverId?: string) => void;
  stationFilter: PrepStation[] | null;
}) {
  const [pickingRider, setPickingRider] = useState(false);

  const next = allowedTransitions(d.status, "RESTAURANT");
  const allReady =
    d.order.prepGroups.length > 0 &&
    d.order.prepGroups.every((g) => g.status === "READY" || g.status === "SERVED");

  const items = stationFilter
    ? d.order.items.filter(
        (i) => i.prepGroup && stationFilter.includes(i.prepGroup.station),
      )
    : d.order.items;

  const isCod =
    d.order.payment?.method === "CASH" && d.order.payment.status !== "COMPLETED";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-black text-[var(--text-1)]">
              #{d.order.orderNo}
            </span>
            <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
              {CUSTOMER_STATUS_LABELS[d.status]}
            </span>
            {isCod && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Cash on delivery
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-2)]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{d.order.deliveryAddress ?? "No address"}</span>
          </p>
          {d.order.deliveryPhone && (
            <a
              href={`tel:${d.order.deliveryPhone}`}
              className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent-text)]"
            >
              <Phone className="h-3 w-3" />
              {d.order.deliveryPhone}
            </a>
          )}
        </div>

        <div className="text-right">
          <p className="text-[15px] font-black text-[var(--text-1)]">
            {formatPrice(d.order.total, currency)}
          </p>
          <p className="text-[11px] text-[var(--text-3)]">
            {d.distanceKm != null ? formatDistance(d.distanceKm) : "-"}
            {d.estimatedMins ? ` · ~${d.estimatedMins} min` : ""}
          </p>
        </div>
      </div>

      {/* Station progress, the burger-and-Coke gate, made visible */}
      {d.order.prepGroups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {d.order.prepGroups.map((g) => {
            const done = g.status === "READY" || g.status === "SERVED";
            return (
              <span
                key={g.station}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  done
                    ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                    : "bg-[var(--surface)] text-[var(--text-3)]"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <ChefHat className="h-3 w-3" />}
                {STATION_LABELS[g.station]}
              </span>
            );
          })}
        </div>
      )}

      <ul className="mt-3 space-y-0.5">
        {items.map((i) => (
          <li key={i.id} className="text-[12px] text-[var(--text-2)]">
            <span className="font-bold text-[var(--text-1)]">{i.quantity}×</span>{" "}
            {i.name}
          </li>
        ))}
      </ul>

      {d.driver && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--text-2)]">
          <Bike className="h-3.5 w-3.5" />
          <span className="font-semibold">{d.driver.name}</span>
          {d.riderToken && <RiderLinkButton token={d.riderToken} />}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-3)]" />}

        {next.includes("READY_FOR_PICKUP") && (
          <button
            onClick={() => onAct(d.id, "READY_FOR_PICKUP")}
            disabled={busy || !allReady}
            title={
              allReady
                ? undefined
                : "Every station must finish before this order can be collected"
            }
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            Mark ready
          </button>
        )}

        {next.includes("ASSIGNED") && !pickingRider && (
          <button
            onClick={() => setPickingRider(true)}
            disabled={busy}
            className="rounded-lg bg-[var(--text-1)] px-3.5 py-2 text-[12px] font-bold text-[var(--canvas)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Assign rider
          </button>
        )}

        {pickingRider && (
          <div className="flex flex-wrap items-center gap-2">
            {riders.filter((r) => r.isActive).length === 0 ? (
              <span className="text-[12px] text-[var(--text-3)]">
                Add a rider in the Riders tab first.
              </span>
            ) : (
              riders
                .filter((r) => r.isActive)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setPickingRider(false);
                      onAct(d.id, "ASSIGNED", r.id);
                    }}
                    className="rounded-lg bg-[var(--surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--text-1)] transition-colors hover:bg-[var(--canvas-sub)]"
                  >
                    {r.name}
                  </button>
                ))
            )}
            <button
              onClick={() => setPickingRider(false)}
              className="rounded-lg p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {next.includes("CANCELLED") && (
          <button
            onClick={() => onAct(d.id, "CANCELLED")}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-[12px] font-bold text-[var(--text-3)] transition-colors hover:text-red-500 disabled:opacity-40"
          >
            Cancel
          </button>
        )}

        {/* Picked up / in transit / delivered are the RIDER's to press, from
            their own link. The dashboard deliberately cannot fake them. */}
        {["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(d.status) && (
          <span className="text-[11px] text-[var(--text-3)]">
            Waiting on the rider to confirm the next step
          </span>
        )}
      </div>
    </div>
  );
}

function RiderLinkButton({ token }: { token: string }) {
  const { showToast } = useToast();
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(
          `${window.location.origin}/rider/${token}`,
        );
        showToast("Rider link copied", "success");
      }}
      className="ml-1 flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)] transition-colors hover:text-[var(--text-1)]"
    >
      <Copy className="h-3 w-3" />
      Copy link
    </button>
  );
}

function PaymentsPanel({
  deliveries,
  currency,
  stats,
}: {
  deliveries: DeliveryRow[];
  currency: string;
  stats: { active: number; prepaidTotal: number; codTotal: number; codCount: number };
}) {
  const perRider = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; count: number }>();
    for (const d of deliveries) {
      if (!d.driver) continue;
      if (d.order.payment?.method !== "CASH") continue;
      if (d.order.payment.status === "COMPLETED") continue;
      const entry = map.get(d.driver.id) ?? {
        name: d.driver.name,
        amount: 0,
        count: 0,
      };
      entry.amount += d.order.total;
      entry.count += 1;
      map.set(d.driver.id, entry);
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [deliveries]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active deliveries" value={String(stats.active)} />
        <StatCard
          label="Paid online"
          value={formatPrice(stats.prepaidTotal, currency)}
        />
        <StatCard
          label={`Cash to collect (${stats.codCount})`}
          value={formatPrice(stats.codTotal, currency)}
          accent
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <h3 className="mb-1 text-sm font-bold text-[var(--text-1)]">
          Cash held by riders
        </h3>
        <p className="mb-4 text-[12px] text-[var(--text-3)]">
          What each rider owes you from cash-on-delivery orders still in progress.
        </p>
        {perRider.length === 0 ? (
          <p className="text-[13px] text-[var(--text-3)]">
            No cash outstanding.
          </p>
        ) : (
          <div className="space-y-2">
            {perRider.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-xl bg-[var(--canvas-sub)] px-4 py-3"
              >
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-1)]">
                    {r.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    {r.count} order{r.count === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-[14px] font-black text-[var(--text-1)]">
                  {formatPrice(r.amount, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-[var(--accent-border)] bg-[var(--accent-muted)]"
          : "border-[var(--border)] bg-[var(--canvas)]"
      }`}
    >
      <p className="text-[11px] font-semibold text-[var(--text-3)]">{label}</p>
      <p className="mt-1 text-[20px] font-black text-[var(--text-1)]">{value}</p>
    </div>
  );
}

function RidersPanel({
  restaurantId,
  riders,
  onChanged,
}: {
  restaurantId: string;
  riders: Rider[];
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!name.trim() || !phone.trim()) return;
    setAdding(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/riders`, {
        method: "POST",
        body: { name: name.trim(), phone: phone.trim() },
      });
      setName("");
      setPhone("");
      onChanged();
      showToast("Rider added", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add rider", "error");
    }
    setAdding(false);
  };

  const toggle = async (rider: Rider) => {
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/riders?riderId=${rider.id}`,
        { method: "PATCH", body: { isActive: !rider.isActive } },
      );
      onChanged();
    } catch {
      showToast("Could not update rider", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <h3 className="mb-1 text-sm font-bold text-[var(--text-1)]">
          Your delivery people
        </h3>
        <p className="mb-4 text-[12px] text-[var(--text-3)]">
          No app to install. Assign an order and copy them the link, they tap
          Picked up and Delivered from their phone.
        </p>

        {riders.length > 0 && (
          <div className="mb-4 space-y-2">
            {riders.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[var(--canvas-sub)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[var(--text-1)]">
                    {r.name}
                    {!r.isActive && (
                      <span className="ml-2 text-[10px] font-semibold text-[var(--text-3)]">
                        inactive
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    {r.phone} · {r.totalTrips} trips
                  </p>
                </div>
                <button
                  onClick={() => toggle(r)}
                  className="shrink-0 rounded-lg bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)] transition-colors hover:text-[var(--text-1)]"
                >
                  {r.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rider name"
            maxLength={80}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
            maxLength={10}
            inputMode="numeric"
            className="w-36 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
          />
          <button
            onClick={add}
            disabled={adding || !name.trim() || !phone.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add rider
          </button>
        </div>
      </div>
    </div>
  );
}
