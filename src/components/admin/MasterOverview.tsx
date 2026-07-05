"use client";

import { motion } from "framer-motion";
import {
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Truck,
  ArrowRight,
  Sparkles,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function MasterOverview({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  // Beautiful dummy data for the aesthetic overview
  const revenueData = [
    { time: "Mon", val: 12000 }, { time: "Tue", val: 19000 },
    { time: "Wed", val: 15000 }, { time: "Thu", val: 24000 },
    { time: "Fri", val: 28000 }, { time: "Sat", val: 32000 },
    { time: "Sun", val: 29000 },
  ];

  const categoryData = [
    { name: "Restaurants", value: 65, color: "#f97316" }, // var(--accent)
    { name: "Hotels", value: 35, color: "#3b82f6" },
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-').replace('/10', '')}`} />
        </div>
        <button className="text-gray-300 group-hover:text-gray-900 transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <div>
        <h4 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">{value}</h4>
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <p className="text-xs font-medium text-gray-400 mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      
      {/* ── Welcome Banner ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-[var(--accent)] to-orange-400 rounded-[2.5rem] p-10 md:p-14 text-white shadow-xl shadow-[var(--accent)]/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <Sparkles className="h-48 w-48" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Good morning, Admin.</h2>
          <p className="text-lg text-white/80 font-medium leading-relaxed">
            HimaVolt is performing beautifully today. You have 342 active orders and revenue is up by 12% compared to last week. Keep up the great work!
          </p>
        </div>
      </motion.div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard delay={0.1} title="Total Revenue" value="NPR 842k" subtitle="+12.4% from last week" icon={TrendingUp} color="bg-emerald-500 text-emerald-500" />
        <StatCard delay={0.2} title="Active Orders" value="342" subtitle="Across 42 restaurants" icon={ShoppingBag} color="bg-[var(--accent)] text-[var(--accent)]" />
        <StatCard delay={0.3} title="Total Users" value="12.4k" subtitle="+84 new today" icon={Users} color="bg-blue-500 text-blue-500" />
        <StatCard delay={0.4} title="Active Partners" value="128" subtitle="Restaurants & Hotels" icon={Store} color="bg-purple-500 text-purple-500" />
      </div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Area Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Revenue Growth</h3>
              <p className="text-sm font-medium text-gray-500 mt-1">NPR generated this week</p>
            </div>
            <select className="bg-gray-50 border-none text-sm font-semibold text-gray-700 py-2 px-4 rounded-xl focus:ring-0 cursor-pointer outline-none">
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="val" 
                  stroke="var(--accent)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute top-8 left-8">
            <h3 className="text-xl font-bold text-gray-900">Distribution</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Revenue sources</p>
          </div>
          
          <div className="h-[250px] w-full mt-16 relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={categoryData}
                   innerRadius={70}
                   outerRadius={100}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                 >
                   {categoryData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                <PieChartIcon className="h-8 w-8 text-gray-300" />
             </div>
          </div>
          
          <div className="w-full flex justify-center gap-6 mt-4">
            {categoryData.map(cat => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
