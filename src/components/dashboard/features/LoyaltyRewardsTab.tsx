"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrencySymbol } from "@/lib/currency";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  Gift,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Trophy,
  Star,
  Users,
  Award,
  Crown,
  Loader2,
} from "lucide-react";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  active: boolean;
  imageUrl: string | null;
  sortOrder: number;
}

interface LoyaltyConfig {
  restaurantId: string;
  pointsPerCurrency: number;
  isActive: boolean;
  welcomeBonus: number;
}

interface TopAccount {
  id: string;
  points: number;
  tier: string;
  totalSpent: number;
  user: { name: string | null; email: string | null; imageUrl: string | null };
}

function tierStyle(tier: string) {
  switch (tier) {
    case "PLATINUM":
      return "text-purple-700 bg-purple-100";
    case "GOLD":
      return "text-yellow-700 bg-yellow-100";
    case "SILVER":
      return "text-[var(--text-2)] bg-[var(--surface)]";
    default:
      return "text-[var(--accent-text)] bg-[var(--accent-muted)]";
  }
}

export default function LoyaltyRewardsTab() {
  const { selectedRestaurant } = useRestaurant();
  const restaurantId = selectedRestaurant?.id;
  const sym = getCurrencySymbol(selectedRestaurant?.currency ?? "NPR");

  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [topAccounts, setTopAccounts] = useState<TopAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingReward, setEditingReward] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editDesc, setEditDesc] = useState("");

  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState(50);
  const [newRewardDesc, setNewRewardDesc] = useState("");
  const [showAddReward, setShowAddReward] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/loyalty`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setConfig(
          data.config ?? {
            restaurantId,
            pointsPerCurrency: 1,
            isActive: true,
            welcomeBonus: 0,
          },
        );
        setRewards(data.rewards ?? []);
        setTopAccounts(data.topAccounts ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load loyalty");
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  const saveConfig = async (patch: Partial<LoyaltyConfig>) => {
    if (!restaurantId || !config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/loyalty`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setConfig(updated);
    } catch {
      setError("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const addReward = async () => {
    if (!restaurantId || !newRewardName.trim() || newRewardPoints <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/loyalty/rewards`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newRewardName.trim(),
            description: newRewardDesc.trim() || null,
            pointsCost: newRewardPoints,
          }),
        },
      );
      if (!res.ok) throw new Error();
      const created = await res.json();
      setRewards((prev) => [...prev, created]);
      setNewRewardName("");
      setNewRewardPoints(50);
      setNewRewardDesc("");
      setShowAddReward(false);
    } catch {
      setError("Failed to add reward");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/loyalty/rewards/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            description: editDesc || null,
            pointsCost: editPoints,
          }),
        },
      );
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRewards((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingReward(null);
    } catch {
      setError("Failed to save reward");
    } finally {
      setSaving(false);
    }
  };

  const toggleReward = async (reward: Reward) => {
    if (!restaurantId) return;
    const next = !reward.active;
    setRewards((prev) =>
      prev.map((r) => (r.id === reward.id ? { ...r, active: next } : r)),
    );
    try {
      await fetch(
        `/api/restaurants/${restaurantId}/loyalty/rewards/${reward.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: next }),
        },
      );
    } catch {
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: !next } : r)),
      );
    }
  };

  const removeReward = async (id: string) => {
    if (!restaurantId) return;
    const prev = rewards;
    setRewards((p) => p.filter((r) => r.id !== id));
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/loyalty/rewards/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
    } catch {
      setRewards(prev);
      setError("Failed to delete reward");
    }
  };

  const startEditing = (reward: Reward) => {
    setEditingReward(reward.id);
    setEditName(reward.name);
    setEditPoints(reward.pointsCost);
    setEditDesc(reward.description ?? "");
  };

  if (!restaurantId) {
    return (
      <div className="p-6 text-sm text-[var(--text-3)]">
        Select a restaurant to configure loyalty.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-2)]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading loyalty program…
      </div>
    );
  }

  const programEnabled = config?.isActive ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent-muted)] rounded-xl">
            <Gift className="w-6 h-6 text-[var(--accent-text)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">
              Loyalty & Rewards
            </h2>
            <p className="text-sm text-[var(--text-2)]">
              Points & rewards program for regular customers
            </p>
          </div>
        </div>
        <button
          onClick={() => saveConfig({ isActive: !programEnabled })}
          disabled={saving}
          className="flex items-center gap-2 text-sm font-medium"
        >
          {programEnabled ? (
            <ToggleRight className="w-8 h-8 text-[var(--accent)]" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-[var(--text-3)]" />
          )}
          <span
            className={
              programEnabled
                ? "text-[var(--accent-text)]"
                : "text-[var(--text-3)]"
            }
          >
            {programEnabled ? "Active" : "Inactive"}
          </span>
        </button>
      </div>

      {programEnabled && config && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg text-[var(--accent-text)] bg-[var(--accent-muted)]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-2)]">Members</p>
                  <p className="text-lg font-bold text-[var(--text-1)]">
                    {topAccounts.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg text-[var(--accent-text)] bg-[var(--accent-muted)]">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-2)]">Rewards</p>
                  <p className="text-lg font-bold text-[var(--text-1)]">
                    {rewards.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg text-[var(--accent-text)] bg-[var(--accent-muted)]">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-2)]">Welcome Bonus</p>
                  <p className="text-lg font-bold text-[var(--text-1)]">
                    {config.welcomeBonus} pts
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">
              Points Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-2)]">
                  Points earned per {sym}1
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  defaultValue={config.pointsPerCurrency}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0 && v !== config.pointsPerCurrency) {
                      saveConfig({ pointsPerCurrency: v });
                    }
                  }}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                />
                <p className="text-xs text-[var(--text-3)]">
                  Every {sym}1 spent = {config.pointsPerCurrency} point(s)
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-2)]">
                  Welcome bonus (on signup)
                </label>
                <input
                  type="number"
                  min={0}
                  defaultValue={config.welcomeBonus}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 0 && v !== config.welcomeBonus) {
                      saveConfig({ welcomeBonus: v });
                    }
                  }}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                />
                <p className="text-xs text-[var(--text-3)]">
                  Points credited once when a customer first earns with you.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">
                Rewards Catalog
              </h3>
              <button
                onClick={() => setShowAddReward(!showAddReward)}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Reward
              </button>
            </div>

            <AnimatePresence>
              {showAddReward && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-[var(--border-soft)] bg-[var(--accent-muted)]"
                >
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Reward name"
                        value={newRewardName}
                        onChange={(e) => setNewRewardName(e.target.value)}
                        className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                      />
                      <input
                        type="number"
                        placeholder="Points cost"
                        min={1}
                        value={newRewardPoints}
                        onChange={(e) =>
                          setNewRewardPoints(Number(e.target.value))
                        }
                        className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newRewardDesc}
                        onChange={(e) => setNewRewardDesc(e.target.value)}
                        className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addReward}
                        disabled={saving}
                        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                      >
                        {saving ? "Adding…" : "Add"}
                      </button>
                      <button
                        onClick={() => setShowAddReward(false)}
                        className="px-4 py-2 bg-[var(--surface-alt)] text-[var(--text-2)] rounded-lg text-sm font-medium hover:bg-[var(--border)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {rewards.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-3)]">
                No rewards yet. Add your first reward above.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                <AnimatePresence>
                  {rewards.map((reward) => (
                    <motion.div
                      key={reward.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface)]/50 transition-colors"
                    >
                      {editingReward === reward.id ? (
                        <div className="flex-1 flex items-center gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                          />
                          <input
                            type="number"
                            value={editPoints}
                            onChange={(e) =>
                              setEditPoints(Number(e.target.value))
                            }
                            className="w-20 border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                          />
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                          />
                          <button
                            onClick={() => saveEdit(reward.id)}
                            disabled={saving}
                            className="p-1.5 text-[var(--accent-text)] hover:bg-[var(--accent-muted)] rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingReward(null)}
                            className="p-1.5 text-[var(--text-3)] hover:bg-[var(--surface)] rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                              <Gift className="w-5 h-5 text-[var(--accent-text)]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-1)]">
                                {reward.name}
                              </p>
                              <p className="text-xs text-[var(--text-3)] mt-0.5">
                                {reward.description ?? "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-muted)] text-[var(--accent-text)]">
                              <Star className="w-3 h-3" />
                              {reward.pointsCost} pts
                            </span>
                            <button onClick={() => toggleReward(reward)}>
                              {reward.active ? (
                                <ToggleRight className="w-6 h-6 text-[var(--accent)]" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-[var(--text-3)]" />
                              )}
                            </button>
                            <button
                              onClick={() => startEditing(reward)}
                              className="p-1.5 text-[var(--text-3)] hover:text-[var(--accent-text)] hover:bg-[var(--accent-muted)] rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeReward(reward.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">
                  Top Customers
                </h3>
              </div>
            </div>
            {topAccounts.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-3)]">
                No loyalty activity yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {topAccounts.map((account, i) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-bold text-[var(--text-3)]">
                        {i === 0 ? (
                          <Crown className="w-4 h-4 text-yellow-500 mx-auto" />
                        ) : (
                          `#${i + 1}`
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {account.user.name ?? account.user.email ?? "Guest"}
                        </p>
                        <p className="text-xs text-[var(--text-3)]">
                          {sym}
                          {account.totalSpent.toLocaleString()} spent
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${tierStyle(account.tier)}`}
                      >
                        {account.tier}
                      </span>
                      <span className="text-sm font-bold text-[var(--accent-text)]">
                        {account.points.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
