"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  ChefHat,
  User,
  Receipt,
  Loader2,
  ArrowLeft,
  Megaphone,
  ShoppingBag,
} from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  senderName: string | null;
  createdAt: string;
}

interface ChatRoom {
  id: string;
  orderId: string;
  isActive: boolean;
  order: { orderNo: string; status: string; tableNo: number | null };
  messages: ChatMessage[];
}

interface GlobalChatButtonProps {
  restaurantId: string;
  staffRole: string;
  staffName: string;
}

async function staffFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

const SENDER_ICONS: Record<string, typeof User> = {
  CUSTOMER: User,
  KITCHEN: ChefHat,
  BILLING: Receipt,
  ADMIN: ShoppingBag,
  MANAGER: ShoppingBag,
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function GlobalChatButton({
  restaurantId,
  staffRole,
  staffName,
}: GlobalChatButtonProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"customers" | "broadcast">("broadcast");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [broadcastRoomId, setBroadcastRoomId] = useState<string | null>(null);
  const [broadcastMsgs, setBroadcastMsgs] = useState<ChatMessage[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [msg, setMsg] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const broadcastSseRef = useRef<EventSource | null>(null);
  const prevBroadcastCount = useRef(0);
  const prevRoomMsgCounts = useRef<Record<string, number>>({});

  const senderLabel =
    staffRole === "SUPER_ADMIN" || staffRole === "OWNER"
      ? "ADMIN"
      : ["CHEF", "WAITER"].includes(staffRole)
      ? "KITCHEN"
      : staffRole === "CASHIER"
      ? "BILLING"
      : (staffRole as string);

  const canBroadcast = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(staffRole);

  const loadRooms = useCallback(async () => {
    try {
      const data = await staffFetch(`/api/chat?restaurantId=${restaurantId}`);
      if (Array.isArray(data)) {
        // Count unread across all rooms
        const newUnread = data.reduce((acc: number, room: ChatRoom) => {
          const prev = prevRoomMsgCounts.current[room.id] ?? room.messages.length;
          const delta = Math.max(0, room.messages.length - prev);
          prevRoomMsgCounts.current[room.id] = room.messages.length;
          return acc + delta;
        }, 0);
        if (newUnread > 0 && !open) setUnreadCount((c) => c + newUnread);
        setRooms(data);
      }
    } catch { /* ignore */ }
  }, [restaurantId, open]);

  const connectBroadcastSSE = useCallback((roomId: string) => {
    broadcastSseRef.current?.close();
    const es = new EventSource(`/api/chat/${roomId}/stream`, { withCredentials: true });
    es.onmessage = (ev) => {
      try {
        const msg: ChatMessage = JSON.parse(ev.data);
        setBroadcastMsgs((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          if (!open) setUnreadCount((c) => c + 1);
          return [...prev, msg];
        });
        setTimeout(() => broadcastEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      es.close();
      setTimeout(() => connectBroadcastSSE(roomId), 4000);
    };
    broadcastSseRef.current = es;
  }, [open]);

  const connectRoomSSE = useCallback((roomId: string) => {
    sseRef.current?.close();
    const es = new EventSource(`/api/chat/${roomId}/stream`, { withCredentials: true });
    es.onmessage = (ev) => {
      try {
        const msg: ChatMessage = JSON.parse(ev.data);
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    sseRef.current = es;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const room = await staffFetch(`/api/chat?restaurantId=${restaurantId}&type=BROADCAST`);
        if (room?.id) {
          setBroadcastRoomId(room.id);
          const msgs = await staffFetch(`/api/chat/${room.id}/messages`);
          setBroadcastMsgs(msgs || []);
          prevBroadcastCount.current = (msgs || []).length;
          connectBroadcastSSE(room.id);
        }
      } catch { /* ignore */ }
    })();
    return () => broadcastSseRef.current?.close();
  }, [restaurantId, connectBroadcastSSE]);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 15000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  const openRoom = async (roomId: string) => {
    setActiveRoom(roomId);
    setLoading(true);
    try {
      const data = await staffFetch(`/api/chat/${roomId}/messages`);
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { /* ignore */ }
    finally { setLoading(false); }
    connectRoomSSE(roomId);
  };

  const closeRoom = () => {
    sseRef.current?.close();
    setActiveRoom(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!msg.trim() || !activeRoom) return;
    const text = msg.trim();
    setMsg("");
    try {
      await staffFetch(`/api/chat/${activeRoom}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, sender: senderLabel, senderName: staffName }),
      });
    } catch { setMsg(text); }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || !broadcastRoomId) return;
    const text = broadcastMsg.trim();
    setBroadcastMsg("");
    try {
      await staffFetch(`/api/chat/${broadcastRoomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, sender: senderLabel, senderName: staffName }),
      });
    } catch { setBroadcastMsg(text); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-700 text-white shadow-xl shadow-amber-700/30 hover:bg-amber-600 transition-all active:scale-95"
        aria-label="Open staff chat"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOpen(false); closeRoom(); }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                <div className="flex items-center gap-2">
                  {activeRoom ? (
                    <button onClick={closeRoom} className="mr-1 rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
                      <ArrowLeft className="h-4 w-4 text-gray-600" />
                    </button>
                  ) : null}
                  <MessageCircle className="h-5 w-5 text-amber-700" />
                  <h2 className="text-base font-bold text-gray-900">Staff Chat</h2>
                </div>
                <button
                  onClick={() => { setOpen(false); closeRoom(); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab switcher */}
              {!activeRoom && (
                <div className="flex border-b border-gray-100 px-4 pt-2 gap-4">
                  <button
                    onClick={() => setTab("broadcast")}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-all border-b-2 ${
                      tab === "broadcast"
                        ? "border-amber-600 text-amber-700"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    Broadcast
                  </button>
                  <button
                    onClick={() => setTab("customers")}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-all border-b-2 ${
                      tab === "customers"
                        ? "border-amber-600 text-amber-700"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Customers
                    {rooms.length > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">
                        {rooms.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Broadcast */}
                {!activeRoom && tab === "broadcast" && (
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {broadcastMsgs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300">
                          <Megaphone className="h-10 w-10 mb-2" />
                          <p className="text-xs font-medium">No broadcast messages yet</p>
                        </div>
                      ) : (
                        broadcastMsgs.map((m) => {
                          const Icon = SENDER_ICONS[m.sender] ?? User;
                          const isMe = m.senderName === staffName;
                          return (
                            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isMe ? "bg-amber-100" : "bg-gray-100"}`}>
                                <Icon className={`h-3.5 w-3.5 ${isMe ? "text-amber-700" : "text-gray-500"}`} />
                              </div>
                              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                                <p className={`text-[10px] font-semibold mb-0.5 ${isMe ? "text-right text-amber-700" : "text-gray-500"}`}>
                                  {m.senderName ?? m.sender}
                                </p>
                                <div className={`rounded-xl px-3 py-2 text-xs ${isMe ? "bg-amber-700 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                                  {m.content}
                                </div>
                                <p className="text-[9px] text-gray-400 mt-0.5">{formatTime(m.createdAt)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={broadcastEndRef} />
                    </div>
                    {canBroadcast && (
                      <div className="border-t border-gray-100 p-4 flex gap-2">
                        <input
                          value={broadcastMsg}
                          onChange={(e) => setBroadcastMsg(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendBroadcast()}
                          placeholder="Broadcast to all staff..."
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/50 transition-all"
                        />
                        <button
                          onClick={sendBroadcast}
                          disabled={!broadcastMsg.trim()}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer rooms list */}
                {!activeRoom && tab === "customers" && (
                  <div className="flex-1 overflow-y-auto">
                    {rooms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
                        <User className="h-10 w-10 mb-2" />
                        <p className="text-xs font-medium">No active customer chats</p>
                      </div>
                    ) : (
                      rooms.map((room) => {
                        const last = room.messages[room.messages.length - 1];
                        return (
                          <button
                            key={room.id}
                            onClick={() => openRoom(room.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 border-b border-gray-50 transition-colors text-left"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                              <ShoppingBag className="h-4 w-4 text-amber-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800">
                                Order #{room.order.orderNo}
                                {room.order.tableNo && ` · Table ${room.order.tableNo}`}
                              </p>
                              {last && (
                                <p className="text-[11px] text-gray-400 truncate">{last.content}</p>
                              )}
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              room.order.status === "PREPARING" ? "bg-amber-100 text-amber-700" :
                              room.order.status === "READY" ? "bg-green-100 text-green-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {room.order.status}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Active room conversation */}
                {activeRoom && (
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {loading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 py-12">
                          <MessageCircle className="h-10 w-10 mb-2" />
                          <p className="text-xs font-medium">No messages yet</p>
                        </div>
                      ) : (
                        messages.map((m) => {
                          const Icon = SENDER_ICONS[m.sender] ?? User;
                          const isMe = m.sender === senderLabel;
                          return (
                            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isMe ? "bg-amber-100" : "bg-gray-100"}`}>
                                <Icon className={`h-3.5 w-3.5 ${isMe ? "text-amber-700" : "text-gray-500"}`} />
                              </div>
                              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                                <p className={`text-[10px] font-semibold mb-0.5 ${isMe ? "text-right text-amber-700" : "text-gray-500"}`}>
                                  {m.senderName ?? m.sender}
                                </p>
                                <div className={`rounded-xl px-3 py-2 text-xs ${isMe ? "bg-amber-700 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                                  {m.content}
                                </div>
                                <p className="text-[9px] text-gray-400 mt-0.5">{formatTime(m.createdAt)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="border-t border-gray-100 p-4 flex gap-2">
                      <input
                        value={msg}
                        onChange={(e) => setMsg(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/50 transition-all"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!msg.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
