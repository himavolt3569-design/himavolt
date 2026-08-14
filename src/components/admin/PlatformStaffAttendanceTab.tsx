"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { UserCheck, Clock, FileText, RefreshCw, Check, X, CalendarClock, Loader2 } from "lucide-react";

export default function PlatformStaffAttendanceTab() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: staffList, isLoading: loadingStaff } = useQuery({
    queryKey: ["platform-staff"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });

  const { data: attendances, isLoading: loadingAtt } = useQuery({
    queryKey: ["platform-attendance", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/platform-staff/attendance?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    }
  });

  const { data: leaveRequests, isLoading: loadingLeaves } = useQuery({
    queryKey: ["platform-leave-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/platform-staff/leave-requests`);
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    }
  });

  const attendanceMutation = useMutation({
    mutationFn: async (payload: { platformStaffId: string, status: string, note?: string }) => {
      setActionLoadingId(payload.platformStaffId);
      const res = await fetch(`/api/admin/platform-staff/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, date: selectedDate })
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-attendance", selectedDate] });
    },
    onSettled: () => {
      setActionLoadingId(null);
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async (payload: { requestId: string, status: string, adminNote?: string }) => {
      setActionLoadingId(payload.requestId);
      const res = await fetch(`/api/admin/platform-staff/leave-requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to process leave request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-leave-requests"] });
      // Invalidate attendance as approving leave might generate attendance records
      queryClient.invalidateQueries({ queryKey: ["platform-attendance"] });
    },
    onSettled: () => {
      setActionLoadingId(null);
    }
  });

  const isLoading = loadingStaff || loadingAtt || loadingLeaves;

  const merged = staffList?.map((staff: Record<string, any>) => {
    const att = attendances?.find((a: Record<string, any>) => a.platformStaffId === staff.id);
    return { ...staff, attendance: att };
  }) || [];

  return (
    <div className="space-y-10">
      
      {/* ── LEAVE REQUESTS SECTION ── */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[var(--text-1)]">Leave Requests</h2>
          <p className="text-sm text-[var(--text-3)] font-medium">Review pending leave requests from staff</p>
        </div>

        {loadingLeaves ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : leaveRequests?.length === 0 ? (
          <div className="rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border-soft)] p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mb-4">
              <CalendarClock className="h-8 w-8" />
            </div>
            <p className="font-bold text-[var(--text-2)]">No Pending Requests</p>
            <p className="text-xs text-[var(--text-3)]">All caught up!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveRequests?.map((req: any) => (
              <div key={req.id} className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-[var(--text-1)]">{req.platformStaff.name}</h3>
                    <p className="text-xs font-semibold text-[var(--text-3)]">{req.platformStaff.email}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-lg">Pending</span>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-amber-50 mb-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-400">Date Range</span>
                    <span className="font-bold text-gray-700">
                      {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs items-start">
                    <span className="font-bold text-gray-400">Reason</span>
                    <span className="font-medium text-gray-700 max-w-[200px] text-right">{req.reason}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    disabled={actionLoadingId === req.id}
                    onClick={() => leaveMutation.mutate({ requestId: req.id, status: "APPROVED" })}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoadingId === req.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button 
                    disabled={actionLoadingId === req.id}
                    onClick={() => leaveMutation.mutate({ requestId: req.id, status: "REJECTED" })}
                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoadingId === req.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DAILY ATTENDANCE SECTION ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Daily Attendance</h2>
            <p className="text-sm text-[var(--text-3)] font-medium">Manage and override staff presence</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-sm font-semibold text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        <div className="rounded-[2.5rem] bg-[var(--surface)] border border-[var(--border-soft)] p-8 shadow-sm">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border-soft)] border-t-[var(--accent)]" />
            </div>
          ) : merged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 bg-gray-50 text-gray-400 rounded-3xl flex items-center justify-center mb-6">
                <UserCheck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-1)] mb-2">No Staff Found</h3>
              <p className="text-[var(--text-3)] text-sm max-w-sm">
                Create platform staff first to track their attendance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merged.map((staff: Record<string, any>) => {
                const att = staff.attendance;
                const isPending = actionLoadingId === staff.id;
                
                return (
                  <div key={staff.id} className="flex flex-col justify-between p-5 border border-[var(--border-soft)] rounded-[2rem] bg-gray-50/50 hover:bg-[var(--surface-alt)] transition-colors group">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[var(--text-1)] truncate text-base">{staff.name}</p>
                          <p className="text-xs font-semibold text-[var(--text-3)] truncate">{staff.email}</p>
                        </div>
                        <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          !att ? "bg-gray-100 text-gray-500" :
                          att.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" :
                          att.status === "LEAVE" ? "bg-amber-100 text-amber-700" :
                          att.status === "LATE" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {att ? att.status : "NO RECORD"}
                        </span>
                      </div>
                      
                      {att && (
                        <div className="flex flex-col gap-2 mb-4 text-xs font-medium text-[var(--text-3)]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {att.checkIn ? format(new Date(att.checkIn), "h:mm a") : "--:--"}
                          </div>
                          {att.note && (
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[200px]">{att.note}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions - Removed Grant Leave, Kept Mark Absent for manual overrides */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-soft)]">
                      <button 
                        disabled={isPending || (att && att.status === "ABSENT")}
                        onClick={() => attendanceMutation.mutate({ platformStaffId: staff.id, status: "ABSENT", note: "Marked absent by Admin" })}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Mark Absent"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
