"use client";

import { useEffect, useState } from "react";
import { Mail, Clock } from "lucide-react";
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

function EventBadge({ event }: { event: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    scheduled:  { label: "Scheduled",  bg: "#EFF6FF", color: "#2563EB" },
    sent:       { label: "Sent",       bg: "#F0FDF4", color: "#16A34A" },
    delivered:  { label: "Delivered",  bg: "#F0FDF4", color: "#15803D" },
    opened:     { label: "Opened",     bg: "#FEFCE8", color: "#CA8A04" },
    clicked:    { label: "Clicked",    bg: "#FFF7ED", color: "#EA580C" },
    bounced:    { label: "Bounced",    bg: "#FEF2F2", color: "#DC2626" },
    complained: { label: "Complained", bg: "#FEF2F2", color: "#DC2626" },
  };
  const cfg = map[event] ?? { label: event, bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
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

export default function ScheduledPage() {
  const [rows, setRows] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scheduled`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const total      = rows.length;
  const delivered  = rows.filter((r) => ["delivered", "opened", "clicked"].includes(r.last_event)).length;
  const pending    = rows.filter((r) => ["scheduled", "sent"].includes(r.last_event)).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-300">
            <Clock className="w-10 h-10" />
            <p className="text-[14px] font-medium">No scheduled emails</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Subject", "Recipient", "Template", "Scheduled for", "Status"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-[220px] truncate">{r.subject}</td>
                  <td className="px-5 py-3 text-gray-500">{r.to}</td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{r.template}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {r.scheduled_at ? fmtDatetime(r.scheduled_at) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <EventBadge event={r.last_event} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
