import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Scissors,
  Heart,
  Calendar,
  User,
  Star,
  Map as MapIcon,
  Loader2,
  ChevronDown,
  Clock,
  Award,
  Sparkles,
  BellRing,
  SlidersHorizontal,
  LocateFixed,
  X,
  Image as ImageIcon,
  Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { QuickBookSheet } from "@/components/QuickBookSheet";

const BarbershopMap = lazy(() => import("@/components/BarbershopMap").then((m) => ({ default: m.BarbershopMap })));
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { StoriesRail } from "@/components/stories/StoriesRail";
import { NotificationBell } from "@/components/NotificationBell";


interface BarberProfile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  booking_link: string | null;
  brand_color: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  rating: number | null;
  rating_count: number | null;
  description: string | null;
  freelancer_mode: boolean;
  brandName: string;
}

type TabKey = "today" | "map" | "favorites";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const FILTER_OPTIONS = [
  { key: "default" as const, label: "For you" },
  { key: "reviews" as const, label: "Most reviewed" },
  { key: "likes" as const, label: "Most liked" },
  { key: "bookings" as const, label: "Most bookings this week" },
];

const FindBarber = () => {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile() ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "today";
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [sortFilter, setSortFilter] = useState<typeof FILTER_OPTIONS[number]["key"]>();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSearch, setMapSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState<"any" | "1" | "5" | "10">("any");
  const [minRating, setMinRating] = useState<"any" | "3" | "4" | "4.5">("any");

  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;
    const next = tab || "today";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = (key: TabKey) => {
    setActiveTab(key);
    if (key === "today") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    const saved = localStorage.getItem("favoriteBarbers");
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!("geolocation" in navigator)) {
      setUserLocation({ lat: 40.7128, lng: -74.006 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setUserLocation({ lat: 40.7128, lng: -74.006 })
    );
  }, [user]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("favoriteBarbers", JSON.stringify(next));
      return next;
    });
  };

  const { data: todayCounts } = useQuery({
    queryKey: ["today-booking-counts"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_today_booking_counts");
      if (error) return new Map<string, number>();
      const m = new Map<string, number>();
      for (const r of (data || []) as any[]) m.set(r.user_id, Number(r.count) || 0);
      return m;
    },
  });

  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ["find-barbers"],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [rpcRes, settingRes] = await Promise.all([
        (supabase as any).rpc("list_public_profiles"),
        (supabase as any).from("app_settings").select("value").eq("key", "fake_shops").maybeSingle(),
      ]);
      if (rpcRes.error) throw rpcRes.error;
      const real: BarberProfile[] = (rpcRes.data || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        business_name: p.business_name ?? null,
        booking_link: p.booking_link,
        brand_color: p.brand_color,
        avatar_url: p.avatar_url ?? null,
        banner_url: p.banner_url ?? null,
        rating: p.rating ?? null,
        rating_count: p.rating_count ?? null,
        description: p.description ?? null,
        freelancer_mode: p.freelancer_mode ?? false,
        brandName: p.business_name || p.full_name || "Barber",
      }));

      const fakeEnabled = settingRes?.data?.value?.enabled === true;
      if (!fakeEnabled) return real;

      const { data: fakes } = await (supabase as any)
        .from("fake_barbershops")
        .select("id, name, description, city, country, avatar_url, banner_url, brand_color, rating, rating_count");
      const fakeMapped: BarberProfile[] = (fakes || []).map((f: any) => ({
        id: `fake:${f.id}`,
        full_name: f.name,
        business_name: f.name,
        booking_link: null,
        brand_color: f.brand_color,
        avatar_url: f.avatar_url ?? null,
        banner_url: f.banner_url ?? null,
        rating: f.rating,
        rating_count: f.rating_count,
        description: [f.description, [f.city, f.country].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
        freelancer_mode: false,
        brandName: f.name,
      }));

      // Interleave so fakes feel scattered, not clumped at the bottom.
      const merged: BarberProfile[] = [];
      const maxLen = Math.max(real.length, fakeMapped.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < real.length) merged.push(real[i]);
        if (i < fakeMapped.length) merged.push(fakeMapped[i]);
      }
      return merged;
    },
  });

  const sortedBarbers = useMemo(() => {
    const list = barbers ?? [];
    const counts = todayCounts ?? new Map<string, number>();
    return [...list].sort(
      (a, b) =>
        ((counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)) ||
        ((b.rating ?? 0) - (a.rating ?? 0))
    );
  }, [barbers, todayCounts]);



  // Bookings in the last 2 days that the current user hasn't rated yet.
  // Powers the "Rate" button on the Find Barber cards.
  const { data: rateableMap } = useQuery({
    queryKey: ["rateable-barbers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_bookings");
      if (error) throw error;
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const map = new Map<string, string>();
      for (const b of (data || []) as any[]) {
        if (!b?.cancel_token || b?.has_review || b?.status === "cancelled") continue;
        const ended = new Date(`${b.appointment_date}T${b.appointment_time}`).getTime();
        if (isNaN(ended)) continue;
        if (ended <= now && now - ended <= twoDaysMs) {
          // keep the most recent token per barber
          if (!map.has(b.barber_id)) map.set(b.barber_id, b.cancel_token);
        }
      }
      return map;
    },
  });

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = sortedBarbers;

    if (sortFilter === "reviews") {
      list = [...(barbers ?? [])].sort((a, b) =>
        (b.rating_count ?? 0) - (a.rating_count ?? 0) ||
        (b.rating ?? 0) - (a.rating ?? 0)
      );
    } else if (sortFilter === "likes") {
      list = [...(barbers ?? [])].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortFilter === "bookings") {
      const counts = todayCounts ?? new Map<string, number>();
      list = [...(barbers ?? [])].sort(
        (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
      );
    }

    if (!term) return list;
    return list.filter((b) => b.brandName.toLowerCase().includes(term));
  }, [sortedBarbers, barbers, searchTerm, sortFilter, todayCounts]);

  const favoriteBarbers = sortedBarbers.filter((b) => favorites.includes(b.id));


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c]">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: "/find-barber" }} />;
  }

  if (activeTab === "map") {
    return (
      <FullScreenMap
        barbers={sortedBarbers}
        userLocation={userLocation}
        mapSearch={mapSearch}
        setMapSearch={setMapSearch}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        maxDistance={maxDistance}
        setMaxDistance={setMaxDistance}
        minRating={minRating}
        setMinRating={setMinRating}
        onBack={() => changeTab("today")}
      />
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#F2F2F7] dark:bg-[#000000] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto relative">
          <div className="relative min-h-screen bg-[#F2F2F7] dark:bg-[#000000] pb-28">
      <Seo
        title="Cutzio — Find Your Next Barber"
        description="Discover independent barbers and stylists near you and book appointments in seconds with Cutzioo."
        path="/find-barber"
      />

      {/* Page header — scrolls away naturally */}
      <PageHeader>
        <div className="backdrop-blur-xl bg-[#F2F2F7]/80 dark:bg-black/70 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
          <div className="flex items-center justify-between mb-3">
            <motion.h1
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              onDoubleClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-[28px] font-bold leading-none tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] select-none"
            >
              Find a barber
            </motion.h1>
            <div className="flex items-center gap-2">
              {isMobile && <NotificationBell />}
              <Link to="/me">
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/10 hover:scale-95 transition-transform">
                  <User className="w-4 h-4 text-[#1C1C1E] dark:text-[#F2F2F7]" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
            <Input
              type="text"
              placeholder="Search barbers, styles, vibes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-[14px] border-0 bg-black/[0.05] dark:bg-white/[0.06] text-[#1C1C1E] dark:text-[#F2F2F7] placeholder:text-[#8E8E93] focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/15"
            />
          </div>


        </div>
        </div>
      </PageHeader>



      <div className="relative z-10 max-w-5xl mx-auto px-5 py-5">
        <div className="mb-4">
          <StoriesRail />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-4">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setSortFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition border",
                sortFilter === f.key || (f.key === "default" && sortFilter === undefined)
                  ? "bg-[#1C1C1E] text-white border-[#1C1C1E] dark:bg-white dark:text-[#1C1C1E] dark:border-white"
                  : "bg-transparent text-[#1C1C1E] border-black/10 hover:bg-black/[0.05] dark:text-white dark:border-white/10 dark:hover:bg-white/5"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {activeTab === "today" && (
              <ExploreList
                loading={barbersLoading}
                items={filtered}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                searchTerm={searchTerm}
                expandedId={expandedId}
                onExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                rateableMap={rateableMap}
              />
            )}

            {activeTab === "favorites" && (
              <FavoritesList
                items={favoriteBarbers}
                onToggleFavorite={toggleFavorite}
                onExplore={() => changeTab("today")}
                expandedId={expandedId}
                onExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                rateableMap={rateableMap}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <ClientMobileDock />
    </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

/* ---------- Sub-components ---------- */

function PageHeader({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}


const cardItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, type: "spring" as const, stiffness: 380, damping: 30 },
  }),
};

