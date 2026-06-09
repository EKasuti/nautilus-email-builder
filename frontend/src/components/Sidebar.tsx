"use client";

import Link from "next/link";
import { useApiStatus } from "@/context/ApiStatusContext";
import {
  LayoutDashboard,
  Briefcase,
  Inbox,
  Users,
  Zap,
  Target,
  Contact,
  FormInput,
  MessageSquare,
  Mail,
  ShoppingCart,
  Store,
  Ticket,
  Settings,
  ChevronDown,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", icon: LayoutDashboard },
      { name: "Cases", icon: Briefcase },
      { name: "Inbox", icon: Inbox },
      { name: "Customers", icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "Automations", icon: Zap },
      { name: "Audiences", icon: Target },
      { name: "Contact Lists", icon: Contact },
      { name: "Forms", icon: FormInput },
      { name: "Text Broadcast", icon: MessageSquare },
      { name: "Email Broadcast", icon: Mail, href: "/email" },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Online Orders", icon: ShoppingCart },
      { name: "Storefront", icon: Store },
      { name: "Vouchers", icon: Ticket },
    ],
  },
  {
    label: "Configure",
    items: [{ name: "General Settings", icon: Settings }],
  },
];

const statusConfig = {
  loading: { label: "Connecting...", dot: "bg-yellow-400 animate-pulse" },
  ok: { label: "API connected",  dot: "bg-green-400" },
  error: { label: "API unreachable", dot: "bg-red-400" },
};

export function Sidebar() {
  const apiStatus = useApiStatus();
  const { label, dot } = statusConfig[apiStatus];
  return (
    <div className="w-[250px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full relative">
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-400/20" />

      {/* Logo */}
      <div className="h-14 flex items-center px-4 gap-2 border-b border-gray-100">
        <div className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center text-white font-bold text-xs">
          N
        </div>
        <span className="font-semibold text-gray-900 text-[15px]">Nautilus</span>
      </div>

      {/* Workspace switcher */}
      <div className="p-4 border-b border-gray-100">
        <div className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-md p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
              C
            </div>
            <span className="text-gray-800 font-medium text-[13px]">Nautilus Car Wash</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider uppercase text-gray-400">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                if ("href" in item && item.href) {
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 transition-colors group text-[14px]"
                    >
                      <Icon className="w-[18px] h-[18px] group-hover:text-cyan-500" strokeWidth={2} />
                      {item.name}
                    </Link>
                  );
                }
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-gray-300 cursor-default select-none text-[14px]"
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                    {item.name}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* API health */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <span className="text-[12px] text-gray-400">{label}</span>
        </div>
      </div>
    </div>
  );
}
