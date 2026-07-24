"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Loader2,
  Mail,
  Phone,
  Check,
  Inbox,
  Reply,
  Send,
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  RefreshCw,
  MailOpen,
  X,
} from "lucide-react";
import {
  getContactSubmissions,
  setContactStatus,
  deleteContactSubmission,
  type ContactStatus,
} from "@/lib/actions/contact";

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

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  support: "Customer Support",
  partnership: "Restaurant Partnership",
  feedback: "Feedback",
  bug: "Bug Report",
  other: "Other",
};

function subjectLabel(subject: string) {
  return SUBJECT_LABELS[subject] ?? subject;
}

type FilterKey = "all" | ContactStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Replied" },
  { key: "archived", label: "Archived" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: "NEW", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  read: { label: "READ", cls: "bg-[var(--surface-alt)] text-[var(--text-3)] ring-[var(--border)]" },
  replied: { label: "REPLIED", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  archived: { label: "ARCHIVED", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
};

/** Prefilled reply body: greeting + a blank line to type + the quoted original. */
function buildReplyBody(sub: Submission) {
  const quoted = sub.message
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return [
    `Hi ${sub.name},`,
    "",
    "Thank you for reaching out to HimaVolt.",
    "",
    "",
    "",
    "---",
    `On ${format(new Date(sub.createdAt), "MMM d, yyyy")}, you wrote:`,
    quoted,
    "",
    "Best regards,",
    "The HimaVolt Team",
  ].join("\n");
}

export default function AllContactsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const data = await getContactSubmissions();
      setSubmissions(data as Submission[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: submissions.length };
    for (const s of submissions) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [submissions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        subjectLabel(s.subject).toLowerCase().includes(q) ||
        s.message.toLowerCase().includes(q)
      );
    });
  }, [submissions, filter, query]);

  /** Optimistic status change with rollback on failure. */
  const changeStatus = async (id: string, status: ContactStatus) => {
    const prev = submissions;
    setProcessingId(id);
    setSubmissions((list) =>
      list.map((s) => (s.id === id ? { ...s, status } : s)),
    );
    try {
      await setContactStatus(id, status);
    } catch (e) {
      console.error(e);
      setSubmissions(prev); // rollback
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = submissions;
    setProcessingId(id);
    setSubmissions((list) => list.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    try {
      await deleteContactSubmission(id);
    } catch (e) {
      console.error(e);
      setSubmissions(prev); // rollback
    } finally {
      setProcessingId(null);
    }
  };

  const openReply = (sub: Submission) => {
    setReplyingId(sub.id);
    setReplyText(buildReplyBody(sub));
    // A message that's being answered is no longer "new".
    if (sub.status === "new") changeStatus(sub.id, "read");
  };

  const sendReply = (sub: Submission) => {
    const href = `mailto:${encodeURIComponent(sub.email)}?subject=${encodeURIComponent(
      "Re: " + subjectLabel(sub.subject),
    )}&body=${encodeURIComponent(replyText)}`;
    // Open the admin's own mail client, pre-addressed to this customer.
    window.location.href = href;
    changeStatus(sub.id, "replied");
    setReplyingId(null);
    setReplyText("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: filters + search + refresh */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key] ?? 0;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--text-3)] ring-1 ring-inset ring-[var(--border-soft)] hover:text-[var(--text-1)]"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-xs font-bold ${
                    active ? "bg-white/20 text-white" : "bg-[var(--surface-alt)] text-[var(--text-3)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages"
              className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none lg:w-60"
            />
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              fetchSubmissions();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text-1)]"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-alt)] text-[var(--text-3)]">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-1)]">
            {submissions.length === 0 ? "No contact messages" : "Nothing here"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-3)]">
            {submissions.length === 0
              ? "Messages sent through the contact form will appear here."
              : "No messages match this filter or search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((sub) => {
            const badge = STATUS_BADGE[sub.status] ?? STATUS_BADGE.read;
            const busy = processingId === sub.id;
            const replying = replyingId === sub.id;
            return (
              <div
                key={sub.id}
                className={`rounded-2xl border bg-[var(--surface)] p-5 shadow-sm transition-all sm:p-6 ${
                  sub.status === "new"
                    ? "border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/10"
                    : "border-[var(--border-soft)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-[var(--text-1)]">{sub.name}</h4>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-3)]">
                      <a href={`mailto:${sub.email}`} className="flex items-center gap-1.5 hover:text-[var(--text-1)]">
                        <Mail className="h-4 w-4" /> {sub.email}
                      </a>
                      {sub.phone && (
                        <a href={`tel:${sub.phone}`} className="flex items-center gap-1.5 hover:text-[var(--text-1)]">
                          <Phone className="h-4 w-4" /> {sub.phone}
                        </a>
                      )}
                      <span>{format(new Date(sub.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>
                  {busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--text-3)]" />}
                </div>

                <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                    Subject: {subjectLabel(sub.subject)}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)]">
                    {sub.message}
                  </p>
                </div>

                {/* Reply composer */}
                {replying && (
                  <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                        Reply to {sub.email}
                      </p>
                      <button
                        onClick={() => setReplyingId(null)}
                        className="text-[var(--text-3)] hover:text-[var(--text-1)]"
                        aria-label="Close reply"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={8}
                      className="w-full resize-y rounded-lg border border-[var(--border-soft)] bg-[var(--surface-alt)] p-3 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => sendReply(sub)}
                        className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                      >
                        <Send className="h-4 w-4" />
                        Open in email app
                      </button>
                      <button
                        onClick={() => setReplyingId(null)}
                        className="rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text-1)]"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--text-3)]">
                      This opens your email app with a draft addressed to the
                      customer. Send it from there, and we&apos;ll mark this as
                      replied.
                    </p>
                  </div>
                )}

                {/* Action bar */}
                {!replying && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openReply(sub)}
                      className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-bold text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </button>

                    {sub.status === "new" ? (
                      <button
                        onClick={() => changeStatus(sub.id, "read")}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Mark read
                      </button>
                    ) : (
                      sub.status !== "archived" && (
                        <button
                          onClick={() => changeStatus(sub.id, "new")}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
                        >
                          <MailOpen className="h-4 w-4" />
                          Mark unread
                        </button>
                      )
                    )}

                    {sub.status === "archived" ? (
                      <button
                        onClick={() => changeStatus(sub.id, "read")}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStatus(sub.id, "archived")}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    )}

                    {confirmDeleteId === sub.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text-1)]"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(sub.id)}
                        disabled={busy}
                        className="ml-auto flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] px-3.5 py-2 text-sm font-semibold text-[var(--text-3)] hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