function BarberCard({
  barber,
  index,
  isFavorite,
  isExpanded,
  onToggleFavorite,
  onExpand,
  rateToken,
}: {
  barber: BarberProfile;
  index: number;
  isFavorite: boolean;
  isExpanded: boolean;
  onToggleFavorite: (id: string) => void;
  onExpand: (id: string) => void;
  rateToken?: string | null;
}) {

  const accent = barber.brand_color || "#e11d48";
  const rating = barber.rating ?? 5;
  const reviews = barber.rating_count ?? 0;
  const initial = (barber.brandName || "B").trim().charAt(0).toUpperCase();
  const [bookOpen, setBookOpen] = useState(false);


  return (
    <motion.div
      layout
      custom={index}
      variants={cardItem}
      initial="hidden"
      animate="show"
      transition={spring}
      className={cn(
        "group relative rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.06] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)]",
        isExpanded && "sm:col-span-2 lg:col-span-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Header banner */}
      <div
        className="relative h-24"
        style={{
          background: barber.banner_url
            ? `url(${barber.banner_url}) center/cover`
            : `linear-gradient(135deg, ${accent}, ${accent}88)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-[#1C1C1E]" />

        {/* Favorite — large 44x44 tap target */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(barber.id);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full bg-white/90 dark:bg-[#2C2C2E]/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isFavorite ? "fill-rose-500 text-rose-500" : "text-[#8E8E93]"
            )}
          />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 -mt-10 relative">
        <div className="flex items-end gap-3">
          {barber.avatar_url ? (
            <img
              src={barber.avatar_url}
              alt={barber.brandName}
              className="w-[68px] h-[68px] rounded-full object-cover border-[3px] border-white dark:border-[#1C1C1E] shrink-0"
            />
          ) : (
            <div
              className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-white font-semibold text-3xl border-[3px] border-white dark:border-[#1C1C1E] shrink-0 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1 pb-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08] px-2 py-0.5 mb-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-[11px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">
                {Number(rating).toFixed(1)}
              </span>
              <span className="text-[10px] text-[#8E8E93]">· {reviews}</span>
            </div>
          </div>
        </div>

        <h3 className="mt-2 text-[19px] font-semibold leading-tight tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
          {barber.brandName}
        </h3>
        {barber.freelancer_mode && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 text-[10px] font-medium">
            <Home className="w-3 h-3" /> Mobile / Home visit
          </div>
        )}
        {barber.description && !isExpanded && (
          <p className="mt-1 text-[12.5px] text-[#8E8E93] line-clamp-2 leading-relaxed">
            {barber.description}
          </p>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pt-3"
          >
            <BarberExpandedDetails
              barberId={barber.id}
              fallbackDescription={barber.description}
              accent={accent}
              rating={rating}
              reviews={reviews}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action row — generous 48px tap targets */}
      <div className="p-3 pt-3 flex gap-2">
        <button
          onClick={() => onExpand(barber.id)}
          className="flex-1 h-12 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
        >
          {isExpanded ? "Less" : "Details"}
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={spring} className="inline-flex">
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
        {barber.booking_link ? (
          <Button
            onClick={() => setBookOpen(true)}
            className="flex-[1.4] w-full h-12 rounded-[14px] text-white font-semibold border-0 active:scale-[0.97] transition-transform"
            style={{ backgroundColor: accent }}
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            Book
          </Button>
        ) : (
          <Button disabled className="flex-[1.4] h-12 rounded-[14px] bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#8E8E93]">
            Unavailable
          </Button>
        )}
      </div>
      {rateToken && (
        <div className="px-3 pb-3 -mt-1">
          <Link
            to={`/review/${rateToken}`}
            className="w-full h-11 rounded-[14px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-400/20 font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
          >
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            Rate your visit
          </Link>
        </div>
      )}

      {bookOpen && (
        <QuickBookSheet
          open={bookOpen}
          onOpenChange={setBookOpen}
          barberId={barber.id}
          barberName={barber.brandName}
          bookingLink={barber.booking_link}
          accentColor={accent}
        />
      )}
    </motion.div>
  );
}



function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-black/[0.04] dark:bg-white/[0.06] py-2.5 text-center">
      <div className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[#8E8E93] mt-0.5">{label}</div>
    </div>
  );
}

function ExploreList({
  loading,
  items,
  favorites,
  onToggleFavorite,
  searchTerm,
  expandedId,
  onExpand,
  rateableMap,
}: {
  loading: boolean;
  items: BarberProfile[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  searchTerm: string;
  expandedId: string | null;
  onExpand: (id: string) => void;
  rateableMap?: Map<string, string>;
}) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Scissors className="w-9 h-9 text-[#8E8E93]" />}
        title="No barbers found"
        subtitle={searchTerm ? "Try a different search" : "Check back soon"}
      />
    );
  }
  return (
    <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
      {items.map((b, i) => (
        <React.Fragment key={b.id}>
          <BarberCard
            barber={b}
            index={i}
            isFavorite={favorites.includes(b.id)}
            isExpanded={expandedId === b.id}
            onToggleFavorite={onToggleFavorite}
            onExpand={onExpand}
            rateToken={rateableMap?.get(b.id) ?? null}
          />
        </React.Fragment>
      ))}
    </motion.div>
  );
}

function FavoritesList({
  items,
  onToggleFavorite,
  onExplore,
  expandedId,
  onExpand,
  rateableMap,
}: {
  items: BarberProfile[];
  onToggleFavorite: (id: string) => void;
  onExplore: () => void;
  expandedId: string | null;
  onExpand: (id: string) => void;
  rateableMap?: Map<string, string>;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="w-9 h-9 text-[#FF2D55]" />}
        title="No favorites yet"
        subtitle="Tap the heart on a barber to save them"
        action={
          <Button onClick={onExplore} className="bg-[#FF2D55] hover:bg-[#E6294D] rounded-2xl h-11 px-6">
            Explore
          </Button>
        }
      />
    );
  }
  return (
    <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
      {items.map((b, i) => (
        <React.Fragment key={b.id}>
          <BarberCard
            barber={b}
            index={i}
            isFavorite={true}
            isExpanded={expandedId === b.id}
            onToggleFavorite={onToggleFavorite}
            onExpand={onExpand}
            rateToken={rateableMap?.get(b.id) ?? null}
          />
        </React.Fragment>
      ))}
    </motion.div>
  );
}


function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      className="text-center py-20"
    >
      <div className="w-20 h-20 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.06] flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{title}</h3>
      <p className="text-sm text-[#8E8E93] mt-1">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

function FullScreenMap({
  barbers,
  userLocation,
  mapSearch,
  setMapSearch,
  filtersOpen,
  setFiltersOpen,
  maxDistance,
  setMaxDistance,
  minRating,
  setMinRating,
  onBack,
}: {
  barbers: BarberProfile[];
  userLocation: { lat: number; lng: number } | null;
  mapSearch: string;
  setMapSearch: (v: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  maxDistance: "any" | "1" | "5" | "10";
  setMaxDistance: (v: "any" | "1" | "5" | "10") => void;
  minRating: "any" | "3" | "4" | "4.5";
  setMinRating: (v: "any" | "3" | "4" | "4.5") => void;
  onBack: () => void;
}) {
  const activeFilters =
    Number(maxDistance !== "any") + Number(minRating !== "any");

  return (
    <div className="fixed inset-0 z-40 bg-[#F2F2F7] dark:bg-[#0c0c0c]">
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 [&_.maplibregl-ctrl-attrib]:hidden [&_.maplibregl-ctrl-logo]:hidden">
          <Suspense fallback={<div className="w-full h-full bg-[#e5e5ea] dark:bg-[#1c1c1e]" />}>
            <BarbershopMap
              barbershops={[]}
              userLocation={userLocation || undefined}
              height="100%"
              accentColor="#e11d48"
              hideSearch
              showControls={false}
            />
          </Suspense>
        </div>
      </div>

      {/* Coming Soon overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black px-5">
        <img
          src="/Frame 316.png"
          alt="Map feature coming soon"
          className="w-full max-w-md object-contain rounded-3xl"
        />
        <button
          type="button"
          onClick={onBack}
          className="mt-6 h-12 w-full max-w-md rounded-full bg-rose-500 text-[15px] font-semibold text-white active:scale-95 transition-transform"
        >
          Browse barbers
        </button>
      </div>

      {/* Top floating search + filters */}
      <div className="absolute left-0 right-0 top-0 z-20 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="mx-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Close map"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/90 text-[#1C1C1E] shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform active:scale-95 dark:border-white/10 dark:bg-[#1C1C1E]/90 dark:text-[#F2F2F7]"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
            <Input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="Search city, area or barber"
              className="h-11 rounded-full border border-black/5 bg-white/90 pl-11 pr-4 text-[14px] shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl placeholder:text-[#8E8E93]/80 focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-white/10 dark:bg-[#1C1C1E]/90"
            />
          </div>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Filters"
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/90 text-[#1C1C1E] shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform active:scale-95 dark:border-white/10 dark:bg-[#1C1C1E]/90 dark:text-[#F2F2F7]"
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilters > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white shadow">
                    {activeFilters}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-white px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 dark:bg-[#1C1C1E]">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
              <SheetHeader className="text-left">
                <SheetTitle className="text-[18px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                  Filters
                </SheetTitle>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <div>
                  <Label className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">Distance</Label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(["any", "1", "5", "10"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setMaxDistance(d)}
                        className={cn(
                          "h-10 rounded-full text-[13px] font-medium transition-colors",
                          maxDistance === d
                            ? "bg-rose-500 text-white shadow-sm"
                            : "bg-[#F2F2F7] text-[#1C1C1E] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]"
                        )}
                      >
                        {d === "any" ? "Any" : `${d} mi`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[12px] font-semibold uppercase tracking-wide text-[#8E8E93]">Minimum rating</Label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(["any", "3", "4", "4.5"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setMinRating(r)}
                        className={cn(
                          "h-10 rounded-full text-[13px] font-medium transition-colors",
                          minRating === r
                            ? "bg-rose-500 text-white shadow-sm"
                            : "bg-[#F2F2F7] text-[#1C1C1E] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]"
                        )}
                      >
                        {r === "any" ? "Any" : `${r}★`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-full border-black/10 dark:border-white/10"
                    onClick={() => {
                      setMaxDistance("any");
                      setMinRating("any");
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    className="h-12 flex-1 rounded-full bg-rose-500 text-white hover:bg-rose-600"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Show results
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mx-3 mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-rose-600 shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/90 dark:text-rose-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            </span>
            {barbers.length} live nearby
          </div>
        </div>
      </div>

      {/* Bottom info card above dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+5.75rem)]">
        <div className="pointer-events-auto mx-auto max-w-[28rem] rounded-3xl border border-black/5 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1C1C1E]/95">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10">
              <MapIcon className="h-5 w-5 text-rose-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">More pins coming soon</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#8E8E93]">
                Barbers appear as they add their shop address in Settings.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded-full bg-rose-500 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition-transform active:scale-95"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      <ClientMobileDock />
    </div>
  );
}

export default FindBarber;

/* ---------- Expanded details (fetched on demand) ---------- */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BarberExpandedDetails({
  barberId,
  fallbackDescription,
  accent,
  rating,
  reviews,
}: {
  barberId: string;
  fallbackDescription: string | null;
  accent: string;
  rating: number;
  reviews: number;
}) {
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["barber-details", barberId],
    queryFn: async () => {
      const [profileRes, servicesRes, hoursRes, agendaRes, micrositeRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("description, years_experience, business_name, full_name, accepts_waitlist")
          .eq("id", barberId)
          .maybeSingle(),
        (supabase as any)
          .from("services")
          .select("id, name, price, duration")
          .eq("user_id", barberId)
          .is("deleted_at", null)
          .order("price", { ascending: true })
          .limit(8),
        (supabase as any)
          .from("business_hours")
          .select("day_of_week, open_time, close_time, is_closed")
          .eq("user_id", barberId)
          .order("day_of_week", { ascending: true }),
        (supabase as any)
          .from("agenda_settings")
          .select("start_hour, end_hour, working_days")
          .eq("user_id", barberId)
          .maybeSingle(),
        (supabase as any)
          .from("microsites")
          .select("gallery")
          .eq("user_id", barberId)
          .maybeSingle(),
      ]);

      const gallery: string[] = Array.isArray(micrositeRes?.data?.gallery)
        ? (micrositeRes.data.gallery as string[]).filter(Boolean)
        : [];

      // Derive hours from agenda_settings (the source of truth used by the
      // booking form) so Find Barber, agenda and booking link always match.
      const agenda = agendaRes?.data;
      let hours: Array<{ day_of_week: number; open_time: string; close_time: string; is_closed: boolean }> = [];
      if (agenda?.start_hour && agenda?.end_hour) {
        const workingDays: number[] = agenda.working_days ?? [0, 1, 2, 3, 4, 5, 6];
        hours = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          day_of_week: d,
          open_time: agenda.start_hour,
          close_time: agenda.end_hour,
          is_closed: !workingDays.includes(d),
        }));
      } else {
        hours = hoursRes.data || [];
      }

      return {
        profile: profileRes.data,
        services: servicesRes.data || [],
        hours,
        gallery,
      };
    },
    staleTime: 60_000,
  });

  const qc = useQueryClient();
  useEffect(() => {
    if (!barberId) return;
    const channel = supabase
      .channel(`find-barber-sync-${barberId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_settings', filter: `user_id=eq.${barberId}` }, () => {
        qc.invalidateQueries({ queryKey: ['barber-details', barberId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `user_id=eq.${barberId}` }, () => {
        qc.invalidateQueries({ queryKey: ['barber-details', barberId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [barberId, qc]);

  const joinWaitlist = async () => {
    setJoining(true);
    const { data: res, error } = await (supabase as any).rpc("join_cancellation_waitlist", {
      _barber_id: barberId,
    });
    setJoining(false);
    if (error || !res?.success) {
      toast({ title: "Couldn't join waitlist", description: res?.error || error?.message, variant: "destructive" });
      return;
    }
    setJoined(true);
    toast({ title: "You're on the list!", description: "We'll email you the moment a slot opens in the next 7 days." });
  };


  const description = data?.profile?.description ?? fallbackDescription;
  const years = data?.profile?.years_experience;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-16 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
          <div className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
          <div className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
        </div>
      </div>
    );
  }

  const services = data?.services ?? [];
  const gallery = data?.gallery ?? [];

  const priceValues = services.map((s: any) => Number(s.price)).filter((n) => !Number.isNaN(n));
  const fromPrice = priceValues.length ? Math.min(...priceValues) : null;

  const highlights = [
    { label: "Rating", value: Number(rating).toFixed(1) },
    { label: "Reviews", value: String(reviews) },
    { label: years ? "Experience" : "Status", value: years ? `${years}y` : "Pro" },
    ...(fromPrice != null ? [{ label: "From", value: `$${fromPrice.toFixed(0)}` }] : []),
    ...(services.length ? [{ label: "Services", value: String(services.length) }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Quick highlight chips */}
      <div className="flex flex-wrap gap-2">
        {highlights.map((h) => (
          <div
            key={h.label}
            className="inline-flex items-baseline gap-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5"
          >
            <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">{h.value}</span>
            <span className="text-[11px] text-[#8E8E93]">{h.label}</span>
          </div>
        ))}
      </div>

      {/* Waitlist CTA */}
      {data?.profile?.accepts_waitlist && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={joinWaitlist}
          disabled={joining || joined}
          className="w-full rounded-[18px] p-3.5 flex items-center gap-3 bg-black/[0.04] dark:bg-white/[0.06] text-left disabled:opacity-70 transition"
        >
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: accent }}>
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
              {joined ? "You're on the waitlist" : "Remind me of a cancellation"}
            </div>
            <div className="text-[11px] text-[#8E8E93]">
              {joined ? "We'll email you the moment a slot opens." : "Get notified if a slot opens in the next 7 days."}
            </div>
          </div>
        </motion.button>
      )}

      {/* About */}
      {description && (
        <Section icon={<Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />} title="About">
          <p className="text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]/80 leading-relaxed">
            {description}
          </p>
        </Section>
      )}

      {/* Services / Rates */}
      {services.length > 0 && (
        <Section icon={<Award className="w-3.5 h-3.5" style={{ color: accent }} />} title="Services & rates">
          <ul className="rounded-[18px] bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden divide-y divide-black/[0.05] dark:divide-white/[0.05]">
            {services.map((s: any, i: number) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, ...spring }}
                className="flex items-center justify-between px-3.5 py-3"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}14` }}>
                    <Scissors className="w-3.5 h-3.5" style={{ color: accent }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{s.name}</div>
                    {s.duration && <div className="text-[11px] text-[#8E8E93]">{s.duration} min</div>}
                  </div>
                </div>
                {s.price != null && (
                  <div className="text-[14px] font-semibold tabular-nums text-[#1C1C1E] dark:text-[#F2F2F7]">
                    ${Number(s.price).toFixed(0)}
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        </Section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <Section icon={<ImageIcon className="w-3.5 h-3.5" style={{ color: accent }} />} title="Recent work">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {gallery.map((url: string, i: number) => (
              <motion.div
                key={url + i}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, ...spring }}
                className="relative shrink-0 snap-start w-32 aspect-[3/4] rounded-[16px] overflow-hidden bg-black/[0.04] dark:bg-white/[0.06]"
              >
                <img src={url} alt="Recent work" className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* Working hours */}
      {data && data.hours.length > 0 && (
        <Section icon={<Clock className="w-3.5 h-3.5" style={{ color: accent }} />} title="Working hours">
          <div className="rounded-[18px] bg-black/[0.03] dark:bg-white/[0.05] p-3.5 grid grid-cols-1 gap-1.5">
            {data.hours.map((h: any) => (
              <div key={h.day_of_week} className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#1C1C1E] dark:text-[#F2F2F7] font-medium">{DAY_NAMES[h.day_of_week] || "—"}</span>
                <span className={cn("tabular-nums", h.is_closed ? "text-[#8E8E93]" : "text-[#3C3C43] dark:text-[#EBEBF5]/80")}>
                  {h.is_closed
                    ? "Closed"
                    : `${(h.open_time || "").slice(0, 5)} – ${(h.close_time || "").slice(0, 5)}`}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">{title}</span>
      </div>
      {children}
    </div>
  );
}
