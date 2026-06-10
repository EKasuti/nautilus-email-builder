"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TABS = [
  { label: "Templates", href: "/email/templates", tour: "tour-templates" },
  { label: "Builder",   href: "/email/builder",   tour: "tour-builder"   },
  { label: "Scheduled", href: "/email/scheduled", tour: "tour-scheduled" },
  { label: "Analytics", href: "/email/analytics", tour: "tour-analytics" },
];

export function EmailNav() {
  const pathname = usePathname();
  const active = TABS.find((t) => pathname.startsWith(t.href));
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  function startTour() {
    setPopoverOpen(false);
    window.dispatchEvent(new CustomEvent("nautilus:replay-tour"));
  }

  return (
    <>
      {/* Top bar */}
      <div className="h-14 flex-shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <span className="text-gray-400 text-[14px]">Email Broadcast</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-[14px] font-semibold text-gray-900">
                {active?.label ?? "Email Broadcast"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search customers..."
            className="h-9 w-64 pl-9 text-[13px] bg-gray-50 border-gray-200 focus-visible:ring-cyan-400"
          />
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-6 h-12">
          {TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-tour={tab.tour}
                className={`relative flex items-center px-1 h-full text-[14px] font-medium transition-colors ${isActive ? "text-cyan-500" : "text-gray-500 hover:text-gray-800"}`}
              >
                {tab.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full" />}
              </Link>
            );
          })}

          <div className="relative ml-1" ref={popoverRef}>
            <button
              onClick={() => setPopoverOpen((o) => !o)}
              className={`transition-colors ${popoverOpen ? "text-cyan-500" : "text-gray-400 hover:text-cyan-500"}`}
            >
              <Info className="w-4 h-4" />
            </button>

            {popoverOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                {/* Arrow */}
                <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-t border-l border-gray-200 rotate-45" />
                <div className="p-4 space-y-3">
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    Get a quick walkthrough of all the email builder features.
                  </p>
                  <button
                    onClick={startTour}
                    className="w-full py-2 rounded-lg bg-cyan-400 hover:bg-cyan-500 text-white text-[13px] font-semibold transition-colors"
                  >
                    Do tour
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
