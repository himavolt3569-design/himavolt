"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ChefHat,
  Receipt,
  User,
  Loader2,
  ArrowLeft,
  Hash,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";
import ChatWidget from "@/components/chat/ChatWidget";

interface ChatRoomPreview {
  id: string;
  type: "CUSTOMER" | "BROADCAST" | "TABLE_CHAT";
  orderId: string | null;
  tableNo: number | null;
  roomNo: string | null;
  isActive: boolean;
  updatedAt: string;
  order: {
    orderNo: string;
    status: string;
    tableNo: number | null;
    user?: { name: string } | null;
  } | null;
  messages: {
    id: string;
    content: string;
    sender: string;
    senderName?: string | null;
    createdAt: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-gray-100 text-gray-600",
};

export default function ChatTab() {
  const { selectedRestaurant } = useRestaurant();
  const [rooms, setRooms] = useState<ChatRoomPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomPreview | null>(null);
  const [replyAs, setReplyAs] = useState<"KITCHEN" | "BILLING">("KITCHEN");

  const restaurantId = selectedRestaurant?.id;

  const fetchRooms = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const data = await apiFetch<ChatRoomPreview[]>(
        `/api/chat?restaurantId=${restaurantId}`
      );
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 8000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  if (loading && rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-400">Loading chats...</p>
      </div>
    );
  }

  if (selectedRoom) {
    const isBroadcast = selectedRoom.type === "BROADCAST" || selectedRoom.type === "TABLE_CHAT";
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedRoom(null); fetchRooms(); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-amber-950">
              {isBroadcast
                ? `Table ${selectedRoom.tableNo ?? selectedRoom.roomNo ?? ""} Chat`
                : `Chat — ${selectedRoom.order?.orderNo}`}
            </h2>
            <p className="text-[11px] text-gray-400">
              {isBroadcast
                ? "Pre-order messages from this table"
                : `${selectedRoom.order?.user?.name || "Guest"} ${selectedRoom.order?.tableNo ? `· Table ${selectedRoom.order.tableNo}` : ""}`}
            </p>
          </div>

          {/* Reply-as toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setReplyAs("KITCHEN")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                replyAs === "KITCHEN"
                  ? "bg-amber-700 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ChefHat className="h-3 w-3" />
              Kitchen
            </button>
            <button
              onClick={() => setReplyAs("BILLING")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                replyAs === "BILLING"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Receipt className="h-3 w-3" />
              Billing
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden h-[500px] flex flex-col">
          <ChatWidget
            chatRoomId={isBroadcast ? selectedRoom.id : undefined}
            orderId={selectedRoom.orderId ?? undefined}
            restaurantId={restaurantId!}
            senderRole={replyAs}
            senderName={replyAs === "KITCHEN" ? "Kitchen Team" : "Billing Desk"}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-amber-950">Chats</h2>
          <p className="text-sm text-gray-400">
            {rooms.length} active conversation{rooms.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <MessageCircle className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-400 mb-1">
            No active chats
          </p>
          <p className="text-xs text-gray-300">
            Chats will appear here when customers message you
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {rooms.map((room) => {
              const lastMsg = room.messages[0];
              const isBroadcast = room.type === "BROADCAST" || room.type === "TABLE_CHAT";
              const statusClass = room.order
                ? STATUS_COLORS[room.order.status] || STATUS_COLORS.PENDING
                : "";

              return (
                <motion.button
                  key={room.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => setSelectedRoom(room)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                    isBroadcast ? "bg-amber-100" : "bg-amber-50"
                  }`}>
                    {isBroadcast
                      ? <MessageCircle className="h-4 w-4 text-amber-700" />
                      : <User className="h-4 w-4 text-amber-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isBroadcast ? (
                        <>
                          <span className="text-sm font-bold text-amber-950">
                            Table {room.tableNo ?? room.roomNo ?? "?"} Chat
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            PRE-ORDER
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-amber-950">
                            {room.order?.user?.name || "Guest"}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                            <Hash className="h-2.5 w-2.5" />
                            {room.order?.orderNo}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
                            {room.order?.status}
                          </span>
                        </>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        <span className="font-semibold">
                          {lastMsg.senderName
                            ? `${lastMsg.senderName}: `
                            : lastMsg.sender === "CUSTOMER"
                              ? "Customer: "
                              : lastMsg.sender === "KITCHEN"
                                ? "Kitchen: "
                                : "Billing: "}
                        </span>
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {(room.tableNo || room.order?.tableNo) && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-800 ring-2 ring-amber-200/60">
                        {room.tableNo ?? room.order?.tableNo}
                      </span>
                    )}
                    {lastMsg && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
