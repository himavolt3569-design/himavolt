"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  Building2,
  Smartphone,
  Save,
  ShieldCheck,
  Zap
} from "lucide-react";

export default function GatewaySettingsTab() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Gateway Configurations</h3>
        <p className="text-sm font-medium text-gray-500">
          Configure credentials for processing hardware purchases and platform fees. These settings are highly sensitive.
        </p>
      </div>

      <div className="grid gap-6">
        
        {/* IME Pay Configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">IME Bank / IME Pay</h4>
              <p className="text-xs font-semibold text-gray-400">Primary banking and wallet gateway</p>
            </div>
            <div className="ml-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Active
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Merchant Code</label>
              <input type="text" defaultValue="IME_HMLVLT_992" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">API Secret Key</label>
              <input type="password" defaultValue="************************" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Webhook URL (Auto-Generated)</label>
              <input type="text" readOnly defaultValue="https://api.himalhub.com/webhooks/ime-pay" className="w-full px-6 py-4 bg-gray-100 rounded-2xl border-none text-gray-500 font-mono text-sm" />
            </div>
          </div>
        </motion.div>

        {/* eSewa Configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2rem] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">eSewa Wallet</h4>
              <p className="text-xs font-semibold text-gray-400">Digital wallet integration</p>
            </div>
            <div className="ml-auto px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              Disabled
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Merchant ID (eSewa)</label>
              <input type="text" placeholder="Enter eSewa Merchant ID" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Secret Key</label>
              <input type="password" placeholder="Enter Secret Key" className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" />
            </div>
          </div>
        </motion.div>

        {/* Action Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end pt-4"
        >
          <button className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-[var(--accent)]/20 active:scale-95">
            <Save className="h-5 w-5" />
            Save Configurations
          </button>
        </motion.div>

      </div>
    </div>
  );
}
