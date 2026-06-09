import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar parent="Email Broadcast" page="Templates" />
        {children}
      </div>
    </div>
  );
}
