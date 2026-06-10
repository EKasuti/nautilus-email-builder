"use client";

import { useEffect, useState } from "react";
import { Mail, Clock, Zap } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface SendRecord {
  id: number;
  resend_id: string;
  subject: string;
  to: string;
  template: string;
  mode: string;
  last_event: string;
  sent_at: string;
}

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  delivered: { bg: "bg-cyan-50",   text: "text-cyan-600",   dot: "bg-cyan-400" },
  opened:    { bg: "bg-purple-50", text: "text-purple-600", dot: "bg-purple-400" },
  clicked:   { bg: "bg-green-50",  text: "text-green-600",  dot: "bg-green-400" },
  bounced:   { bg: "bg-red-50",    text: "text-red-500",    dot: "bg-red-400" },
  complained:{ bg: "bg-orange-50", text: "text-orange-500", dot: "bg-orange-400" },
  sent:      { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400" },
};

function StatusBadge({ event }: { event: string }) {
  const style = EVENT_COLORS[event] ?? EVENT_COLORS.sent;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {event}
    </span>
  );
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function ModeBadge({ mode }: { mode: string }) {
  return mode === "schedule" ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> Scheduled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
      <Zap className="w-3 h-3" /> Sent now
    </span>
  );
}

export default function ScheduledPage() {
  const [records, setRecords] = useState<SendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/scheduled`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setRecords(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Could not load — is the backend running?
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 text-sm animate-pulse">
        Loading…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <Mail className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-[14px] font-medium text-gray-400">No emails sent yet</p>
        <p className="text-[13px] text-gray-300">
          Emails you send from the Builder will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">

      {/* Summary strip */}
      <div className="flex items-center gap-6 mb-6">
        <div>
          <p className="text-[26px] font-bold text-gray-900 leading-tight">{records.length}</p>
          <p className="text-[12px] text-gray-400 font-medium uppercase tracking-wide">Total sends</p>
        </div>
        <div className="w-px h-10 bg-gray-200" />
        <div>
          <p className="text-[26px] font-bold text-gray-900 leading-tight">
            {records.filter((r) => r.last_event === "delivered" || r.last_event === "opened" || r.last_event === "clicked").length}
          </p>
          <p className="text-[12px] text-gray-400 font-medium uppercase tracking-wide">Delivered</p>
        </div>
        <div className="w-px h-10 bg-gray-200" />
        <div>
          <p className="text-[26px] font-bold text-gray-900 leading-tight">
            {records.filter((r) => r.mode === "schedule").length}
          </p>
          <p className="text-[12px] text-gray-400 font-medium uppercase tracking-wide">Scheduled</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {["Subject", "Recipient", "Template", "Mode", "Sent at", "Status"].map((h) => (
                <th key={h} className="px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5 font-medium text-gray-800 max-w-[220px] truncate">{r.subject}</td>
                <td className="px-6 py-3.5 text-gray-500 max-w-[180px] truncate">{r.to}</td>
                <td className="px-6 py-3.5 text-gray-400 capitalize">{r.template}</td>
                <td className="px-6 py-3.5"><ModeBadge mode={r.mode} /></td>
                <td className="px-6 py-3.5 text-gray-400 whitespace-nowrap">{fmtDatetime(r.sent_at)}</td>
                <td className="px-6 py-3.5"><StatusBadge event={r.last_event} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
