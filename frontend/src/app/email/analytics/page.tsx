"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Mail, Users, MousePointerClick, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

interface EmailEntry {
  resend_id: string;
  subject: string;
  to: string;
  template: string;
  mode: string;
  last_event: string;
  sent_at: string;
}

interface AnalyticsData {
  total_sent: number;
  unique_recipients: number;
  total_members: number;
  event_counts: Record<string, number>;
  sends_by_day: { date: string; sent: number }[];
  by_template: { template: string; count: number }[];
  recent: EmailEntry[];
}

const EVENT_COLORS: Record<string, string> = {
  delivered: "#22d3ee",
  opened:    "#34d399",
  clicked:   "#a78bfa",
  bounced:   "#f87171",
  complained:"#fb923c",
  sent:      "#94a3b8",
};

const TEMPLATE_COLORS: Record<string, string> = {
  welcome: "#22d3ee",
  promo: "#a78bfa",
  reactivation: "#fb923c",
  newsletter: "#34d399",
  loyalty: "#f472b6",
  invoice: "#60a5fa",
  survey: "#facc15",
  custom: "#94a3b8",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({
  icon: Icon, label, value, sub, color = "#22d3ee",
}: { icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-[26px] font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EventBadge({ event }: { event: string }) {
  const color = EVENT_COLORS[event] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize text-white"
      style={{ backgroundColor: color }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
      {event}
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/analytics`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Could not load analytics — is the backend running?
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 text-sm animate-pulse">
        Loading analytics…
      </div>
    );
  }

  const delivered = data.event_counts["delivered"] ?? 0;
  const opened    = data.event_counts["opened"]    ?? 0;
  const clicked   = data.event_counts["clicked"]   ?? 0;

  const isEmpty = data.total_sent === 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8 space-y-8">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Mail}              label="Total sent" value={data.total_sent.toLocaleString()} color="#22d3ee" />
        <StatCard icon={CheckCircle2}      label="Delivered"  value={delivered.toLocaleString()} sub="confirmed by Resend" color="#34d399" />
        <StatCard icon={Users}             label="Opens"      value={opened.toLocaleString()} sub="unique email opens" color="#a78bfa" />
        <StatCard icon={MousePointerClick} label="Clicks"     value={clicked.toLocaleString()} sub="link clicks tracked" color="#f472b6" />
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-gray-400">No emails sent yet</p>
          <p className="text-[13px] text-gray-300 mt-1">Send your first email from the Builder tab to see analytics here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Sends over time */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-[14px] font-semibold text-gray-800 mb-4">Sends over time</h3>
              {data.sends_by_day.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.sends_by_day} barSize={20}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      width={24}
                    />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(label) => fmtDate(String(label))}
                    />
                    <Bar dataKey="sent" radius={[4, 4, 0, 0]} fill="#22d3ee" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
              )}
            </div>

            {/* Event breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-[14px] font-semibold text-gray-800">Delivery events</h3>
              {Object.entries(data.event_counts).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(data.event_counts).map(([event, count]) => {
                    const pct = Math.round((count / data.total_sent) * 100);
                    const color = EVENT_COLORS[event] ?? "#94a3b8";
                    return (
                      <div key={event}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-medium text-gray-600 capitalize">{event}</span>
                          <span className="text-[12px] text-gray-400">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-gray-300">No events yet</p>
              )}

              {data.by_template.length > 0 && (
                <>
                  <div className="h-px bg-gray-100 mt-4" />
                  <h3 className="text-[14px] font-semibold text-gray-800">By template</h3>
                  <div className="space-y-3">
                    {data.by_template.map((t) => {
                      const pct = Math.round((t.count / data.total_sent) * 100);
                      return (
                        <div key={t.template}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-medium text-gray-600 capitalize">{t.template}</span>
                            <span className="text-[12px] text-gray-400">{t.count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TEMPLATE_COLORS[t.template] ?? "#94a3b8" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent sends table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-[14px] font-semibold text-gray-800">Recent sends</h3>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {["Subject", "To", "Template", "Mode", "Sent", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800 max-w-[200px] truncate">{row.subject}</td>
                    <td className="px-6 py-3 text-gray-500">{row.to}</td>
                    <td className="px-6 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize text-white"
                        style={{ backgroundColor: TEMPLATE_COLORS[row.template] ?? "#94a3b8" }}
                      >
                        {row.template}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 capitalize">{row.mode}</td>
                    <td className="px-6 py-3 text-gray-400 whitespace-nowrap">{fmtDate(row.sent_at)}</td>
                    <td className="px-6 py-3"><EventBadge event={row.last_event} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
