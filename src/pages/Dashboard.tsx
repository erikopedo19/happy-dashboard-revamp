import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full overflow-hidden bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 bg-background border-b border-border p-3 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger />
              <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
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
