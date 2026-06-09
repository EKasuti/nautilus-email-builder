"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface TopBarProps {
  parent?: string;
  page: string;
}

export function TopBar({ parent, page }: TopBarProps) {
  return (
    <div className="h-14 flex-shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <Breadcrumb>
        <BreadcrumbList>
          {parent && (
            <>
              <BreadcrumbItem>
                <span className="text-gray-400 text-[14px]">{parent}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[14px] font-semibold text-gray-900">
              {page}
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
  );
}
