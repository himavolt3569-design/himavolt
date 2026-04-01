"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Store,
  User,
  Clock,
  Send,
  Filter,
  Trash2,
  CheckSquare,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  senderName: string | null;
  createdAt: string;
}

interface ChatRoom {
  id: string;
  type: string;
  isActive: boolean;
  tableNo: string | null;
  roomNo: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: { id: string; name: string; slug: string } | null;
  messages: { id: string; content: string; sender: string; senderName: string | null; createdAt: string }[];
  _count: { messages: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SENDER_COLORS: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-700",
  KITCHEN: "bg-amber-100 text-amber-700",
  BILLING: "bg-green-100 text-green-700",
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AllChatsTab() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatRoom | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allSelected = rooms.length > 0 && selectedIds.size === rooms.length;

  const fetchRooms = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "20" });
        if (activeFilter) params.set("isActive", activeFilter);

        const res = await fetch(`/api/admin/chats?${params}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setRooms(data.rooms);
        setPagination(data.pagination);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [page, activeFilter],
  );

  useEffect(() => {
    fetchRooms(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchRooms(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeFilter]);

  // Auto-refresh rooms every 10s
  useEffect(() => {
    const interval = setInterval(() => fetchRooms(page), 10000);
    return () => clearInterval(interval);
  }, [fetchRooms, page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/chats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: deleteTarget.id }),
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        if (selectedRoom === deleteTarget.id) { setSelectedRoom(null); setMessages([]); }
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - 1 } : p);
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/chats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        if (selectedRoom && selectedIds.has(selectedRoom)) { setSelectedRoom(null); setMessages([]); }
        if (pagination) setPagination((p) => p ? { ...p, total: p.total - selectedIds.size } : p);
        setSelectedIds(new Set());
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    setMessagesLoading(true);
    setSelectedRoom(roomId);
    try {
      const res = await fetch(`/api/admin/chats?roomId=${roomId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages(data.messages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      // silent
    } finally {
      setMessagesLoading(false);
    }
  };

  // Auto-refresh messages every 5s when a room is selected
  useEffect(() => {
    if (!selectedRoom) return;
    const interval = setInterval(() => fetchMessages(selectedRoom), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {["", "true", "false"].map((v) => (
            <button
              key={v}
              onClick={() => { setActiveFilter(v); setPage(1); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                activeFilter === v ? "bg-gompa-slate text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
              }`}
            >
              {v === "" ? "All Chats" : v === "true" ? "Active" : "Closed"}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchRooms(page)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-brand-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        {pagination && (
          <span className="ml-auto text-xs text-gray-400">{pagination.total} chat rooms</span>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-red-600">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-400 hover:text-red-600">Clear</button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedIds.size}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chat Rooms List */}
        <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelectedIds(allSelected ? new Set() : new Set(rooms.map((r) => r.id)))}
                className="h-3.5 w-3.5 rounded accent-gompa-slate"
              />
              <MessageCircle className="h-4 w-4 text-brand-400" />
              <span className="text-xs font-semibold text-gray-500">Chat Rooms</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-green-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Live
            </div>
          </div>

          {loading && rooms.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-16 text-center">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">No chat rooms found</p>
            </div>
          ) : (
            <div className="max-h-[600px] divide-y divide-gray-50 overflow-y-auto">
              {rooms.map((room) => {
                const lastMsg = room.messages[0];
                const isSelected = selectedRoom === room.id;
                const isBulkSelected = selectedIds.has(room.id);
                return (
                  <div
                    key={room.id}
                    className={`flex w-full items-start gap-3 px-4 py-3 transition-all hover:bg-brand-50/40 ${
                      isSelected ? "bg-brand-50 border-l-2 border-brand-500" : isBulkSelected ? "bg-red-50/30" : ""
                    }`}
                  >
                  <input
                    type="checkbox"
                    checked={isBulkSelected}
                    onChange={() => setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(room.id)) next.delete(room.id); else next.add(room.id);
                      return next;
                    })}
                    className="mt-3 h-3.5 w-3.5 flex-shrink-0 rounded accent-gompa-slate"
                  />
                  <button
                    type="button"
                    onClick={() => fetchMessages(room.id)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${room.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gompa-slate">
                          {room.restaurant?.name || "Unknown"}
                        </span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${room.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {room.isActive ? "Active" : "Closed"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {room.type}
                        </span>
                      </div>
                      {room.tableNo && (
                        <p className="text-[11px] text-gray-400">Table {room.tableNo}</p>
                      )}
                      {lastMsg && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          <span className="font-medium">{lastMsg.senderName || lastMsg.sender}:</span>{" "}
                          {lastMsg.content}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[11px] text-gray-400 tabular-nums">
                        {timeAgo(room.updatedAt)}
                      </p>
                      <p className="mt-0.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                        {room._count.messages} msgs
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(room); }}
                    className="mt-1 flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                    title="Delete chat room"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  </div>
                );
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
              <span className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 disabled:opacity-40">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Viewer */}
        <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-brand-100 px-4 py-2.5">
            <Send className="h-4 w-4 text-brand-400" />
            <span className="text-xs font-semibold text-gray-500">
              {selectedRoom ? "Messages" : "Select a chat room"}
            </span>
            {selectedRoom && (
              <button
                onClick={() => { setSelectedRoom(null); setMessages([]); }}
                className="ml-auto text-gray-400 hover:text-brand-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {!selectedRoom ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-2 h-10 w-10 text-gray-200" />
                <p className="text-sm text-gray-400">Select a chat room to view messages</p>
              </div>
            </div>
          ) : messagesLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-400">No messages in this room</p>
            </div>
          ) : (
            <div className="max-h-[550px] overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isAdmin = msg.sender === "ADMIN" || msg.sender === "MANAGER" || msg.sender === "BILLING" || msg.sender === "KITCHEN";
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isAdmin ? "bg-brand-100 text-gompa-slate" : "bg-gray-100 text-gompa-slate"}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SENDER_COLORS[msg.sender] || "bg-gray-200 text-gray-600"}`}>
                          {msg.sender}
                        </span>
                        {msg.senderName && (
                          <span className="text-[11px] text-gray-500">{msg.senderName}</span>
                        )}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete chat room?"
        description={`This will permanently delete the chat room for "${deleteTarget?.restaurant?.name ?? "Unknown"}" and all its messages. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} chat room${selectedIds.size > 1 ? "s" : ""}?`}
        description={`This will permanently delete ${selectedIds.size} chat room${selectedIds.size > 1 ? "s" : ""} and all their messages. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
