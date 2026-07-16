"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Mail, Check, Inbox } from "lucide-react";
import { getContactSubmissions, markContactAsRead } from "@/lib/actions/contact";

type Submission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
};

export default function AllContactsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const data = await getContactSubmissions();
      setSubmissions(data as Submission[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleMarkRead = async (id: string) => {
    setProcessingId(id);
    try {
      await markContactAsRead(id);
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, status: "read" } : sub))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
          <Inbox className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No contact messages</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          You haven't received any messages through the contact form yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className={`rounded-2xl border bg-white p-6 shadow-sm transition-all ${
              sub.status === "new" ? "border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/10" : "border-gray-100"
            }`}
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-gray-900">{sub.name}</h4>
                      {sub.status === "new" && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                      <a href={`mailto:${sub.email}`} className="flex items-center gap-1.5 hover:text-gray-900">
                        <Mail className="h-4 w-4" /> {sub.email}
                      </a>
                      {sub.phone && (
                        <span className="flex items-center gap-1.5">
                          &bull; {sub.phone}
                        </span>
                      )}
                      <span>&bull; {format(new Date(sub.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Subject: {sub.subject}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {sub.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-end md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                {sub.status === "new" ? (
                  <button
                    onClick={() => handleMarkRead(sub.id)}
                    disabled={processingId === sub.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {processingId === sub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Mark as Read
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-500">
                    <Check className="h-4 w-4" />
                    Read
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
