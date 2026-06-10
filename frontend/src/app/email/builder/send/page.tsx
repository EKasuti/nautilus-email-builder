"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmailFooter } from "@/components/EmailFooter";
import { sendEmail, fetchConfig, fetchGroups, type Block, type Group } from "@/api/send";

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

// ─── Send page ────────────────────────────────────────────────────────────────
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

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [fromEmail, setFromEmail] = useState("");
  const [to, setTo]           = useState("");
  const [subject, setSubject] = useState("Welcome to Nautilus 🚗");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");

  const scheduledAt = schedDate && schedTime
    ? new Date(`${schedDate}T${schedTime}`).toISOString()
    : "";
  const [sendToMode, setSendToMode] = useState<"single" | "group">("single");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError]   = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("email-draft-blocks");
      if (stored) setBlocks(JSON.parse(stored));
    } catch {}

    fetchConfig()
      .then((cfg) => { setFromEmail(cfg.from_email); setConfigLoading(false); })
      .catch(() => { setConfigLoading(false); setConfigError(true); });

    fetchGroups().then(setGroups).catch(() => {});
  }, []);

  const toggleGroup = (id: string) =>
    setSelectedGroups((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const totalRecipients = sendToMode === "group"
    ? groups.filter((g) => selectedGroups.includes(g.id)).reduce((acc, g) => acc + g.count, 0)
    : 1;

  const handleSend = async () => {
    if (sendToMode === "single" && !to.trim()) { setErrorMsg("Recipient email is required."); return; }
    if (sendToMode === "group" && selectedGroups.length === 0) { setErrorMsg("Select at least one group."); return; }
    if (!subject.trim()) { setErrorMsg("Subject is required."); return; }
    if (sendMode === "schedule" && !scheduledAt) { setErrorMsg("Please pick a date and time to schedule."); return; }

    setStatus("loading");
    setErrorMsg("");

    // For group sends, send to first member email as demo (real bulk send would iterate)
    const recipient = sendToMode === "group"
      ? `group:${selectedGroups.join(",")}`
      : to;

    try {
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
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const btnLabel = sendMode === "schedule" ? "Schedule email" : "Send email";

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left: preview */}
      <div className="flex-1 flex flex-col bg-gray-100 border-r border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">
            Final preview — what recipients see
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
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to builder
          </button>

          {/* Send to */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-semibold text-gray-900">Send to</h3>

            {/* Mode toggle */}
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
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setErrorMsg(""); }}
                  className="h-9 text-[13px]"
                />
              </div>
            )}

            {sendToMode === "group" && (
              <div className="space-y-2">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-gray-200 hover:border-cyan-400/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400"
                      />
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
                <Input
                  value={configLoading ? "" : fromEmail}
                  readOnly
                  placeholder={configLoading ? "Loading…" : ""}
                  className="h-9 text-[13px] bg-gray-50 text-gray-500 cursor-default"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-gray-500">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrorMsg(""); }}
                className="h-9 text-[13px]"
              />
            </div>
          </div>

          <Separator />

          {/* Send action */}
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              {(["now", "schedule"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSendMode(m)}
                  className={`flex-1 py-1.5 text-[13px] font-medium rounded-md capitalize transition-colors ${sendMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                >
                  {m === "now" ? "Send now" : "Schedule"}
                </button>
              ))}
            </div>

            {sendMode === "schedule" && (
              <div className="flex gap-2">
                <Input type="date" className="flex-1 h-9 text-[13px]" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                <Input type="time" className="w-28 h-9 text-[13px]" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
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
              {status === "loading" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : btnLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
