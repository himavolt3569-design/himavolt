"use client";

import { motion } from "framer-motion";
import {
  Store,
  Search,
  MapPin,
  ShoppingBag,
  Star,
  ArrowRight,
  ShieldCheck,
  Ban
} from "lucide-react";

export default function AllRestaurantsTab() {
  const dummyRestaurants = [
    { id: "R-1", name: "KTM - Baneswor", type: "CLOUD KITCHEN", city: "Kathmandu", orders: 12450, rating: 4.8, active: true },
    { id: "R-2", name: "Pokhara Zone", type: "RESTAURANT", city: "Pokhara", orders: 8320, rating: 4.5, active: true },
    { id: "R-3", name: "Burger House", type: "FAST FOOD", city: "Kathmandu", orders: 5120, rating: 4.2, active: true },
    { id: "R-4", name: "Lakeside Cafe", type: "CAFE", city: "Pokhara", orders: 2150, rating: 4.0, active: false },
  ];

  return (
    <div className="space-y-8">
      
      {/* ── Top Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search restaurants, cities..."
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {["All", "RESTAURANT", "CLOUD KITCHEN", "CAFE"].map(type => (
            <button 
              key={type}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                type === "All" 
                ? "bg-gray-900 text-white shadow-xl shadow-gray-900/20" 
                : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ── Restaurants List ── */}
      <div className="grid gap-5">
        {dummyRestaurants.map((restaurant, i) => (
          <motion.div
            key={restaurant.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all flex flex-col md:flex-row md:items-center gap-6 group cursor-pointer"
          >
            {/* Icon */}
            <div className="h-16 w-16 shrink-0 rounded-3xl flex items-center justify-center bg-orange-50">
              <Store className="h-7 w-7 text-[var(--accent)]" />
            </div>

            {/* Core Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <h4 className="text-lg font-bold text-gray-900">{restaurant.name}</h4>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${restaurant.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {restaurant.active ? 'Active' : 'Offline'}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold text-gray-400">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {restaurant.city}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                <span className="flex items-center gap-1.5">{restaurant.type}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 text-right">
              <div>
                <p className="text-xl font-bold text-gray-900 flex items-center justify-end gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {restaurant.rating.toFixed(1)}</p>
                <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">Rating</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 flex items-center justify-end gap-1.5"><ShoppingBag className="h-4 w-4 text-blue-500" /> {restaurant.orders.toLocaleString()}</p>
                <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">Total Orders</p>
              </div>
            </div>

            {/* Action Button */}
            <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--accent)]/30 transition-all md:ml-4">
              <ArrowRight className="h-5 w-5" />
            </div>
          </motion.div>
        ))}
      </div>
      
    </div>
  );
}
