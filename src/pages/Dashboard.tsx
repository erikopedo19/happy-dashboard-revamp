import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-white dark:bg-[#0c0c0c] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border-b border-[#C6C6C8] dark:border-[#2C2C2E] p-4 lg:hidden shadow-sm">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors text-[#1C1C1E] dark:text-[#F2F2F7]" />
              <h1 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Dashboard</h1>
              <div></div>
            </div>
          </div>
          <DashboardContent />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
