import { useAuth } from "@/contexts/AuthContext";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Globe, Share2, Eye, QrCode, Sparkles, HelpCircle } from "lucide-react";
import { MicrositeEditorPanel } from "@/pages/MicrositeEditor";



const ROSE = "#e11d48";

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex items-start gap-3.5 px-5 py-4">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${ROSE} 0%, #be123c 100%)` }}>
      {n}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[15px] text-[#1C1C1E] dark:text-white">{title}</p>
      <p className="text-[13px] text-[#8E8E93] mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const BookingPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 max-w-md w-full text-center shadow-lg border border-black/5 dark:border-white/5">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: `${ROSE}18` }}>
            <Globe className="h-5 w-5" style={{ color: ROSE }} />
          </div>
          <h2 className="text-xl font-bold text-[#1C1C1E] dark:text-white mb-1">Sign in required</h2>
          <p className="text-sm text-[#8E8E93]">Log in to manage your booking page.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50/50 dark:bg-[#0a0a0c]">
        <AppSidebar />
        <main className="flex-1 pb-24 overflow-y-auto">
          {/* Top header glow decor */}
          <div className="absolute top-0 right-0 left-64 h-64 bg-gradient-to-b from-[#e11d48]/5 via-[#e11d48]/0 to-transparent pointer-events-none hidden lg:block" />

          <div className="max-w-6xl mx-auto px-4 pt-8 md:px-8 md:pt-12 relative z-10">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#e11d48]/10 text-[#e11d48] border border-[#e11d48]/10">
                    Live Portal
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  Booking Link Manager
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Configure custom slugs, brand colors, email confirmations, and retrieve scannable flyers.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Main Card with inner grid */}
              <div className="bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-zinc-800/80 p-5 md:p-8 shadow-sm">
                <BookingLinkGenerator />
              </div>

              {/* Microsite Generator - embedded */}
              <div className="bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-zinc-800/80 p-5 md:p-8 shadow-sm">
                <MicrositeEditorPanel />
              </div>


              {/* Grid with instruction and stats */}
              <div className="grid md:grid-cols-12 gap-5">
                {/* How it works */}
                <div className="md:col-span-8 bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-zinc-800/80 overflow-hidden shadow-sm">
                  <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-[#e11d48]" />
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Getting Started & Best Practices
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-zinc-800/60">
                    <Step n={1} title="Configure Slug" desc="Pick an ultra-short, simple URL that aligns with your salon's brand." />
                    <Step n={2} title="Print QR Flyer" desc="Download and display the high-res QR code directly on mirrors or counters." />
                    <Step n={3} title="Take Booking" desc="Clients request appointments 24/7. Auto-synced directly to your calendar." />
                  </div>
                </div>

                {/* Live stats card */}
                <div className="md:col-span-4 grid grid-cols-2 gap-3.5">
                  <div className="bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-zinc-800/80 p-5 flex flex-col justify-between shadow-sm">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: `${ROSE}10` }}>
                      <Share2 className="h-4.5 w-4.5" style={{ color: ROSE }} />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Multi-Channel</p>
                      <p className="text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">Share Anywhere</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-zinc-800/80 p-5 flex flex-col justify-between shadow-sm">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: `${ROSE}10` }}>
                      <QrCode className="h-4.5 w-4.5" style={{ color: ROSE }} />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Instant Scan</p>
                      <p className="text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">QR Generated</p>
                    </div>
                  </div>
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
