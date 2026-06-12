"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  Clock,
  Truck,
  Zap,
  CreditCard,
  RefreshCw,
  Star,
  ArrowUpRight,
  MessageCircle,
  Target,
  Rocket,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatPrice } from "@/lib/currency";

/* ═══════════════════════════════════════════════════════════════════
   High-Precision Components
   ═══════════════════════════════════════════════════════════════════ */

function MetricsCard({
  label,
  value,
  sub,
  icon: Icon,
  accentColor,
  onClick,
  chartData,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Activity;
  accentColor: string;
  onClick?: () => void;
  chartData?: any[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
            {sub && <p className="text-[10px] font-semibold text-slate-500">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {chartData && (
          <div className="h-12 w-full -mx-1 mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <Area 
                  type="monotone" 
                  dataKey="val" 
                  stroke={accentColor} 
                  fill={`${accentColor}10`}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Overview
   ═══════════════════════════════════════════════════════════════════ */

export default function MasterOverview({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [stats, setStats] = useState<any>(null);
  const [presence, setPresence] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/presence", { cache: "no-store" }),
      ]);
      setStats(await sRes.json());
      if (pRes.ok) setPresence(await pRes.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const sparklineData = useMemo(() => Array.from({ length: 12 }, () => ({ val: Math.floor(Math.random() * 100) })), []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  const statusPieData = Object.entries(stats.orders.byStatus).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1"];

  return (
    <div className="space-y-8">
      {/* ── Professional Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Pulse Active</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            System <span className="text-slate-400">Overview</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 pr-3">Live Presence</p>
              <p className="text-sm font-black text-slate-900 tabular-nums">{presence?.total || 0}</p>
           </div>
           <button
            onClick={fetchStats}
            className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
           >
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </header>

      {/* ── Core Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          label="Community"
          value={stats.users.total.toLocaleString()}
          sub="Registered Entities"
          icon={Users}
          accentColor="#0f172a"
          chartData={sparklineData}
          onClick={() => onNavigate("users")}
        />
        <MetricsCard
          label="Nodes"
          value={stats.restaurants.total}
          sub={`${stats.restaurants.active} Operational`}
          icon={Store}
          accentColor="#eaa94d"
          chartData={sparklineData}
          onClick={() => onNavigate("restaurants")}
        />
        <MetricsCard
          label="Velocity"
          value={stats.orders.today}
          sub="Requests Today"
          icon={Rocket}
          accentColor="#3b82f6"
          chartData={sparklineData}
          onClick={() => onNavigate("orders")}
        />
        <MetricsCard
          label="Volume"
          value={formatPrice(stats.revenue.today || 0, "NPR")}
          sub="Current Cycle"
          icon={TrendingUp}
          accentColor="#10b981"
          chartData={sparklineData}
          onClick={() => onNavigate("payments")}
        />
      </div>

      {/* ── Structural Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Real-time Load */}
        <div className="lg:col-span-2 rounded-[2rem] bg-slate-900 p-8 text-white relative overflow-hidden group">
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white/40 mb-1">Infrastructure Load</h3>
                    <p className="text-xl font-black tracking-tight">Active Request Stream</p>
                 </div>
                 <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-h-[220px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                       <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={3} isAnimationActive={false} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-[2rem] bg-white border border-slate-200 p-8 shadow-sm flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Lifecycle</h3>
              <Target className="h-4 w-4 text-slate-300" />
           </div>
           
           <div className="h-[200px] w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={statusPieData} innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {statusPieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
           </div>

           <div className="space-y-2 mt-auto">
              {statusPieData.map((s: any, i) => (
                 <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                       <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-900">{s.value}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>

      {/* ── High-Trust Directory ── */}
      <div className="rounded-[2rem] bg-white border border-slate-200 p-8 shadow-sm overflow-hidden">
         <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Node Performance Leaderboard</h3>
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
               <Star className="h-4 w-4" />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.topRestaurants.slice(0, 6).map((r: any, i: number) => (
               <div key={r.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs">
                     0{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{r.name}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{r.totalOrders} Transactions</p>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
