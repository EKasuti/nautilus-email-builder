"use client";

import { useEffect, useState } from "react";
import { Clock, Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/config/api";

interface ScheduledEmail {
  id: number;
  resend_id: string | null;
  subject: string;
  to: string;
  template: string;
  mode: string;
  last_event: string;
  sent_at: string;
  scheduled_at: string | null;
}

interface RecurringEmail {
  id: number;
  email_to: string;
  subject: string;
  template: string;
  frequency: string;
  next_send_at: string;
  active: boolean;
}

function EventBadge({ event }: { event: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    scheduled:  { label: "Scheduled",  bg: "#EFF6FF", color: "#2563EB" },
    cancelled:  { label: "Cancelled",  bg: "#F3F4F6", color: "#6B7280" },
    sent:       { label: "Sent",       bg: "#F0FDF4", color: "#16A34A" },
    delivered:  { label: "Delivered",  bg: "#F0FDF4", color: "#15803D" },
    opened:     { label: "Opened",     bg: "#FEFCE8", color: "#CA8A04" },
    clicked:    { label: "Clicked",    bg: "#FFF7ED", color: "#EA580C" },
    bounced:    { label: "Bounced",    bg: "#FEF2F2", color: "#DC2626" },
    complained: { label: "Complained", bg: "#FEF2F2", color: "#DC2626" },
  };
  const cfg = map[event] ?? { label: event, bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function ScheduledPage() {
  const router = useRouter();
  const [rows, setRows]             = useState<ScheduledEmail[]>([]);
  const [recurring, setRecurring]   = useState<RecurringEmail[]>([]);
  const [loading, setLoading]       = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelRec, setConfirmDelRec] = useState<number | null>(null);

  function loadScheduled() {
    fetch(`${API_BASE_URL}/api/scheduled`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  function loadRecurring() {
    fetch(`${API_BASE_URL}/api/recurring`)
      .then((r) => r.ok ? r.json() : [])
      .then(setRecurring)
      .catch(() => {});
  }

  useEffect(() => { loadScheduled(); loadRecurring(); }, []);

  async function handleDelete(id: number) {
    setDeleting(true);
    await fetch(`${API_BASE_URL}/api/scheduled/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeleting(false);
    setConfirmDelete(null);
  }

  async function handleDeleteRecurring(id: number) {
    await fetch(`${API_BASE_URL}/api/recurring/${id}`, { method: "DELETE" });
    setRecurring((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelRec(null);
  }

  async function handleToggleRecurring(id: number) {
    const res = await fetch(`${API_BASE_URL}/api/recurring/${id}/toggle`, { method: "PATCH" });
    if (res.ok) {
      const { active } = await res.json();
      setRecurring((prev) => prev.map((r) => r.id === id ? { ...r, active } : r));
    }
  }

  const total     = rows.length;
  const delivered = rows.filter((r) => ["delivered", "opened", "clicked"].includes(r.last_event)).length;
  const pending   = rows.filter((r) => ["scheduled", "sent"].includes(r.last_event)).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      <h1 className="text-[22px] font-semibold text-gray-900">Scheduled emails</h1>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Scheduled", value: total },
          { label: "Delivered", value: delivered },
          { label: "Pending",   value: pending },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[13px] text-gray-400 mb-1">{label}</p>
            <p className="text-[28px] font-semibold text-gray-900 leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* One-time scheduled table */}
      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-gray-700">One-time sends</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-300">
              <Clock className="w-9 h-9" />
              <p className="text-[13px] font-medium">No scheduled emails</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Subject", "Recipient", "Template", "Scheduled for", "Status", ""].map((h, i) => (
                    <th key={i} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const canAct = r.last_event === "scheduled";
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 max-w-[180px] truncate">{r.subject}</td>
                      <td className="px-5 py-3 text-gray-500">{r.to}</td>
                      <td className="px-5 py-3 text-gray-500 capitalize">{r.template}</td>
                      <td className="px-5 py-3 text-gray-500">{r.scheduled_at ? fmtDatetime(r.scheduled_at) : "—"}</td>
                      <td className="px-5 py-3"><EventBadge event={r.last_event} /></td>
                      <td className="px-5 py-3">
                        {canAct && (
                          confirmDelete === r.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-gray-500">Cancel send?</span>
                              <button onClick={() => handleDelete(r.id)} disabled={deleting}
                                className="text-[12px] font-semibold text-red-500 hover:text-red-700 disabled:opacity-50">
                                {deleting ? "…" : "Yes"}
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="text-[12px] text-gray-400 hover:text-gray-600">No</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => router.push(`/email/builder/send?edit_scheduled=${r.id}`)}
                                title="Edit email"
                                className="text-gray-300 hover:text-cyan-500 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setConfirmDelete(r.id)} title="Cancel send"
                                className="text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recurring emails section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-700">Recurring emails</h2>
          <button
            onClick={() => router.push("/email/templates")}
            className="flex items-center gap-1.5 text-[13px] text-cyan-500 hover:text-cyan-600 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New recurring
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {recurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-300">
              <RefreshCw className="w-9 h-9" />
              <p className="text-[13px] font-medium">No recurring emails set up</p>
              <p className="text-[12px] text-gray-300">Build an email and choose &ldquo;Recurring&rdquo; on the send page</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Subject", "Recipient", "Frequency", "Next send", "Status", ""].map((h, i) => (
                    <th key={i} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recurring.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-[180px] truncate">{r.subject}</td>
                    <td className="px-5 py-3 text-gray-500">{r.email_to}</td>
                    <td className="px-5 py-3 text-gray-500">{capitalize(r.frequency)}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDatetime(r.next_send_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {r.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {confirmDelRec === r.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-500">Delete?</span>
                          <button onClick={() => handleDeleteRecurring(r.id)}
                            className="text-[12px] font-semibold text-red-500 hover:text-red-700">Yes</button>
                          <button onClick={() => setConfirmDelRec(null)}
                            className="text-[12px] text-gray-400 hover:text-gray-600">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleToggleRecurring(r.id)} title={r.active ? "Pause" : "Resume"}
                            className="text-gray-300 hover:text-cyan-500 transition-colors">
                            {r.active
                              ? <ToggleRight className="w-4 h-4 text-cyan-400" />
                              : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setConfirmDelRec(r.id)} title="Delete"
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
