"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  CheckCircle2,
  Clock,
  ChevronRight,
  Box,
  ClipboardCheck,
  Truck,
  Users,
  Tag,
  AlertCircle,
  History,
  Layers,
  ShieldCheck,
  PackageCheck,
  PackageOpen,
  CircleDot,
  ArrowRight,
} from "lucide-react";

type PipelineStage =
  | "Order Received"
  | "Preparing"
  | "Packaging"
  | "Quality Check"
  | "Ready for Dispatch"
  | "Dispatched";

const PIPELINE_STAGES: PipelineStage[] = [
  "Order Received",
  "Preparing",
  "Packaging",
  "Quality Check",
  "Ready for Dispatch",
  "Dispatched",
];

const STAGE_COLORS: Record<PipelineStage, string> = {
  "Order Received": "bg-blue-100 text-blue-700 border-blue-200",
  Preparing: "bg-amber-100 text-amber-700 border-amber-200",
  Packaging: "bg-violet-100 text-violet-700 border-violet-200",
  "Quality Check": "bg-orange-100 text-orange-700 border-orange-200",
  "Ready for Dispatch": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Dispatched: "bg-gray-100 text-gray-600 border-gray-200",
};

const STAGE_ICONS: Record<PipelineStage, React.ReactNode> = {
  "Order Received": <CircleDot className="w-4 h-4" />,
  Preparing: <Clock className="w-4 h-4" />,
  Packaging: <PackageOpen className="w-4 h-4" />,
  "Quality Check": <ShieldCheck className="w-4 h-4" />,
  "Ready for Dispatch": <PackageCheck className="w-4 h-4" />,
  Dispatched: <Truck className="w-4 h-4" />,
};

type PackagingSize = "Small" | "Medium" | "Large";

interface PipelineOrder {
  id: string;
  orderNumber: string;
  itemsCount: number;
  packagingType: PackagingSize;
  assignedTo: string;
  stage: PipelineStage;
  timeInStageMin: number;
  batchGroup: string | null;
}

interface PackagingMaterial {
  id: string;
  name: string;
  stock: number;
  unit: string;
  lowThreshold: number;
}

interface PackagingTemplate {
  size: PackagingSize;
  containers: number;
  bags: number;
  seals: number;
  labels: number;
  description: string;
}

interface QualityCheckItem {
  id: string;
  label: string;
  checked: boolean;
}

interface DispatchLog {
  id: string;
  orderNumber: string;
  dispatchedAt: string;
  partner: string;
  itemsCount: number;
}

const STAFF = ["Hari B.", "Suman T.", "Rita G.", "Binod K.", "Anita C."];


const PACKAGING_TEMPLATES: PackagingTemplate[] = [
  {
    size: "Small",
    containers: 1,
    bags: 1,
    seals: 1,
    labels: 1,
    description: "1-2 items, single meal",
  },
  {
    size: "Medium",
    containers: 2,
    bags: 1,
    seals: 2,
    labels: 1,
    description: "3-5 items, couple meal or combo",
  },
  {
    size: "Large",
    containers: 4,
    bags: 2,
    seals: 4,
    labels: 2,
    description: "6+ items, family or party order",
  },
];

