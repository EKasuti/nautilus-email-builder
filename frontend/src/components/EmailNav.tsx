"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
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
        <div className="flex gap-6 h-12">
          {TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-tour={tab.tour}
                className={`relative flex items-center px-1 text-[14px] font-medium transition-colors ${isActive ? "text-cyan-500" : "text-gray-500 hover:text-gray-800"}`}
              >
                {tab.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full" />}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
