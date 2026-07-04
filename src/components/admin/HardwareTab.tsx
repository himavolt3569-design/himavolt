"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MoreVertical,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Tag,
  MonitorSmartphone,
  Printer,
  Laptop,
  MessageSquare,
  Send,
  CheckCircle2
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

const DEFAULT_HARDWARE = [
  { id: "HW-8921", name: "Premium POS Terminal", description: "15-inch capacitive touch screen with built-in thermal printer.", type: "Terminal", price: 45000, stock: 12, iconName: "Laptop" },
  { id: "HW-8922", name: "Kitchen Display System (KDS)", description: "Rugged 21-inch display for high-heat kitchen environments.", type: "Screen", price: 32000, stock: 8, iconName: "MonitorSmartphone" },
  { id: "HW-8923", name: "Thermal Receipt Printer", description: "High-speed 80mm thermal receipt printer with auto-cutter.", type: "Printer", price: 8500, stock: 45, iconName: "Printer" },
];

const ICONS: Record<string, any> = { Laptop, MonitorSmartphone, Printer };

export default function HardwareTab() {
  const [activeTab, setActiveTab] = useState<"inventory" | "messages">("inventory");
  const [hardwareList, setHardwareList] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("himalhub_hardware");
    if (saved) {
      setHardwareList(JSON.parse(saved));
    } else {
      setHardwareList(DEFAULT_HARDWARE);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("himalhub_hardware", JSON.stringify(hardwareList));
    }
  }, [hardwareList, isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = JSON.parse(localStorage.getItem("himalhub_hw_messages") || "[]");
      setMessages(msgs);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSendReply = (msgId: string) => {
    if (!replyText) return;
    const msgs = [...messages];
    const idx = msgs.findIndex(m => m.id === msgId);
    if (idx > -1) {
      msgs[idx].reply = replyText;
      localStorage.setItem("himalhub_hw_messages", JSON.stringify(msgs));
      setMessages(msgs);
    }
    setReplyingTo(null);
    setReplyText("");
  };

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", description: "", price: "", stock: "", imageUrl: "" });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", price: "", stock: "", imageUrl: "" });
    setShowModal(true);
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({ name: item.name, description: item.description, price: String(item.price), stock: String(item.stock), imageUrl: item.imageUrl || "" });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setHardwareList(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = () => {
    if (!formData.name || !formData.price || !formData.stock) return;

    if (editingId) {
      setHardwareList(prev => prev.map(item => 
        item.id === editingId ? { ...item, ...formData, price: Number(formData.price), stock: Number(formData.stock) } : item
      ));
    } else {
      const newItem = {
        id: `HW-${Math.floor(Math.random() * 10000)}`,
        name: formData.name,
        description: formData.description,
        type: "Terminal",
        price: Number(formData.price),
        stock: Number(formData.stock),
        iconName: "Laptop",
        imageUrl: formData.imageUrl
      };
      setHardwareList(prev => [newItem, ...prev]);
    }
    setShowModal(false);
  };

  const filteredList = hardwareList.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* ── Top Action Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div className="flex bg-gray-50 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab("inventory")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'inventory' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Inventory Grid
          </button>
          <button 
            onClick={() => setActiveTab("messages")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'messages' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Customer Inquiries
            {messages.filter(m => !m.reply).length > 0 && (
              <span className="h-5 w-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[10px]">
                {messages.filter(m => !m.reply).length}
              </span>
            )}
          </button>
        </div>
        
        {activeTab === "inventory" && (
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10 transition-all placeholder:text-gray-400"
              />
            </div>
            <button 
              onClick={handleOpenAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Content View ── */}
      {activeTab === "inventory" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredList.map((item, idx) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-20 w-20 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-[var(--accent)] shadow-inner overflow-hidden border-2 border-white">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      (() => {
                        const IconComp = ICONS[item.iconName] || Laptop;
                        return <IconComp className="h-8 w-8" />;
                      })()
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.id}</span>
                    <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-full font-bold">{item.type}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-xl leading-tight mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(item.price, "NPR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Stock</p>
                    <div className="flex items-center justify-end gap-2">
                      <div className={`h-2 w-2 rounded-full ${item.stock > 10 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                      <p className="text-lg font-bold text-gray-900">{item.stock} Units</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredList.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 font-bold">
              No hardware found. Add a new product to get started!
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {messages.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-bold bg-white rounded-[2rem] border border-gray-100">
                No inquiries yet. When a customer sends a message, it will appear here.
              </div>
            ) : (
              messages.map(msg => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 md:items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-slate-900">{msg.senderName}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inquired about</span>
                      <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded-md">{msg.productName}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mb-4">"{msg.text}"</p>
                    <p className="text-xs font-semibold text-slate-400">{new Date(msg.date).toLocaleString()}</p>
                  </div>
                  
                  <div className="flex-1 max-w-md w-full bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    {msg.reply ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Replied</span>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{msg.reply}</p>
                      </div>
                    ) : replyingTo === msg.id ? (
                      <div className="flex flex-col gap-3">
                        <textarea 
                          rows={2}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your response..."
                          className="w-full p-3 rounded-xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-sm font-medium resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setReplyingTo(null)} className="text-xs font-bold text-slate-500 hover:text-slate-900 px-4 py-2">Cancel</button>
                          <button onClick={() => handleSendReply(msg.id)} className="text-xs font-bold bg-[var(--accent)] text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            Send Reply <Send className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setReplyingTo(msg.id)}
                        className="w-full py-3 rounded-xl border border-gray-200 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" /> Write a reply
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Add/Edit Product Modal ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{editingId ? "Edit Product" : "Add Hardware Product"}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">This will instantly update the public storefront.</p>
                </div>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="relative w-full h-48 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer group overflow-hidden">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Upload preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-bold text-gray-600 mb-1">Click to upload product image</p>
                      <p className="text-xs font-medium">PNG, JPG up to 5MB (Square ratio recommended)</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Product Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Star Micronics Thermal Printer" 
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" 
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Description</label>
                    <textarea 
                      rows={3} 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed product specifications..." 
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold resize-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Price (NPR)</label>
                    <div className="relative">
                      <Tag className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input 
                        type="number" 
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                        placeholder="45000" 
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Stock Available</label>
                    <input 
                      type="number" 
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      placeholder="10" 
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-[var(--accent)]/10 text-gray-900 font-semibold" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4">
                <button onClick={() => setShowModal(false)} className="px-8 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button onClick={handleSave} className="px-8 py-4 rounded-2xl font-bold bg-[var(--accent)] text-white shadow-xl shadow-[var(--accent)]/20 hover:scale-[1.02] transition-all">
                  {editingId ? "Save Changes" : "Publish to Store"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