export default function PackageTrackingTab() {
  const [orders, setOrders] = useState<PipelineOrder[]>([]);
  const [materials, setMaterials] =
    useState<PackagingMaterial[]>([]);
  const [qcChecklist, setQcChecklist] =
    useState<QualityCheckItem[]>([]);
  const [dispatchLog, setDispatchLog] =
    useState<DispatchLog[]>([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<
    PipelineStage | "All"
  >("All");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState<string[]>([]);

  const advanceStage = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const currentIdx = PIPELINE_STAGES.indexOf(o.stage);
        if (currentIdx >= PIPELINE_STAGES.length - 1) return o;
        const nextStage = PIPELINE_STAGES[currentIdx + 1];
        if (nextStage === "Dispatched") {
          setDispatchLog((logs) => [
            {
              id: Date.now().toString(),
              orderNumber: o.orderNumber,
              dispatchedAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              partner: "Assigned partner",
              itemsCount: o.itemsCount,
            },
            ...logs,
          ]);
        }
        return { ...o, stage: nextStage, timeInStageMin: 0 };
      })
    );
  };

  const toggleQcItem = (id: string) => {
    setQcChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const resetQc = () => {
    setQcChecklist((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const toggleBatchSelect = (orderId: string) => {
    setSelectedForBatch((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const createBatch = () => {
    if (selectedForBatch.length < 2) return;
    const batchName = `Batch-${String.fromCharCode(
      65 + Math.floor(Math.random() * 26)
    )}${Math.floor(Math.random() * 9) + 1}`;
    setOrders((prev) =>
      prev.map((o) =>
        selectedForBatch.includes(o.id)
          ? { ...o, batchGroup: batchName }
          : o
      )
    );
    setSelectedForBatch([]);
    setBatchMode(false);
  };

  const filteredOrders =
    selectedStageFilter === "All"
      ? orders
      : orders.filter((o) => o.stage === selectedStageFilter);

  const qcProgress = qcChecklist.filter((i) => i.checked).length;
  const qcTotal = qcChecklist.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Package Tracking
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Order packaging pipeline and dispatch management
          </p>
        </div>
        <button
          onClick={() => {
            setBatchMode(!batchMode);
            setSelectedForBatch([]);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors shadow-sm ${
            batchMode
              ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          {batchMode ? "Cancel Batch" : "Batch Mode"}
        </button>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Pipeline Overview
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = orders.filter((o) => o.stage === stage).length;
            return (
              <div key={stage} className="flex items-center">
                <button
                  onClick={() =>
                    setSelectedStageFilter(
                      selectedStageFilter === stage ? "All" : stage
                    )
                  }
                  className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[100px] transition-colors border ${
                    selectedStageFilter === stage
                      ? STAGE_COLORS[stage]
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-1">{STAGE_ICONS[stage]}</div>
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {stage}
                  </span>
                  <span className="text-lg font-bold mt-0.5">{count}</span>
                </button>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
        {selectedStageFilter !== "All" && (
          <button
            onClick={() => setSelectedStageFilter("All")}
            className="mt-2 text-xs text-violet-600 hover:underline"
          >
            Show all stages
          </button>
        )}
      </div>

      {/* Batch mode bar */}
      <AnimatePresence>
        {batchMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-600" />
                <span className="text-sm text-violet-700">
                  Select orders to group into a delivery batch ({selectedForBatch.length} selected)
                </span>
              </div>
              <button
                onClick={createBatch}
                disabled={selectedForBatch.length < 2}
                className="px-4 py-1.5 text-sm bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Batch
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-white rounded-xl shadow-sm border p-4 ${
                order.stage === "Dispatched"
                  ? "border-gray-100 opacity-60"
                  : "border-gray-200"
              } ${
                batchMode && selectedForBatch.includes(order.id)
                  ? "ring-2 ring-violet-500"
                  : ""
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Batch checkbox */}
                {batchMode && order.stage !== "Dispatched" && (
                  <input
                    type="checkbox"
                    checked={selectedForBatch.includes(order.id)}
                    onChange={() => toggleBatchSelect(order.id)}
                    className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 accent-violet-600"
                  />
                )}

                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        STAGE_COLORS[order.stage]
                      }`}
                    >
                      {STAGE_ICONS[order.stage]}
                      {order.stage}
                    </span>
                    {order.batchGroup && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                        <Layers className="w-2.5 h-2.5" />
                        {order.batchGroup}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Box className="w-3 h-3" />
                      {order.itemsCount} items
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {order.packagingType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {order.assignedTo}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {order.timeInStageMin}m in stage
                    </span>
                  </div>
                </div>

                {/* Advance button */}
                {order.stage !== "Dispatched" && (
                  <button
                    onClick={() => advanceStage(order.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shrink-0"
                  >
                    Next
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom Grid: Materials, Templates, QC, Dispatch Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Packaging Materials Inventory */}
        <motion.div
          layout
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Box className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              Packaging Materials
            </h3>
          </div>
          <div className="space-y-2">
            {materials.map((mat) => {
              const isLow = mat.stock <= mat.lowThreshold;
              return (
                <div
                  key={mat.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isLow
                      ? "border-red-200 bg-red-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isLow && (
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {mat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setMaterials((prev) =>
                            prev.map((m) =>
                              m.id === mat.id
                                ? { ...m, stock: Math.max(0, m.stock - 10) }
                                : m
                            )
                          )
                        }
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold transition-colors"
                      >
                        -
                      </button>
                      <span
                        className={`text-sm font-bold min-w-[40px] text-center ${
                          isLow ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {mat.stock}
                      </span>
                      <button
                        onClick={() =>
                          setMaterials((prev) =>
                            prev.map((m) =>
                              m.id === mat.id
                                ? { ...m, stock: m.stock + 10 }
                                : m
                            )
                          )
                        }
                        className="w-6 h-6 flex items-center justify-center rounded bg-violet-200 hover:bg-violet-300 text-violet-700 text-xs font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-gray-400 w-10">
                      {mat.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Packaging Templates */}
        <motion.div
          layout
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Tag className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              Packaging Templates
            </h3>
          </div>
          <div className="space-y-3">
            {PACKAGING_TEMPLATES.map((tpl) => (
              <div
                key={tpl.size}
                className="p-4 bg-violet-50/50 rounded-lg border border-violet-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-violet-700">
                    {tpl.size}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {tpl.description}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {tpl.containers}
                    </p>
                    <p className="text-[10px] text-gray-500">Containers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {tpl.bags}
                    </p>
                    <p className="text-[10px] text-gray-500">Bags</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {tpl.seals}
                    </p>
                    <p className="text-[10px] text-gray-500">Seals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {tpl.labels}
                    </p>
                    <p className="text-[10px] text-gray-500">Labels</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quality Check Checklist */}
        <motion.div
          layout
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Quality Check
                </h3>
                <p className="text-xs text-gray-500">
                  {qcProgress}/{qcTotal} completed
                </p>
              </div>
            </div>
            <button
              onClick={resetQc}
              className="text-xs text-violet-600 hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-4">
            <motion.div
              animate={{
                width: `${(qcProgress / qcTotal) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
              className={`h-full rounded-full ${
                qcProgress === qcTotal ? "bg-emerald-500" : "bg-violet-500"
              }`}
            />
          </div>

          <div className="space-y-2">
            {qcChecklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleQcItem(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  item.checked
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    item.checked
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-gray-300"
                  }`}
                >
                  {item.checked && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    item.checked
                      ? "text-emerald-700 line-through"
                      : "text-gray-700"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {qcProgress === qcTotal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-emerald-100 rounded-lg text-center"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-emerald-700">
                Quality check passed!
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Dispatch Log */}
        <motion.div
          layout
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <History className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Dispatch Log
              </h3>
              <p className="text-xs text-gray-500">
                Recently dispatched orders
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {dispatchLog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No dispatched orders yet
              </p>
            ) : (
              dispatchLog.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <Truck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.itemsCount} items &middot; {log.partner}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {log.dispatchedAt}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
