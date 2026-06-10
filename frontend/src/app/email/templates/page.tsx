"use client";

import { useEffect, useState } from "react";
import { Mail, Tag, Gift, FileText, CreditCard, Bell, Plus, BookMarked } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/config/api";

const STATIC_TEMPLATES = [
  { id: "welcome",      name: "Welcome message",        desc: "Greet new members, share a perk",    icon: Mail,       bg: "#E7FDF0", color: "#0F8A4E" },
  { id: "promo",        name: "Promotions / discounts",  desc: "Push a limited-time deal",           icon: Tag,        bg: "#FDECE6", color: "#C0492A" },
  { id: "offers",       name: "Offers",                  desc: "Bundle or upgrade incentive",        icon: Gift,       bg: "#FDF4E1", color: "#9A6410" },
  { id: "newsletter",   name: "Newsletter",              desc: "Monthly updates, multi-section",     icon: FileText,   bg: "#E6F1FB", color: "#2464EA" },
  { id: "membership",   name: "Membership",              desc: "Renewal, billing, plan changes",     icon: CreditCard, bg: "#F0EDFD", color: "#7A39ED" },
  { id: "announcement", name: "Announcement",            desc: "New hours, location, or feature",    icon: Bell,       bg: "#FCEAF1", color: "#993556" },
  { id: "custom",       name: "Custom",                  desc: "Start from a blank canvas",          icon: Plus,       bg: "#F1F3F6", color: "#5B6B7A", dashed: true },
];

interface SavedTemplate {
  id: number;
  name: string;
  created_at: string;
}

export default function TemplatesPage() {
  const [saved, setSaved] = useState<SavedTemplate[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then((r) => r.ok ? r.json() : [])
      .then(setSaved)
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">

      {/* Static templates */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900 mb-6">Create an email</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {STATIC_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <Link
                key={tpl.id}
                href={`/email/builder?template=${tpl.id}`}
                className={`flex flex-col text-left bg-white rounded-xl p-5 border transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 hover:border-cyan-300 ${(tpl as { dashed?: boolean }).dashed ? "border-dashed border-gray-200" : "border-gray-200"}`}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: tpl.bg }}>
                  <Icon className="w-5 h-5" style={{ color: tpl.color }} strokeWidth={2} />
                </div>
                <p className="text-[15px] font-medium text-gray-900 mb-1">{tpl.name}</p>
                <p className="text-[13px] text-gray-400 leading-relaxed">{tpl.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Saved templates */}
      {saved.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold text-gray-700 mb-4">Saved templates</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {saved.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/email/builder?saved=${tpl.id}`}
                className="flex flex-col text-left bg-white rounded-xl p-5 border border-gray-200 transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 hover:border-cyan-300"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-cyan-50">
                  <BookMarked className="w-5 h-5 text-cyan-500" strokeWidth={2} />
                </div>
                <p className="text-[15px] font-medium text-gray-900 mb-1 truncate">{tpl.name}</p>
                <p className="text-[13px] text-gray-400">
                  {new Date(tpl.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
