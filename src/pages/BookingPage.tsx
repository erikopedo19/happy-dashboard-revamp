import { useAuth } from "@/contexts/AuthContext";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Globe, Share2, Eye } from "lucide-react";

const ROSE = "#e11d48";

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex items-start gap-3 px-4 py-3.5">
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
      style={{ background: ROSE }}>
      {n}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-white">{title}</p>
      <p className="text-[13px] text-[#8E8E93] mt-0.5 leading-snug">{desc}</p>
    </div>
  </div>
);

const BookingPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: `${ROSE}18` }}>
            <Globe className="h-5 w-5" style={{ color: ROSE }} />
          </div>
          <h2 className="text-xl font-semibold text-[#1C1C1E] dark:text-white mb-1">Sign in required</h2>
          <p className="text-sm text-[#8E8E93]">Log in to manage your booking page.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c]">
        <AppSidebar />
        <main className="flex-1 pb-28">
          <div className="max-w-5xl mx-auto px-4 pt-6 md:px-8 md:pt-10">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">
                Booking Page
              </h1>
              <p className="text-[15px] text-[#8E8E93] mt-1">
                Share your link, take bookings anywhere.
              </p>
            </div>

            <div className="max-w-2xl space-y-4">
              {/* Link generator card */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
                <BookingLinkGenerator />
              </div>

              {/* How it works */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white">
                    How it works
                  </h2>
                </div>
                <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                  <Step n={1} title="Generate your link" desc="Create a unique booking URL for your business." />
                  <Step n={2} title="Share with customers" desc="Post on social, email signatures, or your website." />
                  <Step n={3} title="Receive bookings" desc="New appointments appear instantly in your agenda." />
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                    style={{ background: `${ROSE}18` }}>
                    <Share2 className="h-4 w-4" style={{ color: ROSE }} />
                  </div>
                  <p className="text-[13px] text-[#8E8E93]">Share anywhere</p>
                  <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white">One link</p>
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                    style={{ background: `${ROSE}18` }}>
                    <Eye className="h-4 w-4" style={{ color: ROSE }} />
                  </div>
                  <p className="text-[13px] text-[#8E8E93]">Instant sync</p>
                  <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white">Auto agenda</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BookingPage;
