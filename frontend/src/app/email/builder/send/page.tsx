"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmailFooter } from "@/components/EmailFooter";
import { sendEmail, fetchConfig, fetchGroups, type Block, type Group } from "@/api/send";
import { API_BASE_URL } from "@/config/api";

// ─── Mini email preview renderer ─────────────────────────────────────────────
function BlockPreview({ block }: { block: Block }) {
  const alignClass =
    block.align === "center" ? "text-center mx-auto" :
    block.align === "right"  ? "text-right ml-auto"  : "text-left mr-auto";
  const flexAlign =
    block.align === "center" ? "justify-center" :
    block.align === "right"  ? "justify-end"    : "justify-start";

  switch (block.type) {
    case "header":
      return (
        <div className="py-6 px-8 flex items-center justify-center" style={{ backgroundColor: block.color }}>
          <span className="text-white font-semibold text-lg tracking-wide">{block.content}</span>
        </div>
      );
    case "heading":
      return (
        <div className="py-6 px-8">
          <h1 className={`font-semibold ${alignClass}`} style={{ color: block.color, fontSize: `${block.fontSize}px` }}>
            {block.content}
          </h1>
        </div>
      );
    case "text":
      return (
        <div className="py-2 px-8">
          <p className={`leading-relaxed ${alignClass}`} style={{ color: block.color, fontSize: `${block.fontSize}px` }}>
            {block.content}
          </p>
        </div>
      );
    case "button":
      return (
        <div className={`py-8 px-8 flex ${flexAlign}`}>
          <span className="inline-block px-6 py-3 rounded-md font-medium text-[15px] text-white" style={{ backgroundColor: block.color }}>
            {block.content}
          </span>
        </div>
      );
    case "image":
      return (
        <div className="px-8 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt || ""} className="w-full h-auto rounded-md object-cover" />
        </div>
      );
    case "section":
      return (
        <div className="px-8 py-6">
          <div className="w-full h-px" style={{ backgroundColor: block.color }} />
        </div>
      );
    default:
      return null;
  }
}

export default function SendPage() {
  return (
    <Suspense>
      <SendPageInner />
    </Suspense>
  );
}

function SendPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get("template") ?? "";
  const editScheduledId = searchParams.get("edit_scheduled");

  const [blocks, setBlocks]         = useState<Block[]>([]);
  const [fromEmail, setFromEmail]   = useState("");
  const [to, setTo]                 = useState("");
  const [subject, setSubject]       = useState("Welcome to Nautilus 🚗");
  const [sendMode, setSendMode]     = useState<"now" | "schedule" | "recurring">("now");
  const [schedDate, setSchedDate]   = useState("");
  const [schedTime, setSchedTime]   = useState("");
  const [recurFreq, setRecurFreq]   = useState<"daily" | "weekly" | "monthly">("weekly");

  const scheduledAt = schedDate && schedTime
    ? new Date(`${schedDate}T${schedTime}`).toISOString()
    : "";

  const [sendToMode, setSendToMode]         = useState<"single" | "group">("single");
  const [groups, setGroups]                 = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError]     = useState(false);
  const [editLoading, setEditLoading]     = useState(!!editScheduledId);
  const [status, setStatus]               = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]           = useState("");
  const [successMsg, setSuccessMsg]       = useState("");

  useEffect(() => {
    fetchConfig()
      .then((cfg) => { setFromEmail(cfg.from_email); setConfigLoading(false); })
      .catch(() => { setConfigLoading(false); setConfigError(true); });
    fetchGroups().then(setGroups).catch(() => {});

    if (editScheduledId) {
      fetch(`${API_BASE_URL}/api/scheduled/${editScheduledId}`)
        .then((r) => r.json())
        .then((data) => {
          setBlocks(data.blocks || []);
          setSubject(data.subject || "");
          setTo(data.to || "");
          setSendMode("schedule");
          if (data.scheduled_at) {
            const d = new Date(data.scheduled_at);
            setSchedDate(d.toLocaleDateString("en-CA"));
            setSchedTime(d.toTimeString().slice(0, 5));
          }
          setEditLoading(false);
        })
        .catch(() => setEditLoading(false));
    } else {
      try {
        const stored = localStorage.getItem("email-draft-blocks");
        if (stored) setBlocks(JSON.parse(stored));
      } catch {}
    }
  }, [editScheduledId]);

  const toggleGroup = (id: string) =>
    setSelectedGroups((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const totalRecipients = sendToMode === "group"
    ? groups.filter((g) => selectedGroups.includes(g.id)).reduce((acc, g) => acc + g.count, 0)
    : 1;

  const handleSend = async () => {
    if (!editScheduledId && sendToMode === "single" && !to.trim()) { setErrorMsg("Recipient email is required."); return; }
    if (!editScheduledId && sendToMode === "group" && selectedGroups.length === 0) { setErrorMsg("Select at least one group."); return; }
    if (editScheduledId && !to.trim()) { setErrorMsg("Recipient email is required."); return; }
    if (!subject.trim()) { setErrorMsg("Subject is required."); return; }
    if ((sendMode === "schedule" || sendMode === "recurring") && !scheduledAt) {
      setErrorMsg("Please pick a date and time."); return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      if (editScheduledId) {
        // ── Edit existing scheduled email ──
        const res = await fetch(`${API_BASE_URL}/api/scheduled/${editScheduledId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks, subject, to, scheduled_at: scheduledAt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ?? "Failed to update.");
        setStatus("success");
        setSuccessMsg("Email updated and rescheduled.");
        setTimeout(() => router.push("/email/scheduled"), 2000);

      } else if (sendMode === "recurring") {
        // ── Create recurring email ──
        const res = await fetch(`${API_BASE_URL}/api/recurring`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_to: to, subject, blocks, template,
            frequency: recurFreq, next_send_at: scheduledAt,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ?? "Failed to set up recurring email.");
        setStatus("success");
        setSuccessMsg(`Recurring email set up — first send scheduled.`);
        setTimeout(() => router.push("/email/scheduled"), 2000);

      } else {
        // ── Normal send ──
        const recipient = sendToMode === "group"
          ? `group:${selectedGroups.join(",")}`
          : to;
        const result = await sendEmail({
          to: recipient, subject, blocks, template, send_mode: sendMode,
          ...(sendMode === "schedule" && scheduledAt ? { scheduled_at: scheduledAt } : {}),
        });
        setStatus("success");
        setSuccessMsg(
          sendToMode === "group"
            ? `Queued for ${totalRecipients.toLocaleString()} recipients.`
            : result.message
        );
        setTimeout(() => router.push(sendMode === "schedule" ? "/email/scheduled" : "/email/analytics"), 2500);
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const btnLabel = editScheduledId
    ? "Update & Reschedule"
    : sendMode === "schedule" ? "Schedule email"
    : sendMode === "recurring" ? "Set up recurring"
    : "Send email";

  if (editLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left: preview */}
      <div className="flex-1 flex flex-col bg-gray-100 border-r border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
            {editScheduledId ? "Email preview — editing scheduled send" : "Final preview — what recipients see"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-[600px] bg-white shadow-sm min-h-[400px] pointer-events-none">
            {blocks.map((b) => <BlockPreview key={b.id} block={b} />)}
            {blocks.length > 0 && <EmailFooter />}
            {blocks.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-300 text-sm">No blocks to preview</div>
            )}
          </div>
        </div>
      </div>

      {/* Right: config */}
      <div className="w-[320px] flex-shrink-0 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 flex flex-col gap-6">

          {/* Back */}
          <button
            onClick={() => router.push(editScheduledId ? "/email/scheduled" : "/email/builder")}
            className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            {editScheduledId ? "Back to scheduled" : "Back to builder"}
          </button>

          {editScheduledId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-50 border border-cyan-200">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
              <span className="text-[12px] text-cyan-700 font-medium">Editing scheduled email</span>
            </div>
          )}

          {/* Send to — hidden in edit mode for groups */}
          {!editScheduledId && (
            <div className="space-y-3">
              <h3 className="text-[14px] font-semibold text-gray-900">Send to</h3>
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                {(["single", "group"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSendToMode(m)}
                    className={`flex-1 py-1.5 text-[13px] font-medium rounded-md capitalize transition-colors ${sendToMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                  >
                    {m === "single" ? "Single" : "Group"}
                  </button>
                ))}
              </div>

              {sendToMode === "single" && (
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-500">Recipient email</Label>
                  <Input type="email" placeholder="jane@example.com" value={to}
                    onChange={(e) => { setTo(e.target.value); setErrorMsg(""); }} className="h-9 text-[13px]" />
                </div>
              )}

              {sendToMode === "group" && (
                <div className="space-y-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center justify-between p-2.5 rounded-md border border-gray-200 hover:border-cyan-400/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={selectedGroups.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                          className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400" />
                        <span className="text-[13px] font-medium text-gray-800">{g.name}</span>
                      </div>
                      <span className="text-[12px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {g.count.toLocaleString()}
                      </span>
                    </label>
                  ))}
                  {selectedGroups.length > 0 && (
                    <p className="text-[12px] text-cyan-600 font-medium pt-1">
                      {totalRecipients.toLocaleString()} recipients selected
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recipient in edit mode */}
          {editScheduledId && (
            <div className="space-y-1.5">
              <Label className="text-[13px] text-gray-500">Recipient</Label>
              <Input type="email" value={to}
                onChange={(e) => { setTo(e.target.value); setErrorMsg(""); }} className="h-9 text-[13px]" />
            </div>
          )}

          <Separator />

          {/* Details */}
          <div className="space-y-4">
            <h3 className="text-[14px] font-semibold text-gray-900">Details</h3>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-gray-500">From</Label>
              {configError ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-red-200 bg-red-50 text-red-500 text-[13px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Could not load — is the backend running?
                </div>
              ) : (
                <Input value={configLoading ? "" : fromEmail} readOnly
                  placeholder={configLoading ? "Loading…" : ""}
                  className="h-9 text-[13px] bg-gray-50 text-gray-500 cursor-default" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-gray-500">Subject</Label>
              <Input value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrorMsg(""); }}
                className="h-9 text-[13px]" />
            </div>
          </div>

          <Separator />

          {/* Send action */}
          <div className="space-y-4">
            {/* Mode toggle — locked in edit mode */}
            {!editScheduledId && (
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                {(["now", "schedule", "recurring"] as const).map((m) => (
                  <button key={m} onClick={() => setSendMode(m)}
                    className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${sendMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                  >
                    {m === "now" ? "Now" : m === "schedule" ? "Schedule" : "Recurring"}
                  </button>
                ))}
              </div>
            )}

            {/* Date/time picker for schedule, recurring, or edit */}
            {(sendMode === "schedule" || sendMode === "recurring" || editScheduledId) && (
              <div className="space-y-2">
                {sendMode === "recurring" && (
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-gray-500">Frequency</Label>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      {(["daily", "weekly", "monthly"] as const).map((f) => (
                        <button key={f} onClick={() => setRecurFreq(f)}
                          className={`flex-1 py-1.5 text-[12px] font-medium rounded-md capitalize transition-colors ${recurFreq === f ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Label className="text-[13px] text-gray-500">
                  {sendMode === "recurring" ? "First send" : editScheduledId ? "New send time" : "Send at"}
                </Label>
                <div className="flex gap-2">
                  <Input type="date" className="flex-1 h-9 text-[13px]" value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)} />
                  <Input type="time" className="w-28 h-9 text-[13px]" value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)} />
                </div>
              </div>
            )}

            {/* Error */}
            {(status === "error" || errorMsg) && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 border border-red-200 px-3 py-2.5 rounded-md text-[13px]">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success */}
            {status === "success" && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-3 py-2.5 rounded-md text-[13px]">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg} — redirecting…</span>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={status === "loading" || status === "success"}
              className="w-full h-10 bg-cyan-400 hover:bg-cyan-500 text-white text-[14px] font-medium gap-2 disabled:opacity-60"
            >
              {status === "loading"
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : btnLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
