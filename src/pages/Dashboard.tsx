import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#f2f2f7] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-[#f2f2f7]">
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-black/5 p-3 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-[#007aff]" />
              <h1 className="text-base font-semibold text-[#1c1c1e]">Summary</h1>
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
