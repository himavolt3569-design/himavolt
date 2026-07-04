"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Laptop, MonitorSmartphone, Printer, ArrowRight, X, Building2, Smartphone, MapPin, MessageSquare, ChevronLeft, Send } from "lucide-react";
import { formatPrice } from "@/lib/currency";

const DEFAULT_HARDWARE = [
  { id: "HW-8921", name: "Premium POS Terminal", description: "15-inch capacitive touch screen with built-in thermal printer.", price: 45000, iconName: "Laptop" },
  { id: "HW-8922", name: "Kitchen Display System", description: "Rugged 21-inch display designed for high-heat and busy kitchen environments.", price: 32000, iconName: "MonitorSmartphone" },
  { id: "HW-8923", name: "Thermal Receipt Printer", description: "High-speed 80mm thermal receipt printer with auto-cutter functionality.", price: 8500, iconName: "Printer" },
];

const ICONS: Record<string, any> = { Laptop, MonitorSmartphone, Printer };

export default function HardwareStoreCarousel() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalView, setModalView] = useState<"details" | "address" | "payment" | "success" | "message">("details");
  const [hardwareItems, setHardwareItems] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [messageForm, setMessageForm] = useState({ name: "", message: "" });
  const [replies, setReplies] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("himalhub_hardware");
    if (saved) {
      setHardwareItems(JSON.parse(saved));
    } else {
      setHardwareItems(DEFAULT_HARDWARE);
    }
  }, []);

  useEffect(() => {
    // Poll for messages/replies
    const interval = setInterval(() => {
      const msgs = JSON.parse(localStorage.getItem("himalhub_hw_messages") || "[]");
      setReplies(msgs);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = () => {
    if (!messageForm.name || !messageForm.message) return;
    const currentMsgs = JSON.parse(localStorage.getItem("himalhub_hw_messages") || "[]");
    const newMsg = {
      id: Math.random().toString(36).substring(7),
      productId: selectedItem.id,
      productName: selectedItem.name,
      senderName: messageForm.name,
      text: messageForm.message,
      reply: null,
      date: new Date().toISOString()
    };
    localStorage.setItem("himalhub_hw_messages", JSON.stringify([newMsg, ...currentMsgs]));
    setMessageForm({ name: "", message: "" });
    setModalView("details");
    alert("Message sent successfully!");
  };

  if (!isMounted) return null;

  return (
    <section className="py-20 relative overflow-hidden bg-white">
      <div className="max-w-400 mx-auto px-4 md:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-(--accent) text-[10px] font-bold uppercase tracking-[0.2em] mb-3 border border-orange-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-(--accent) animate-pulse" />
              HimaVolt Hardware
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Enterprise equipment, delivered.
            </h2>
          </div>
          <button 
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 text-(--accent) text-sm font-bold hover:text-(--accent-hover) transition-colors"
          >
            {showAll ? "Hide full catalog" : "View All Hardware"} <ArrowRight className={`h-4 w-4 transition-transform ${showAll ? '-rotate-90' : ''}`} />
          </button>
        </div>

        {/* ── Hardware Display ── */}
        <div className={showAll ? "grid gap-6 grid-cols-[repeat(auto-fill,240px)] justify-start" : "flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide"}>
          {hardwareItems.map((item, i) => {
            const IconComp = ICONS[item.iconName] || Laptop;
            return (
              <motion.div
                key={item.id}
                onClick={() => { setSelectedItem(item); setModalView("details"); }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`w-60 shrink-0 ${showAll ? '' : 'snap-start'} cursor-pointer bg-white rounded-4xl p-4 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-gray-200 hover:-translate-y-1 transition-all flex flex-col group`}
              >
                <div className="w-full aspect-square bg-gray-50 rounded-2xl mb-4 flex items-center justify-center p-4 overflow-hidden relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <IconComp className="h-12 w-12 text-gray-300 group-hover:text-(--accent) transition-colors group-hover:scale-110 duration-500" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-2xl" />
                </div>
                <div className="px-2 text-center pb-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{item.name}</h3>
                  <p className="text-[10px] font-semibold text-(--accent) mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View Details &rarr;</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="fixed inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-xl bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {modalView === "details" ? "Product Details" : 
                     modalView === "message" ? "Send Inquiry" : 
                     "Secure Checkout"}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">{selectedItem.name}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  
                  {modalView === "details" && (
                    <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="h-32 w-full max-w-50 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center shadow-inner overflow-hidden border border-gray-100 p-2">
                        {selectedItem.imageUrl ? (
                          <img src={selectedItem.imageUrl} alt={selectedItem.name} className="h-full w-full object-contain" />
                        ) : (
                          <Laptop className="h-10 w-10 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">{selectedItem.name}</h4>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">{selectedItem.description}</p>
                        
                        <div className="flex items-center justify-between py-4 border-y border-gray-100 mb-6">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">One-time price</p>
                            <p className="text-2xl font-black text-slate-900">{formatPrice(selectedItem.price, "NPR")}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setModalView("message")}
                            className="w-full py-3.5 rounded-xl text-sm font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" /> Ask a Question
                          </button>
                          <button 
                            onClick={() => setModalView("address")}
                            className="w-full py-3.5 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                          >
                            Buy Now <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Display replies if any exist for this user/product */}
                        {replies.filter(r => r.productId === selectedItem.id && r.reply).map((reply, idx) => (
                          <div key={idx} className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-700 mb-1">Reply to {reply.senderName}:</p>
                            <p className="text-sm font-medium text-emerald-900">{reply.reply}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {modalView === "message" && (
                    <motion.div key="message" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                      <button onClick={() => setModalView("details")} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs font-bold transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" /> Back to details
                      </button>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-2">Your Name</label>
                          <input type="text" value={messageForm.name} onChange={e => setMessageForm({...messageForm, name: e.target.value})} placeholder="e.g. John Doe" className="w-full px-5 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-(--accent)/10 text-sm text-slate-900 font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-2">Message</label>
                          <textarea rows={4} value={messageForm.message} onChange={e => setMessageForm({...messageForm, message: e.target.value})} placeholder="Ask us anything about this product..." className="w-full px-5 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-(--accent)/10 text-sm text-slate-900 font-semibold resize-none" />
                        </div>
                      </div>
                      <button 
                        onClick={handleSendMessage}
                        className="w-full py-3.5 rounded-xl text-sm font-bold bg-(--accent) text-white shadow-lg shadow-(--accent)/20 hover:bg-(--accent-hover) transition-all flex items-center justify-center gap-2"
                      >
                        Send Message <Send className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                  
                  {modalView === "address" && (
                    <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <button onClick={() => setModalView("details")} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs font-bold transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" /> Back to details
                      </button>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-6 w-6 rounded-full bg-(--accent) text-white flex items-center justify-center font-bold text-xs">1</div>
                        <h4 className="text-base font-bold text-slate-900">Delivery Address</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-2">Business Name</label>
                          <input type="text" placeholder="e.g. Kathmandu Cafe" className="w-full px-5 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-(--accent)/10 text-sm text-slate-900 font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-2">Full Address</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Street, City, Landmark" className="w-full pl-10 pr-5 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-(--accent)/10 text-sm text-slate-900 font-semibold" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-2">Contact Name</label>
                            <input type="text" placeholder="John Doe" className="w-full px-5 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-(--accent)/10 text-sm text-slate-900 font-semibold" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-2">Phone</label>
                            <input type="tel" placeholder="+977" className="w-full px-5 py-3 bg-gray-50 rounded-xl border-none focus:ring-4 focus:ring-(--accent)/10 text-sm text-slate-900 font-semibold" />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setModalView("payment")}
                        className="w-full mt-8 py-3.5 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        Continue to Payment <ArrowRight className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}

                  {modalView === "payment" && (
                    <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-6 w-6 rounded-full bg-(--accent) text-white flex items-center justify-center font-bold text-xs">2</div>
                        <h4 className="text-base font-bold text-slate-900">Select Gateway</h4>
                      </div>

                      <div className="bg-gray-50 p-5 rounded-2xl mb-8 border border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-500">Total to pay</span>
                        <span className="text-xl font-black text-slate-900">{formatPrice(selectedItem.price, "NPR")}</span>
                      </div>

                      <div className="space-y-4">
                        <button 
                          onClick={() => setModalView("success")}
                          className="w-full p-5 rounded-xl border-2 border-gray-100 hover:border-red-500 hover:bg-red-50 transition-all flex items-center gap-4 text-left group"
                        >
                          <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-red-700">IME Pay / Bank</p>
                            <p className="text-[10px] font-semibold text-slate-400">Direct integration</p>
                          </div>
                        </button>
                        
                        <button 
                          onClick={() => setModalView("success")}
                          className="w-full p-5 rounded-xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all flex items-center gap-4 text-left group"
                        >
                          <div className="h-10 w-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                            <Smartphone className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-green-700">eSewa</p>
                            <p className="text-[10px] font-semibold text-slate-400">Digital Wallet</p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {modalView === "success" && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                      <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mx-auto mb-6">
                        <MonitorSmartphone className="h-8 w-8" />
                      </div>
                      <h4 className="text-2xl font-bold text-slate-900 mb-2">Order Placed!</h4>
                      <p className="text-slate-500 text-sm font-medium mb-8 max-w-sm mx-auto">
                        Your hardware request has been sent to our dispatch center. You will receive an email confirmation shortly.
                      </p>
                      <button 
                        onClick={() => setSelectedItem(null)}
                        className="px-8 py-3.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
                      >
                        Return to Store
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
