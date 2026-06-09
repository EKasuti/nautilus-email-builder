import { Sidebar } from "@/components/Sidebar";

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
