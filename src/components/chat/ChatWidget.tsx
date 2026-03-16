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
  ChevronDown,
  ShoppingBag,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { playSound } from "@/lib/sounds";

interface ChatMessage {
  id: string;
  content: string;
  sender: "CUSTOMER" | "KITCHEN" | "BILLING";
  senderName: string | null;
  createdAt: string;
}

interface OrderSummaryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderSummary {
  orderNo: string;
  status: string;
  items: OrderSummaryItem[];
  total: number;
}

interface ChatWidgetProps {
  chatRoomId?: string;
  orderId?: string;
  restaurantId: string;
  tableNo?: string | number | null;
  roomNo?: string | null;
  senderRole: "CUSTOMER" | "KITCHEN" | "BILLING";
  senderName?: string;
  userId?: string;
  compact?: boolean;
}

const SENDER_CONFIG = {
  CUSTOMER: { label: "You", icon: User, color: "bg-[#FF9933]" },
  KITCHEN: { label: "Kitchen", icon: ChefHat, color: "bg-[#0A4D3C]" },
  BILLING: { label: "Billing", icon: Receipt, color: "bg-blue-500" },
};

export default function ChatWidget({
  chatRoomId,
  orderId,
  restaurantId,
  tableNo,
  roomNo,
  senderRole,
  senderName,
  userId,
  compact = false,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [orderExpanded, setOrderExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch order summary when orderId is available
  useEffect(() => {
    if (!orderId || !restaurantId) return;
    let cancelled = false;

    (async () => {
      try {
        const order = await apiFetch<{
          orderNo: string;
          status: string;
          total: number;
          items: OrderSummaryItem[];
        }>(`/api/restaurants/${restaurantId}/orders/${orderId}`);
        if (!cancelled && order?.items?.length > 0) {
          setOrderSummary({
            orderNo: order.orderNo,
            status: order.status,
            items: order.items,
            total: order.total,
          });
        }
      } catch {
        // silent — chat works without order summary
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, restaurantId]);

  const initRoom = useCallback(async () => {
    try {
      // Direct room ID provided (e.g. staff opening from dashboard)
      if (chatRoomId) {
        setRoomId(chatRoomId);
        return chatRoomId;
      }

      // Order-based chat
      if (orderId) {
        const room = await apiFetch<{ id: string } | null>(
          `/api/chat?orderId=${orderId}`
        );
        if (room?.id) {
          setRoomId(room.id);
          return room.id;
        }

        const newRoom = await apiFetch<{ id: string }>("/api/chat", {
          method: "POST",
          body: { orderId, restaurantId },
        });
        setRoomId(newRoom.id);
        return newRoom.id;
      }

      // Pre-order chat (table/room scan) — uses broadcast channel
      if (tableNo || roomNo) {
        const newRoom = await apiFetch<{ id: string }>("/api/chat", {
          method: "POST",
          body: {
            restaurantId,
            ...(tableNo ? { tableNo: Number(tableNo) } : {}),
            ...(roomNo ? { roomNo } : {}),
          },
        });
        setRoomId(newRoom.id);
        return newRoom.id;
      }

      return null;
    } catch {
      return null;
    }
  }, [chatRoomId, orderId, restaurantId, tableNo, roomNo]);

  const loadMessages = useCallback(
    async (rid: string) => {
      setLoading(true);
      try {
        const msgs = await apiFetch<ChatMessage[]>(
          `/api/chat/${rid}/messages`
        );
        setMessages(msgs);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const connectSSE = useCallback(
    (rid: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const lastId =
        messages.length > 0 ? messages[messages.length - 1].id : "";
      const es = new EventSource(
        `/api/chat/${rid}/stream${lastId ? `?lastId=${lastId}` : ""}`
      );

      es.onmessage = (event) => {
        try {
          const newMessages: ChatMessage[] = JSON.parse(event.data);
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const unique = newMessages.filter((m) => !existingIds.has(m.id));
            if (unique.length === 0) return prev;

            // Play sound for messages from others
            const hasOthers = unique.some((m) => m.sender !== senderRole);
            if (hasOthers) playSound("newMessage");

            if (!isOpen) {
              const othersCount = unique.filter(
                (m) => m.sender !== senderRole
              ).length;
              if (othersCount > 0) setUnread((u) => u + othersCount);
            }

            return [...prev, ...unique];
          });
          scrollToBottom();
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        setTimeout(() => {
          if (!eventSourceRef.current || eventSourceRef.current === es) {
            connectSSE(rid);
          }
        }, 5000);
      };

      eventSourceRef.current = es;
    },
    [messages, isOpen, senderRole, scrollToBottom]
  );

  useEffect(() => {
    let rid: string | null = null;
    initRoom().then((r) => {
      if (r) {
        rid = r;
        loadMessages(r);
        connectSSE(r);
      }
    });

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || !roomId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic: show immediately
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      content: text,
      sender: senderRole,
      senderName: senderName || null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const msg = await apiFetch<ChatMessage>(
        `/api/chat/${roomId}/messages`,
        {
          method: "POST",
          body: {
            content: text,
            sender: senderRole,
            senderName: senderName || null,
            userId: userId || null,
          },
        }
      );
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? msg : m))
      );
    } catch {
      // Remove optimistic and restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (compact) {
    return (
      <CompactChat
        messages={messages}
        input={input}
        setInput={setInput}
        sending={sending}
        sendMessage={sendMessage}
        handleKeyDown={handleKeyDown}
        senderRole={senderRole}
        loading={loading}
        messagesEndRef={messagesEndRef}
        orderSummary={orderSummary}
        orderExpanded={orderExpanded}
        setOrderExpanded={setOrderExpanded}
      />
    );
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-80 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A4D3C] text-white shadow-xl hover:bg-[#083a2d] transition-colors md:bottom-6"
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {unread}
          </motion.span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-80 bg-black/30 md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-90 flex flex-col bg-white rounded-t-2xl shadow-2xl max-h-[75vh] md:bottom-20 md:right-4 md:left-auto md:w-[380px] md:rounded-2xl md:max-h-[500px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#0A4D3C]" />
                  <h3 className="text-sm font-bold text-[#1F2A2A]">
                    Live Chat
                  </h3>
                  {senderName && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[12px] font-black text-amber-800">
                      {senderName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Order Items Card */}
              {orderSummary && (
                <OrderItemsCard
                  summary={orderSummary}
                  expanded={orderExpanded}
                  onToggle={() => setOrderExpanded(!orderExpanded)}
                />
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-50">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageCircle className="h-8 w-8 text-gray-200 mb-2" />
                    <p className="text-xs font-bold text-gray-400">
                      No messages yet
                    </p>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMine={msg.sender === senderRole}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/20"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A4D3C] text-white hover:bg-[#083a2d] transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function OrderItemsCard({
  summary,
  expanded,
  onToggle,
}: {
  summary: OrderSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalItems = summary.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="shrink-0 bg-amber-50 border-b border-amber-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-3.5 w-3.5 text-amber-700" />
          <span className="text-xs font-bold text-amber-800">
            Order #{summary.orderNo}
          </span>
          <span className="text-[10px] text-amber-600">
            {totalItems} item{totalItems !== 1 && "s"}
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-amber-600" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 max-h-40 overflow-y-auto">
              <div className="space-y-1.5">
                {summary.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-amber-800">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-amber-700 font-medium">
                      Rs. {item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800">
                  Total
                </span>
                <span className="text-xs font-extrabold text-amber-900">
                  Rs. {summary.total}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
}: {
  message: ChatMessage;
  isMine: boolean;
}) {
  const config = SENDER_CONFIG[message.sender];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.color}`}
      >
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
          isMine
            ? "bg-[#0A4D3C] text-white rounded-br-md"
            : "bg-gray-100 text-[#1F2A2A] rounded-bl-md"
        }`}
      >
        {!isMine && message.senderName && (
          <p
            className={`text-[10px] font-bold mb-0.5 ${
              isMine ? "text-white/70" : "text-gray-400"
            }`}
          >
            {message.senderName}
          </p>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <p
          className={`text-[10px] mt-1 ${
            isMine ? "text-white/50" : "text-gray-400"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}

function CompactChat({
  messages,
  input,
  setInput,
  sending,
  sendMessage,
  handleKeyDown,
  senderRole,
  loading,
  messagesEndRef,
  orderSummary,
  orderExpanded,
  setOrderExpanded,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  sendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  senderRole: string;
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  orderSummary: OrderSummary | null;
  orderExpanded: boolean;
  setOrderExpanded: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Order Items Card */}
      {orderSummary && (
        <OrderItemsCard
          summary={orderSummary}
          expanded={orderExpanded}
          onToggle={() => setOrderExpanded(!orderExpanded)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-xs font-bold text-gray-400">
              No messages yet
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={`${msg.id}-${idx}`}
              message={msg}
              isMine={msg.sender === senderRole}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-[#1F2A2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]/20"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A4D3C] text-white hover:bg-[#083a2d] transition-colors disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
