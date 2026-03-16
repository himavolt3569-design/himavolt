"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, X, Loader2, CreditCard, Banknote } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface GetBillButtonProps {
  total: number;
  itemCount: number;
  paymentMethod?: string;
  onGetBill: () => Promise<unknown>;
  currency?: string;
}

export default function GetBillButton({
  total,
  itemCount,
  paymentMethod,
  onGetBill,
  currency = "NPR",
}: GetBillButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleGetBill = async () => {
    setLoading(true);
    try {
      await onGetBill();
      setDone(true);
      setTimeout(() => {
        setShowModal(false);
        setDone(false);
      }, 2000);
    } catch {
      // error handled upstream
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setShowModal(true)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/30 cursor-pointer md:bottom-6"
      >
        <Receipt className="h-4 w-4" />
        Get Bill
      </motion.button>

      {/* Bill summary modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowModal(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600" />
                  <h3 className="text-base font-bold text-gray-900">Get Bill</h3>
                </div>
                {!loading && (
                  <button
                    onClick={() => setShowModal(false)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4">
                {done ? (
                  <div className="text-center py-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100"
                    >
                      <Receipt className="h-6 w-6 text-green-600" />
                    </motion.div>
                    <p className="font-bold text-gray-900">Bill requested!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {paymentMethod === "CASH"
                        ? "Please proceed to the counter for payment."
                        : "Your payment has been recorded. Thank you!"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl bg-gray-50 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Items</span>
                        <span className="font-medium text-gray-900">{itemCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Payment</span>
                        <span className="flex items-center gap-1 font-medium text-gray-900">
                          {paymentMethod === "CASH" ? (
                            <Banknote className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          {paymentMethod || "CASH"}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-green-700 text-lg">
                          {formatPrice(total, currency)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      This will end your table session. All orders will be finalized.
                    </p>

                    <button
                      onClick={handleGetBill}
                      disabled={loading}
                      className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                      {loading ? "Processing..." : "Confirm & Get Bill"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
