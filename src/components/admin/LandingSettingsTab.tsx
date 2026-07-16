"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  LayoutTemplate,
  MessageSquare,
  BarChart3,
  GripVertical
} from "lucide-react";
import { v4 as uuid } from "uuid";
import { Reorder } from "framer-motion";

interface FeatureItem { id: string; title: string; description: string; icon: string; }
interface MetricItem { id: string; value: string; label: string; suffix: string; }
interface FAQItem { id: string; question: string; answer: string; }

interface LandingSettings {
  features: FeatureItem[];
  metrics: MetricItem[];
  faqs: FAQItem[];
}

const DEFAULTS: LandingSettings = {
  features: [],
  metrics: [],
  faqs: [],
};

const COMMON_ICONS = [
  "MonitorSmartphone", "QrCode", "ChefHat", "LineChart", "CreditCard", 
  "Building2", "Users", "Box", "Settings", "Zap", "Shield", "Clock"
];

export default function LandingSettingsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["landing-settings"],
    queryFn: () => fetch("/api/admin/landing-settings").then((r) => r.json()),
  });

  const [settings, setSettings] = useState<LandingSettings>(DEFAULTS);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current && data) {
      setSettings({ ...DEFAULTS, ...data });
      hydratedRef.current = true;
    }
  }, [data]);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"features" | "metrics" | "faqs">("features");

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setSettings({ ...DEFAULTS, ...updated });
      queryClient.setQueryData(["landing-settings"], updated);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    setStatus("idle");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#1A2744]">Landing Page CMS</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage dynamic content on the public website.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "features", label: "Core Features", icon: LayoutTemplate },
          { id: "metrics", label: "Metrics", icon: BarChart3 },
          { id: "faqs", label: "FAQs", icon: MessageSquare },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-[var(--canvas)] rounded-3xl border border-blue-100 p-6 shadow-sm">
        {/* FEATURES TAB */}
        {activeTab === "features" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">Platform Features</h3>
              <button
                onClick={() => setSettings(s => ({ ...s, features: [...s.features, { id: uuid(), title: "", description: "", icon: "MonitorSmartphone" }] }))}
                className="flex items-center gap-1.5 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                <Plus className="h-4 w-4" /> Add Feature
              </button>
            </div>
            
            <Reorder.Group
              axis="y"
              values={settings.features}
              onReorder={(newOrder) => setSettings(s => ({ ...s, features: newOrder }))}
              className="space-y-4"
            >
              {settings.features.map((feature) => (
                <Reorder.Item key={feature.id} value={feature} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="cursor-grab p-1 mt-2 text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                      <input
                        value={feature.title}
                        onChange={(e) => setSettings(s => ({
                          ...s, features: s.features.map(f => f.id === feature.id ? { ...f, title: e.target.value } : f)
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        placeholder="Feature Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Icon Name (Lucide)</label>
                      <select
                        value={feature.icon}
                        onChange={(e) => setSettings(s => ({
                          ...s, features: s.features.map(f => f.id === feature.id ? { ...f, icon: e.target.value } : f)
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20 cursor-pointer"
                      >
                        {COMMON_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                      <textarea
                        value={feature.description}
                        onChange={(e) => setSettings(s => ({
                          ...s, features: s.features.map(f => f.id === feature.id ? { ...f, description: e.target.value } : f)
                        }))}
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                        placeholder="Short description..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, features: s.features.filter(f => f.id !== feature.id) }))}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-start"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            {settings.features.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-sm text-slate-400">No features added yet.</p>
              </div>
            )}
          </div>
        )}

        {/* METRICS TAB */}
        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">Business Metrics</h3>
              <button
                onClick={() => setSettings(s => ({ ...s, metrics: [...s.metrics, { id: uuid(), value: "0", label: "Metric", suffix: "+" }] }))}
                className="flex items-center gap-1.5 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                <Plus className="h-4 w-4" /> Add Metric
              </button>
            </div>
            
            <Reorder.Group
              axis="y"
              values={settings.metrics}
              onReorder={(newOrder) => setSettings(s => ({ ...s, metrics: newOrder }))}
              className="space-y-4"
            >
              {settings.metrics.map((metric) => (
                <Reorder.Item key={metric.id} value={metric} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="cursor-grab p-1 mt-2 text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Value (Number)</label>
                      <input
                        value={metric.value}
                        onChange={(e) => setSettings(s => ({
                          ...s, metrics: s.metrics.map(m => m.id === metric.id ? { ...m, value: e.target.value } : m)
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        placeholder="e.g. 100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Suffix (e.g. K+, %)</label>
                      <input
                        value={metric.suffix}
                        onChange={(e) => setSettings(s => ({
                          ...s, metrics: s.metrics.map(m => m.id === metric.id ? { ...m, suffix: e.target.value } : m)
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        placeholder="+"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Label</label>
                      <input
                        value={metric.label}
                        onChange={(e) => setSettings(s => ({
                          ...s, metrics: s.metrics.map(m => m.id === metric.id ? { ...m, label: e.target.value } : m)
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        placeholder="Restaurants"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, metrics: s.metrics.filter(m => m.id !== metric.id) }))}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-start"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}

        {/* FAQS TAB */}
        {activeTab === "faqs" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">Frequently Asked Questions</h3>
              <button
                onClick={() => setSettings(s => ({ ...s, faqs: [...s.faqs, { id: uuid(), question: "", answer: "" }] }))}
                className="flex items-center gap-1.5 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                <Plus className="h-4 w-4" /> Add FAQ
              </button>
            </div>
            
            <Reorder.Group
              axis="y"
              values={settings.faqs}
              onReorder={(newOrder) => setSettings(s => ({ ...s, faqs: newOrder }))}
              className="space-y-4"
            >
              {settings.faqs.map((faq) => (
                <Reorder.Item key={faq.id} value={faq} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="cursor-grab p-1 mt-2 text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Question</label>
                      <input
                        value={faq.question}
                        onChange={(e) => setSettings(s => ({
                          ...s, faqs: s.faqs.map(f => f.id === faq.id ? { ...f, question: e.target.value } : f)
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm font-semibold border-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        placeholder="Question text..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Answer</label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => setSettings(s => ({
                          ...s, faqs: s.faqs.map(f => f.id === faq.id ? { ...f, answer: e.target.value } : f)
                        }))}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                        placeholder="Detailed answer..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, faqs: s.faqs.filter(f => f.id !== faq.id) }))}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-start"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition-all hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
        
        {status === "success" && (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 animate-in fade-in slide-in-from-right-4">
            <CheckCircle className="h-4 w-4" /> Saved successfully
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm font-bold text-red-500">
            <AlertCircle className="h-4 w-4" /> {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
