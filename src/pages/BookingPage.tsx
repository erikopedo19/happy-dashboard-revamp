import { useAuth } from "@/contexts/AuthContext";
import BookingLinkGenerator from "@/components/BookingLinkGenerator";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MicrositeEditorPanel } from "@/pages/MicrositeEditor";
import { motion } from "framer-motion";
import {
  Globe,
  Share2,
  QrCode,
  HelpCircle,
  Link2,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: n * 0.06 }}
    className="flex items-start gap-3 p-4 sm:p-5"
  >
    <div className="relative shrink-0">
      <div className="h-9 w-9 rounded-xl bg-aurora-animated text-white font-bold text-sm flex items-center justify-center shadow-aurora">
        {n}
      </div>
    </div>
    <div className="min-w-0">
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);

const StatTile = ({
  icon: Icon,
  label,
  value,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 220, damping: 22 }}
    whileHover={{ y: -2 }}
  >
    <Card className="h-full border-border/60 bg-card/60 backdrop-blur-xl">
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/90 text-primary-foreground flex items-center justify-center shadow-sm">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const BookingPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-border/60">
          <CardContent className="p-8">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-aurora-animated shadow-aurora">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Sign in required</h2>
            <p className="text-sm text-muted-foreground">Log in to manage your booking page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        {/* Ambient aurora background */}
        <div className="pointer-events-none absolute inset-0 bg-aurora-soft opacity-60" />
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-aurora-animated opacity-10 blur-3xl" />

        <AppSidebar />

        <main className="flex-1 pb-24 overflow-y-auto relative z-10">
          {/* Sticky glass header */}
          <div className="sticky top-0 z-30 backdrop-blur-2xl bg-background/70 border-b border-border/40">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-3">
              <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className="border-transparent bg-aurora-animated text-white shadow-aurora text-[10px] font-bold tracking-wider uppercase"
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Live Portal
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-aurora truncate">
                  Booking Link Manager
                </h1>
                <p className="hidden sm:block text-xs md:text-sm text-muted-foreground mt-0.5">
                  Custom slugs, brand colors, QR flyers & microsite — all in one place.
                </p>
              </motion.div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Link2} label="Custom" value="Slug Link" delay={0.05} />
              <StatTile icon={QrCode} label="Instant" value="QR Flyer" delay={0.1} />
              <StatTile icon={Share2} label="Share" value="Anywhere" delay={0.15} />
              <StatTile icon={LayoutTemplate} label="Branded" value="Microsite" delay={0.2} />
            </div>

            {/* Tabs: Link / Microsite */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="w-full sm:w-auto h-11 p-1 bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl grid grid-cols-2 sm:inline-flex">
                  <TabsTrigger
                    value="link"
                    className="rounded-xl data-[state=active]:bg-aurora-animated data-[state=active]:text-white data-[state=active]:shadow-aurora gap-2 text-sm font-semibold"
                  >
                    <Link2 className="h-4 w-4" />
                    Booking Link
                  </TabsTrigger>
                  <TabsTrigger
                    value="site"
                    className="rounded-xl data-[state=active]:bg-aurora-animated data-[state=active]:text-white data-[state=active]:shadow-aurora gap-2 text-sm font-semibold"
                  >
                    <LayoutTemplate className="h-4 w-4" />
                    Microsite
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="link" className="mt-5 animate-fade-in">
                  <Card className="border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                      <BookingLinkGenerator />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="site" className="mt-5 animate-fade-in">
                  <Card className="border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                      <MicrositeEditorPanel />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-border/60 bg-card/70 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-aurora-animated text-white flex items-center justify-center shadow-aurora">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Getting Started</CardTitle>
                      <CardDescription className="text-xs">
                        Three steps to a live booking page.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Separator className="bg-border/50" />
                <CardContent className="p-0">
                  <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
                    <Step n={1} title="Configure Slug" desc="Pick a short URL that fits your brand." />
                    <Step n={2} title="Print QR Flyer" desc="Display a scannable code on mirrors or counters." />
                    <Step n={3} title="Take Bookings" desc="Clients book 24/7, auto-synced to your calendar." />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BookingPage;
