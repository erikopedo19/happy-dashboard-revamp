import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-2xl border-b border-black/[0.06] p-3 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-[#0071e3]" />
              <h1 className="text-base font-semibold text-[#1d1d1f]">Summary</h1>
              <div className="w-8" />
            </div>
          </div>
          <DashboardContent />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
