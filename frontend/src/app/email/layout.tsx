import { Sidebar } from "@/components/Sidebar";
import { EmailNav } from "@/components/EmailNav";
import { ProductTour } from "@/components/ProductTour";

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <EmailNav />
        <div className="flex-1 overflow-hidden bg-gray-50">{children}</div>
      </div>
      <ProductTour />
    </div>
  );
}
