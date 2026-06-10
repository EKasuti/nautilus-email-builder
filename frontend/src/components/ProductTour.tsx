"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const STORAGE_KEY = "nautilus_welcomed";
const TOOLTIP_W = 272;
const PAD = 8;
const GAP = 14;

interface Step {
  target?: string;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to Nautilus 👋",
    desc: "You're one step away from sending email campaigns.",
  },
  {
    target: "tour-templates",
    title: "Start with a template",
    desc: "Pick from 6 pre-built layouts: Welcome messages, Promos, Newsletters, Announcements, and you can create your own custom template.",
  },
  {
    target: "tour-builder",
    title: "Build with blocks",
    desc: "Add headings, text, buttons, and images. Customize colors and content with one click. You can also add images from your computer or from the internet.",
  },
  {
    target: "tour-scheduled",
    title: "Schedule for later",
    desc: "Queue an email for any future date and time. Resend handles delivery automatically.",
  },
  {
    target: "tour-analytics",
    title: "Track every send",
    desc: "Opens, clicks, and delivery status. All live from Resend so you always know what's landing. You can also track the performance of your email campaigns in real-time.",
  },
];

interface DOMRect4 { top: number; left: number; width: number; height: number; bottom: number; }

function measure(target: string): DOMRect4 | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom };
}

export function ProductTour() {
  const [show, setShow]   = useState(false);
  const [step, setStep]   = useState(0);
  const [rect, setRect]   = useState<DOMRect4 | null>(null);
  const router            = useRouter();

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
  }, []);

  const current = STEPS[step];

  useLayoutEffect(() => {
    if (!show || !current.target) { setRect(null); return; }
    setRect(measure(current.target));
  }, [show, step, current.target]);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
      router.push("/email/templates");
    }
  }, [step, dismiss, router]);

  const prev = () => { if (step > 0) setStep((s) => s - 1); };

  if (!show) return null;

  const hasSpotlight = !!current.target && !!rect;

  // ─── Tooltip position ────────────────────────────────────────────────────────
  let tooltipLeft = 0;
  let tooltipTop  = 0;
  let arrowLeft   = 0;

  if (hasSpotlight && rect) {
    tooltipLeft = Math.max(12, Math.min(
      rect.left + rect.width / 2 - TOOLTIP_W / 2,
      (typeof window !== "undefined" ? window.innerWidth : 1200) - TOOLTIP_W - 12,
    ));
    tooltipTop = rect.bottom + GAP;
    arrowLeft  = (rect.left + rect.width / 2) - tooltipLeft - 6;
  }

  return (
    <>
      {/* ── Overlay / spotlight ────────────────────────────────────────────── */}
      {hasSpotlight && rect ? (
        <div
          style={{
            position: "fixed",
            top:    rect.top    - PAD,
            left:   rect.left   - PAD * 2,
            width:  rect.width  + PAD * 4,
            height: rect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.50)",
            border: "2px solid rgba(6,182,212,0.75)",
            zIndex: 49,
            pointerEvents: "none",
          }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.50)", zIndex: 49 }} />
      )}

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      {hasSpotlight ? (
        /* Anchored tooltip */
        <div
          style={{
            position: "fixed",
            top:   tooltipTop,
            left:  tooltipLeft,
            width: TOOLTIP_W,
            zIndex: 51,
          }}
          className="rounded-xl border border-gray-200 bg-white shadow-2xl"
        >
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              top: -6,
              left: arrowLeft,
              width: 12,
              height: 12,
              background: "white",
              transform: "rotate(45deg)",
              borderTop: "1px solid #e5e7eb",
              borderLeft: "1px solid #e5e7eb",
            }}
          />
          <TourCard
            step={step} total={STEPS.length}
            title={current.title} desc={current.desc}
            isFirst={step === 0} isLast={step === STEPS.length - 1}
            onPrev={prev} onNext={next} onSkip={dismiss}
          />
        </div>
      ) : (
        /* Centered modal */
        <div style={{ position: "fixed", inset: 0, zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden" style={{ width: 380 }}>
            <div className="h-1 bg-gradient-to-r from-cyan-400 to-teal-300" />
            {step === 0 && (
              <div className="px-6 pt-5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-cyan-400 flex items-center justify-center text-white font-bold text-sm">N</div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Nautilus</span>
              </div>
            )}
            <TourCard
              step={step} total={STEPS.length}
              title={current.title} desc={current.desc}
              isFirst={step === 0} isLast={step === STEPS.length - 1}
              onPrev={prev} onNext={next} onSkip={dismiss}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Shared card body ─────────────────────────────────────────────────────────
interface CardProps {
  step: number; total: number;
  title: string; desc: string;
  isFirst: boolean; isLast: boolean;
  onPrev: () => void; onNext: () => void; onSkip: () => void;
}

function TourCard({ step, total, title, desc, isFirst, isLast, onPrev, onNext, onSkip }: CardProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">{title}</h3>
        <button
          onClick={onSkip}
          title="Skip tour"
          className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>

      <div className="flex items-center justify-between pt-1">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width:  i === step ? 20 : 6,
                height: 6,
                background: i === step ? "#22D3EE" : "#E5E7EB",
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-cyan-400 hover:bg-cyan-500 transition-colors"
          >
            {isLast
              ? <><Sparkles className="w-3.5 h-3.5" /> Let&apos;s go!</>
              : <>Next <ArrowRight className="w-3.5 h-3.5" /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
