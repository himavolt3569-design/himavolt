"use client";

import { useState } from "react";
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
  TrendingUp,
  Calendar,
  Award,
  Crown,
  Sparkles,
  PartyPopper,
  Cake,
} from "lucide-react";

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  active: boolean;
}

interface RewardTier {
  name: string;
  minPoints: number;
  color: string;
  icon: string;
}

interface TopCustomer {
  id: string;
  name: string;
  totalPoints: number;
  tier: string;
  totalVisits: number;
}

interface BonusEvent {
  id: string;
  name: string;
  type: "double_points" | "birthday" | "custom";
  multiplier: number;
  active: boolean;
  description: string;
}

const defaultTiers: RewardTier[] = [
  { name: "Bronze", minPoints: 0, color: "bg-[var(--accent-hover)]", icon: "🥉" },
  { name: "Silver", minPoints: 200, color: "bg-[var(--text-3)]", icon: "🥈" },
  { name: "Gold", minPoints: 500, color: "bg-yellow-500", icon: "🥇" },
  { name: "Platinum", minPoints: 1000, color: "bg-purple-500", icon: "💎" },
];

export default function LoyaltyRewardsTab() {
  const { selectedRestaurant } = useRestaurant();
  const cur = selectedRestaurant?.currency ?? "NPR";
  const sym = getCurrencySymbol(cur);
  const [programEnabled, setProgramEnabled] = useState(true);
  const [pointsPerRupee, setPointsPerRupee] = useState(1);
  const [rupeesPerPoint, setRupeesPerPoint] = useState(100);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [customers] = useState<TopCustomer[]>([]);
  const [bonusEvents, setBonusEvents] = useState<BonusEvent[]>([]);
  const [tiers] = useState<RewardTier[]>(defaultTiers);

  const [editingReward, setEditingReward] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editDesc, setEditDesc] = useState("");

  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState(50);
  const [newRewardDesc, setNewRewardDesc] = useState("");
  const [showAddReward, setShowAddReward] = useState(false);

  const stats = {
    pointsToday: 1240,
    pointsWeek: 8750,
    pointsMonth: 34200,
    rewardsRedeemedToday: 8,
    rewardsRedeemedWeek: 47,
    rewardsRedeemedMonth: 186,
    activeMembers: 342,
    engagementRate: 68,
  };

  const addReward = () => {
    if (!newRewardName.trim()) return;
    setRewards((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newRewardName.trim(),
        pointsCost: newRewardPoints,
        description: newRewardDesc.trim(),
        active: true,
      },
    ]);
    setNewRewardName("");
    setNewRewardPoints(50);
    setNewRewardDesc("");
    setShowAddReward(false);
  };

  const removeReward = (id: string) => {
    setRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const startEditing = (reward: Reward) => {
    setEditingReward(reward.id);
    setEditName(reward.name);
    setEditPoints(reward.pointsCost);
    setEditDesc(reward.description);
  };

  const saveEdit = (id: string) => {
    setRewards((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, name: editName, pointsCost: editPoints, description: editDesc } : r
      )
    );
    setEditingReward(null);
  };

  const toggleReward = (id: string) => {
    setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  };

  const toggleBonusEvent = (id: string) => {
    setBonusEvents((prev) => prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e)));
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Bronze": return "text-[var(--accent-text)] bg-[var(--accent-muted)]";
      case "Silver": return "text-[var(--text-2)] bg-[var(--surface)]";
      case "Gold": return "text-yellow-700 bg-yellow-100";
      case "Platinum": return "text-purple-700 bg-purple-100";
      default: return "text-[var(--text-2)] bg-[var(--surface)]";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent-muted)] rounded-xl">
            <Gift className="w-6 h-6 text-[var(--accent-text)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Loyalty & Rewards</h2>
            <p className="text-sm text-[var(--text-2)]">Points & rewards program for regular customers</p>
          </div>
        </div>
        <button
          onClick={() => setProgramEnabled(!programEnabled)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          {programEnabled ? (
            <ToggleRight className="w-8 h-8 text-[var(--accent)]" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-[var(--text-3)]" />
          )}
          <span className={programEnabled ? "text-[var(--accent-text)]" : "text-[var(--text-3)]"}>
            {programEnabled ? "Active" : "Inactive"}
          </span>
        </button>
      </div>

      {programEnabled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: "Active Members", value: stats.activeMembers, icon: Users, color: "text-[var(--accent-text)] bg-[var(--accent-muted)]" },
              { label: "Engagement Rate", value: `${stats.engagementRate}%`, icon: TrendingUp, color: "text-[var(--accent-text)] bg-[var(--accent-muted)]" },
              { label: "Points Issued Today", value: stats.pointsToday.toLocaleString(), icon: Star, color: "text-[var(--accent)] bg-[var(--accent)]" },
              { label: "Redeemed Today", value: stats.rewardsRedeemedToday, icon: Award, color: "text-purple-600 bg-purple-50" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.02 }}
                className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-2)]">{stat.label}</p>
                    <p className="text-lg font-bold text-[var(--text-1)]">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Points Config & Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Points Configuration</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-2)]">Points earned per purchase</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={pointsPerRupee}
                      onChange={(e) => setPointsPerRupee(Number(e.target.value))}
                      className="w-20 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                    />
                    <span className="text-sm text-[var(--text-2)]">point(s) per</span>
                    <span className="text-sm font-medium text-[var(--text-2)]">{sym}</span>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      step={10}
                      value={rupeesPerPoint}
                      onChange={(e) => setRupeesPerPoint(Number(e.target.value))}
                      className="w-24 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                    />
                    <span className="text-sm text-[var(--text-2)]">spent</span>
                  </div>
                  <p className="text-xs text-[var(--text-3)]">
                    Customer earns {pointsPerRupee} point for every {sym} {rupeesPerPoint} spent
                  </p>
                </div>

                <div className="border-t border-[var(--border-soft)] pt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--text-2)] uppercase">Points Issued</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Today", value: stats.pointsToday },
                      { label: "This Week", value: stats.pointsWeek },
                      { label: "This Month", value: stats.pointsMonth },
                    ].map((s) => (
                      <div key={s.label} className="bg-[var(--accent-muted)] rounded-lg p-2.5 text-center">
                        <p className="text-xs text-[var(--accent-text)]">{s.label}</p>
                        <p className="text-sm font-bold text-[var(--accent-text)]">{s.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--border-soft)] pt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--text-2)] uppercase">Rewards Redeemed</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Today", value: stats.rewardsRedeemedToday },
                      { label: "This Week", value: stats.rewardsRedeemedWeek },
                      { label: "This Month", value: stats.rewardsRedeemedMonth },
                    ].map((s) => (
                      <div key={s.label} className="bg-[var(--accent-muted)] rounded-lg p-2.5 text-center">
                        <p className="text-xs text-[var(--accent-text)]">{s.label}</p>
                        <p className="text-sm font-bold text-[var(--text-1)]">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Reward Tiers</h3>
              <div className="space-y-3">
                {tiers.map((tier, i) => (
                  <motion.div
                    key={tier.name}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between bg-[var(--canvas-sub)] rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tier.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-1)]">{tier.name}</p>
                        <p className="text-xs text-[var(--text-2)]">
                          {tier.minPoints === 0 ? "Starting tier" : `${tier.minPoints}+ points`}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
              <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Rewards Catalog</h3>
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
                        onChange={(e) => setNewRewardPoints(Number(e.target.value))}
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
                        className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Add
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
                          onChange={(e) => setEditPoints(Number(e.target.value))}
                          className="w-20 border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                        />
                        <button onClick={() => saveEdit(reward.id)} className="p-1.5 text-[var(--accent-text)] hover:bg-[var(--accent-muted)] rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingReward(null)} className="p-1.5 text-[var(--text-3)] hover:bg-[var(--surface)] rounded-lg">
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
                            <p className="text-sm font-medium text-[var(--text-1)]">{reward.name}</p>
                            <p className="text-xs text-[var(--text-3)] mt-0.5">{reward.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-muted)] text-[var(--accent-text)]">
                            <Star className="w-3 h-3" />
                            {reward.pointsCost} pts
                          </span>
                          <button onClick={() => toggleReward(reward.id)}>
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
          </div>

          {/* Bottom Row: Customer Leaderboard & Bonus Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[var(--border-soft)]">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Customer Leaderboard</h3>
                </div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {customers.map((customer, i) => (
                  <motion.div
                    key={customer.id}
                    whileHover={{ backgroundColor: "rgba(251, 191, 36, 0.04)" }}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-bold text-[var(--text-3)]">
                        {i === 0 ? <Crown className="w-4 h-4 text-yellow-500 mx-auto" /> : `#${i + 1}`}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">{customer.name}</p>
                        <p className="text-xs text-[var(--text-3)]">{customer.totalVisits} visits</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierColor(customer.tier)}`}>
                        {customer.tier}
                      </span>
                      <span className="text-sm font-bold text-[var(--accent-text)]">{customer.totalPoints.toLocaleString()} pts</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--canvas)] border border-[var(--border-soft)] rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[var(--border-soft)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Special Bonus Events</h3>
                </div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {bonusEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ backgroundColor: "rgba(251, 191, 36, 0.04)" }}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                        {event.type === "double_points" && <Calendar className="w-4 h-4 text-[var(--accent-text)]" />}
                        {event.type === "birthday" && <Cake className="w-4 h-4 text-[var(--accent-text)]" />}
                        {event.type === "custom" && <PartyPopper className="w-4 h-4 text-[var(--accent-text)]" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">{event.name}</p>
                        <p className="text-xs text-[var(--text-3)]">{event.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[var(--accent-text)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full">
                        {event.multiplier}x
                      </span>
                      <button onClick={() => toggleBonusEvent(event.id)}>
                        {event.active ? (
                          <ToggleRight className="w-6 h-6 text-[var(--accent)]" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-[var(--text-3)]" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
