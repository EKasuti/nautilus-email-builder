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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const TABS = [
  { value: "templates", label: "Templates" },
  { value: "builder", label: "Builder" },
  { value: "scheduled", label: "Scheduled" },
  { value: "analytics", label: "Analytics" },
];

export default function EmailPage() {
  const [activeTab, setActiveTab] = useLocalStorage("email-active-tab", "templates");

  const currentLabel = TABS.find((t) => t.value === activeTab)?.label ?? "Templates";

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
                {currentLabel}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-6 rounded-none">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-full rounded-none bg-transparent px-1 text-[14px] font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <TabsContent value="templates" className="mt-0 p-8">
            <p className="text-gray-400 text-sm">Templates content</p>
          </TabsContent>
          <TabsContent value="builder" className="mt-0 p-8">
            <p className="text-gray-400 text-sm">Builder content</p>
          </TabsContent>
          <TabsContent value="scheduled" className="mt-0 p-8">
            <p className="text-gray-400 text-sm">Scheduled content</p>
          </TabsContent>
          <TabsContent value="analytics" className="mt-0 p-8">
            <p className="text-gray-400 text-sm">Analytics content</p>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
