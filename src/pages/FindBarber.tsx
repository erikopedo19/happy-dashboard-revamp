import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge, Button } from "@heroui/react";
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
  ChevronRight,
  Clock,
  Award,
  Sparkles,
  BellRing,
  SlidersHorizontal,
  LocateFixed,
  X,
  Image as ImageIcon,
  Home,
  MapPin,
  GalleryHorizontalEnd,
} from "lucide-react";
import { SwipeDeck } from "@/components/SwipeDeck";
import { QuickBookSheet } from "@/components/QuickBookSheet";
import { useToast } from "@/hooks/use-toast";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const BarbershopMap = lazy(() => import("@/components/BarbershopMap").then((m) => ({ default: m.BarbershopMap })));
if (typeof window !== "undefined") { const warm = () => { import("@/components/BarbershopMap").catch(() => {}); fetch("https://tiles.openfreemap.org/styles/positron").catch(() => {}); }; ((window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 800)))(warm); }
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { StoriesRail } from "@/components/stories/StoriesRail";
import { NotificationBell } from "@/components/NotificationBell";
import { getBarberTheme } from "@/lib/barberTheme";


interface BarberProfile {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  home_service?: boolean;
  address?: string | null;
  full_name: string | null;
  business_name: string | null;
  booking_link: string | null;
  brand_color: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  rating: number | null;
  rating_count: number | null;
  description: string | null;
  brandName: string;
}

type TabKey = "today" | "map" | "favorites";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const FILTER_OPTIONS = [
  { key: "default" as const, label: "For you", icon: Sparkles },
  { key: "reviews" as const, label: "Most reviewed", icon: Star },
  { key: "likes" as const, label: "Most liked", icon: Heart },
  { key: "bookings" as const, label: "Trending", icon: Award },
];

// Hand-drawn double ellipse around the highlighted headline word.
function CircledWord({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-1">
      <span className="relative z-10 text-[#FF5A6E]">{children}</span>
      <svg
        aria-hidden
        viewBox="0 0 220 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)] text-[#FF5A6E]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <motion.path
          d="M18 44C14 22 70 8 118 9c52 1 92 13 90 33-2 21-56 32-110 31C46 72 14 62 18 44Z"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
        />
        <motion.path
          d="M10 40C12 18 66 4 120 6c56 2 96 18 92 38-4 22-62 30-116 28C40 70 8 58 10 40Z"
          opacity="0.55"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.35 }}
        />
      </svg>
    </span>
  );
}

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
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;
    const next = tab || "today";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = (key: TabKey) => {
    if (key !== activeTab) haptic("selection");
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
    haptic(favorites.includes(id) ? "light" : "success");
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
        brandName: p.business_name || p.full_name || "Barber",
        latitude: p.latitude != null ? Number(p.latitude) : null,
        longitude: p.longitude != null ? Number(p.longitude) : null,
        home_service: !!p.home_service,
        address: p.address ?? null,
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

  // Barbershops with an active boost — always shown first.
  const { data: boostedIds } = useQuery({
    queryKey: ["boosted-barbers"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("list_boosted_barbers");
      return new Set<string>(((data as any[]) ?? []).map((r) => r.user_id));
    },
  });

  const boostRank = (id: string) => (boostedIds?.has(id) ? 1 : 0);

  const sortedBarbers = useMemo(() => {
    const list = barbers ?? [];
    const counts = todayCounts ?? new Map<string, number>();
    return [...list].sort(
      (a, b) =>
        (boostRank(b.id) - boostRank(a.id)) ||
        ((counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)) ||
        ((b.rating ?? 0) - (a.rating ?? 0))
    );
  }, [barbers, todayCounts, boostedIds]);



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
        (boostRank(b.id) - boostRank(a.id)) ||
        (b.rating_count ?? 0) - (a.rating_count ?? 0) ||
        (b.rating ?? 0) - (a.rating ?? 0)
      );
    } else if (sortFilter === "likes") {
      list = [...(barbers ?? [])].sort(
        (a, b) => (boostRank(b.id) - boostRank(a.id)) || (b.rating ?? 0) - (a.rating ?? 0)
      );
    } else if (sortFilter === "bookings") {
      const counts = todayCounts ?? new Map<string, number>();
      list = [...(barbers ?? [])].sort(
        (a, b) =>
          (boostRank(b.id) - boostRank(a.id)) ||
          (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
      );
    }

    if (!term) return list;
    return list.filter((b) => b.brandName.toLowerCase().includes(term));
  }, [sortedBarbers, barbers, searchTerm, sortFilter, todayCounts, boostedIds]);

  const favoriteBarbers = sortedBarbers.filter((b) => favorites.includes(b.id));


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF5A6E]" />
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
      <div className="dark h-screen flex w-full bg-[#000000] text-[#F2F2F7] overflow-hidden">
        <AppSidebar />
        <main className="relative flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative min-h-screen bg-[#000000] pb-28">
      <Seo
        title="Cutzio — Find Your Next Barber"
        description="Discover independent barbers and stylists near you and book appointments in seconds with Cutzioo."
        path="/find-barber"
      />
      <AnimatePresence>
        {swipeOpen && (
          <SwipeDeck
            barbers={sortedBarbers as any}
            onClose={() => setSwipeOpen(false)}
            onLike={(id) => { if (!favorites.includes(id)) toggleFavorite(id); }}
          />
        )}
      </AnimatePresence>

      {/* Page header — scrolls away naturally */}
      <PageHeader>
        <div className="relative overflow-hidden">
          {/* Ambient wash — clipped to the header so it doesn't tint the page */}
          <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-[#FF2D46]/[0.12] blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-black/80" />
          <div className="relative max-w-5xl mx-auto px-5 pt-4 pb-2">
            {/* Greeting row */}
            <div className="flex items-center justify-between gap-3">
              <Link to="/me" className="flex min-w-0 items-center gap-3 active:opacity-70 transition-opacity">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-[#1C1C1E] ring-1 ring-white/10">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[16px] font-semibold text-white">
                        {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-black bg-[#1C1C1E] px-1.5 text-[9px] font-semibold leading-[14px] text-white">
                    Client
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-white">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Welcome"}
                  </p>
                  <p className="truncate text-[12px] text-white/45">Let’s find your next cut</p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <motion.button
                  type="button"
                  aria-label="Search"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSearchOpen((v) => !v)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border transition-colors",
                    searchOpen ? "border-[#FF5A6E]/50 bg-[#FF2D46] text-white" : "border-white/10 bg-[#1C1C1E] text-white/85"
                  )}
                >
                  {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                </motion.button>
                <motion.button
                  type="button"
                  aria-label="Swipe barbers"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSwipeOpen(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#1C1C1E] text-white/85"
                >
                  <GalleryHorizontalEnd className="h-5 w-5" />
                </motion.button>
                {isMobile && <NotificationBell />}
              </div>
            </div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              onDoubleClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="mt-7 select-none text-[40px] font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-[56px]"
            >
              Find The
              <br />
              <CircledWord>Perfect</CircledWord> Barber
            </motion.h1>

            <AnimatePresence initial={false}>
              {searchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="relative mt-5">
                    <div className="relative flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.05] pl-4 pr-3 transition-colors focus-within:border-white/20 focus-within:bg-white/[0.07]">
                      <Search className="h-[17px] w-[17px] shrink-0 text-white/40" />
                      <Input
                        ref={searchRef}
                        type="text"
                        placeholder="Search barbers, styles, vibes"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 flex-1 border-0 bg-transparent px-0 text-[15px] text-white shadow-none placeholder:text-white/35 focus-visible:ring-0"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => { haptic("light"); setSearchTerm(""); searchRef.current?.focus(); }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 transition active:scale-90"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PageHeader>

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-5">
        <div className="-mx-5 mb-5 flex items-center gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-hide">
          {FILTER_OPTIONS.map((f) => {
            const active = sortFilter === f.key || (f.key === "default" && sortFilter === undefined);
            const Icon = f.icon;
            return (
              <motion.button
                key={f.key}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setSortFilter(f.key)}
                className={cn(
                  "flex h-14 shrink-0 items-center gap-2.5 rounded-[22px] border pl-1.5 text-[15px] font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-[#FF8FA3]/40 bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-2px_6px_rgba(0,0,0,0.15)] pr-2"
                    : "border-white/[0.08] bg-[#1C1C1E] text-white/80 pr-5"
                )}
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-[16px]", active ? "bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" : "bg-white/[0.06]")}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {f.label}
                {active && (
                  <span className="ml-1 flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/15">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                )}
              </motion.button>
            );
          })}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setSwipeOpen(true)}
            className="flex h-14 shrink-0 items-center gap-2.5 rounded-[22px] border border-white/[0.08] bg-[#1C1C1E] pl-1.5 pr-5 text-[15px] font-medium text-white/80"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/[0.06]">
              <GalleryHorizontalEnd className="h-[18px] w-[18px]" />
            </span>
            Swipe
          </motion.button>
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
    transition: { delay: Math.min(i, 10) * 0.04, type: "spring" as const, stiffness: 380, damping: 30 },
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

  const theme = getBarberTheme(barber.brand_color);
  const accent = theme.accent;
  const rating = barber.rating ?? 5;
  const reviews = barber.rating_count ?? 0;
  const initial = (barber.brandName || "B").trim().charAt(0).toUpperCase();
  const navigate = useNavigate();
  const detailState = {
    name: barber.brandName,
    avatar_url: barber.avatar_url,
    banner_url: barber.banner_url,
    rating: barber.rating,
    rating_count: barber.rating_count,
  };
  const openDetail = () => {
    if (!barber.booking_link) return onExpand(barber.id);
    haptic("light");
    navigate(`/b/${barber.booking_link}`, { state: detailState });
  };


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
      style={{
        borderColor: `${accent}2e`,
        backgroundImage: `radial-gradient(140% 60% at 50% 100%, ${accent}14 0%, transparent 70%)`,
      }}
    >
      {/* Header banner */}
      <div
        className="relative h-24 cursor-pointer"
        onClick={openDetail}
        style={{
          background: barber.banner_url
            ? `url(${barber.banner_url}) center/cover`
            : theme.banner,
        }}
      >
        {!barber.banner_url && (
          <>
            {/* subtle diagonal sheen so the gradient doesn't look flat */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,0.5) 0 1.5px, transparent 1.5px 16px)",
              }}
            />
            {/* big translucent initial */}
            <span
              aria-hidden
              className="absolute left-4 top-1 select-none text-[54px] font-bold leading-none text-white/20"
            >
              {initial}
            </span>
            {/* scissors watermark */}
            <Scissors
              aria-hidden
              className="absolute -right-2 top-1/2 h-20 w-20 -translate-y-1/2 rotate-[18deg] text-white/15"
            />
          </>
        )}
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
              isFavorite ? "fill-[#FF5A6E] text-[#FF5A6E]" : "text-[#8E8E93]"
            )}
          />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 -mt-10 relative cursor-pointer" onClick={openDetail}>
        <div className="flex items-end gap-3">
          {barber.avatar_url ? (
            <img
              src={barber.avatar_url}
              alt={barber.brandName}
              className="w-[68px] h-[68px] rounded-full object-cover border-[3px] border-white dark:border-[#1C1C1E] shrink-0"
              style={{ boxShadow: `0 0 0 2px ${accent}` }}
            />
          ) : (
            <div
              className="w-[68px] h-[68px] rounded-full flex items-center justify-center font-semibold text-3xl border-[3px] border-white dark:border-[#1C1C1E] shrink-0 overflow-hidden"
              style={{ background: theme.avatar, color: theme.onBase, boxShadow: `0 0 0 2px ${accent}` }}
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
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
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
          onClick={openDetail}
          className="flex-1 h-12 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
        >
          {barber.booking_link ? "Details" : isExpanded ? "Less" : "Details"}
          <motion.span animate={{ rotate: !barber.booking_link && isExpanded ? 180 : 0 }} transition={spring} className="inline-flex">
            {barber.booking_link ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.span>
        </button>
        {barber.booking_link ? (
          <Button
            onPress={() => { haptic("medium"); navigate(`/b/${barber.booking_link}`, { state: detailState }); }}
            className={cn(
              "flex-[1.4] w-full h-12 rounded-[16px] font-semibold border-0 active:scale-[0.97] transition-transform",
              !theme.isCustom && "btn-soft-dark",
            )}
            style={theme.isCustom ? {
              background: theme.button,
              color: theme.onBase,
              boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), 0 10px 22px -12px rgba(0,0,0,0.45)",
            } : undefined}
          >
            <Calendar className="w-4 h-4 mr-1.5" style={theme.isCustom ? undefined : { color: accent }} />
            Book
          </Button>
        ) : (
          <Button isDisabled className="flex-[1.4] h-12 rounded-[14px] bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#8E8E93]">
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
          <Button onPress={onExplore} className="bg-[#FF2D55] hover:bg-[#E6294D] rounded-2xl h-11 px-6">
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

function MapPoster() {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div className="flex min-h-[62vh] max-h-[620px] flex-col items-center justify-center rounded-[24px] bg-gradient-to-br from-[#FF5A6E] via-[#FF2D46] to-[#881337] p-6 text-center text-white">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
          <MapPin className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-black tracking-tight">MAP FEATURE</h2>
        <p className="mt-2 text-lg font-semibold uppercase tracking-widest">Coming Soon</p>
        <p className="mt-4 max-w-xs text-sm text-white/80">A brand new map experience for finding the best barbers near you.</p>
      </div>
    );
  }
  return (
    <img
      src="/Frame 316.webp"
      alt="Map feature coming soon"
      width={935}
      height={423}
      className="w-full max-w-md object-contain rounded-3xl"
      onError={() => setMissing(true)}
    />
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
  const [vipOnly, setVipOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [bookBarber, setBookBarber] = useState<BarberProfile | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const distanceKm = useMemo(() => {
    if (!userLocation) return (_b: BarberProfile) => null as number | null;
    return (b: BarberProfile) => {
      if (b.latitude == null || b.longitude == null) return null;
      const R = 6371, dLat = ((b.latitude - userLocation.lat) * Math.PI) / 180, dLng = ((b.longitude - userLocation.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLocation.lat * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
  }, [userLocation]);

  const located = useMemo(
    () => barbers.filter((b) => b.latitude != null && b.longitude != null),
    [barbers],
  );

  const visible = useMemo(() => {
    const term = mapSearch.trim().toLowerCase();
    const maxKm = maxDistance === "any" ? null : Number(maxDistance) * 1.609;
    const minStars = minRating === "any" ? null : Number(minRating);
    return located
      .filter((b) => !vipOnly || b.home_service)
      .filter((b) => !term || b.brandName.toLowerCase().includes(term) || (b.address ?? "").toLowerCase().includes(term))
      .filter((b) => minStars == null || (b.rating ?? 0) >= minStars)
      .filter((b) => {
        if (maxKm == null) return true;
        const d = distanceKm(b);
        return d == null || d <= maxKm;
      })
      .sort((a, b) => (distanceKm(a) ?? Infinity) - (distanceKm(b) ?? Infinity));
  }, [located, vipOnly, mapSearch, maxDistance, minRating, distanceKm]);

  const mapShops = useMemo(
    () =>
      visible.map((b) => ({
        id: b.id,
        name: b.brandName,
        location: b.home_service ? "VIP · Comes to your house" : b.address || "",
        latitude: b.latitude as number,
        longitude: b.longitude as number,
        color: getBarberTheme(b.brand_color).base,
        avatarUrl: b.avatar_url,
        initial: (b.brandName || "B").trim().charAt(0).toUpperCase(),
        vip: !!b.home_service,
      })).concat(
        visible.length ? [] : [
          { n: "Fade Factory (demo)", la: 37.9795, lo: 23.7162, c: "#FF375F", v: false },
          { n: "Kings Cut (demo)", la: 37.9838, lo: 23.7275, c: "#0A84FF", v: false },
          { n: "Royal Home Barber (demo)", la: 37.9752, lo: 23.7348, c: "#FF9F0A", v: true },
          { n: "Sharp Studio (demo)", la: 37.9701, lo: 23.7225, c: "#30D158", v: false },
        ].map((d, i) => ({ id: `demo-${i}`, name: d.n, location: d.v ? "VIP · Comes to your house" : "Demo shop", latitude: d.la, longitude: d.lo, color: d.c, avatarUrl: null, initial: d.n.charAt(0), vip: d.v })),
      ),
    [visible],
  );

  useEffect(() => {
    if (selectedId && !visible.some((b) => b.id === selectedId)) setSelectedId(null);
  }, [visible, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const el = cardsRef.current?.querySelector<HTMLElement>(`[data-barber-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  const vipCount = located.filter((b) => b.home_service).length;
  const nearStats = useMemo(() => {
    if (!userLocation) return null;
    const dists = located.map((b) => ({ b, d: distanceKm(b) ?? Infinity }));
    const near = dists.filter((x) => x.d <= 5);
    const nearest = dists.length ? Math.min(...dists.map((x) => x.d)) : null;
    return { near: near.length, vip: near.filter((x) => x.b.home_service).length, nearest: nearest === Infinity ? null : nearest };
  }, [located, userLocation, distanceKm]);

  const hasCards = visible.length > 0;
  const formatKm = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

  return (
    <div data-no-ptr className="dark fixed inset-0 z-40 overscroll-none bg-black">
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 [&_.maplibregl-ctrl-attrib]:hidden [&_.maplibregl-ctrl-logo]:hidden">
          <Suspense fallback={<div className="w-full h-full bg-[#e5e5ea] dark:bg-[#1c1c1e]" />}>
            <BarbershopMap
              barbershops={mapShops}
              onBarbershopClick={(b) => setSelectedId(b.id)}
              userLocation={userLocation || undefined}
              height="100%"
              accentColor="#FF2D46"
              hideSearch
              showControls={false}
              selectedId={selectedId}
              fitToMarkers
              recenterSignal={recenterSignal}
              showZoomControls={false}
            />
          </Suspense>
        </div>
      </div>


      {/* Top floating search + filters */}
      <div className="absolute left-0 right-0 top-0 z-20 pt-3">
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
              className="h-11 rounded-full border border-black/5 bg-white/90 pl-11 pr-4 text-[14px] shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl placeholder:text-[#8E8E93]/80 focus-visible:ring-2 focus-visible:ring-[#FF5A6E] dark:border-white/10 dark:bg-[#1C1C1E]/90"
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
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF2D46] px-1 text-[10px] font-semibold text-white shadow">
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
                            ? "bg-[#FF2D46] text-white shadow-sm"
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
                            ? "bg-[#FF2D46] text-white shadow-sm"
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
                    variant="bordered"
                    className="h-12 flex-1 rounded-full border-black/10 dark:border-white/10"
                    onPress={() => {
                      setMaxDistance("any");
                      setMinRating("any");
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    className="h-12 flex-1 rounded-full bg-[#FF2D46] text-white hover:bg-[#E0152F]"
                    onPress={() => setFiltersOpen(false)}
                  >
                    Show results
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mx-3 mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-black/5 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#FF2D46] shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/90 dark:text-[#FDA4AF]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[#FF2D46] animate-ping opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF2D46]" />
            </span>
            {visible.length} {visible.length === 1 ? "barber" : "barbers"} on map
          </div>
        </div>
      </div>


      {/* Bottom stack: controls row, then barber cards above the dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 pb-[calc(env(safe-area-inset-bottom)+5.75rem)]">
        {vipOnly && vipCount === 0 && (
          <div className="mx-6 rounded-2xl bg-[#1C1C1E]/95 p-3 text-center text-[13px] text-white/80">
            No home-visit barbers nearby yet.
          </div>
        )}
        <div className="flex items-end justify-between gap-2 px-3">
          {nearStats ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30, delay: 0.3 }}
              className="pointer-events-auto flex gap-3.5 rounded-2xl border border-white/10 bg-[#1C1C1E]/95 px-3.5 py-2 text-white shadow-[0_10px_28px_rgba(0,0,0,0.35)]"

            >
              <div><p className="text-[15px] font-semibold leading-tight">{nearStats.near}</p><p className="text-[10px] text-white/50">within 5 km</p></div>
              <div><p className="text-[15px] font-semibold leading-tight text-[#FB7185]">{nearStats.vip}</p><p className="text-[10px] text-white/50">VIP nearby</p></div>
              {nearStats.nearest != null && (
                <div><p className="text-[15px] font-semibold leading-tight">{formatKm(nearStats.nearest)}</p><p className="text-[10px] text-white/50">closest</p></div>
              )}
            </motion.div>
          ) : <span />}
          <div className="pointer-events-auto flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => setRecenterSignal((n) => n + 1)}
              aria-label="Center on my location"
              whileTap={{ scale: 0.9 }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#1C1C1E]/95 text-white shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
            >
              <LocateFixed className="h-5 w-5" />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setVipOnly((v) => !v)}
              aria-label="Show barbers who come to your house"
              aria-pressed={vipOnly}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex h-12 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-colors",
                vipOnly ? "border-[#FB7185] bg-[#FF375F] text-white" : "border-white/15 bg-[#1C1C1E]/95 text-[#FB7185]",
              )}
            >
              <span className="text-[16px] leading-none">👑</span>
              VIP{vipCount ? ` ${vipCount}` : ""}
            </motion.button>
          </div>
        </div>
        {hasCards ? (
          <div
            ref={cardsRef}
            className="pointer-events-auto flex gap-3 overflow-x-auto px-3 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visible.map((b) => (
              <MapBarberCard
                key={b.id}
                barber={b}
                selected={selectedId === b.id}
                distance={distanceKm(b)}
                formatKm={formatKm}
                onSelect={() => setSelectedId(b.id)}
                onBook={() => setBookBarber(b)}
              />
            ))}
          </div>
        ) : (
          <div className="px-3">
            <div className="pointer-events-auto mx-auto max-w-[28rem] rounded-3xl border border-black/5 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#1C1C1E]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF375F]/15">
                  <MapIcon className="h-5 w-5 text-[#FB7185]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                    {located.length > 0 ? "No barbers match" : "More pins coming soon"}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#8E8E93]">
                    {located.length > 0
                      ? "Try a different search or loosen your filters."
                      : "Barbers appear as they add their shop address in Settings."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (located.length > 0) {
                      setMapSearch("");
                      setMaxDistance("any");
                      setMinRating("any");
                      setVipOnly(false);
                    } else {
                      onBack();
                    }
                  }}
                  className="shrink-0 rounded-full bg-[#FF375F] px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition-transform active:scale-95"
                >
                  {located.length > 0 ? "Reset" : "Browse"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {bookBarber?.booking_link && (
        <QuickBookSheet
          open
          onOpenChange={(o) => { if (!o) setBookBarber(null); }}
          barberId={bookBarber.id}
          barberName={bookBarber.brandName}
          bookingLink={bookBarber.booking_link}
          accentColor={getBarberTheme(bookBarber.brand_color).accent}
        />
      )}

      <ClientMobileDock />
    </div>
  );
}

export default FindBarber;

function MapBarberCard({
  barber,
  selected,
  distance,
  formatKm,
  onSelect,
  onBook,
}: {
  barber: BarberProfile;
  selected: boolean;
  distance: number | null;
  formatKm: (d: number) => string;
  onSelect: () => void;
  onBook: () => void;
}) {
  const theme = getBarberTheme(barber.brand_color);
  const initial = (barber.brandName || "B").trim().charAt(0).toUpperCase();
  return (
    <motion.div
      data-barber-id={barber.id}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      animate={{ scale: selected ? 1 : 0.97, opacity: selected ? 1 : 0.92 }}
      transition={spring}
      className="relative w-[17.5rem] shrink-0 snap-center overflow-hidden rounded-[22px] border p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
      style={{
        borderColor: selected ? `${theme.accent}8c` : "rgba(255,255,255,0.08)",
        background: `radial-gradient(120% 90% at 0% 0%, ${theme.accent}${selected ? "33" : "1f"} 0%, transparent 60%), #1C1C1E`,
      }}
    >
      <div className="flex items-center gap-3">
        {barber.avatar_url ? (
          <img
            src={barber.avatar_url}
            alt={barber.brandName}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${theme.accent}` }}
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold"
            style={{ background: theme.avatar, color: theme.onBase, boxShadow: `0 0 0 2px ${theme.accent}` }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">
            {barber.home_service && <span className="mr-1">👑</span>}
            {barber.brandName}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/55">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span className="font-semibold text-white/85 tabular-nums">{Number(barber.rating ?? 5).toFixed(1)}</span>
            <span>({barber.rating_count ?? 0})</span>
            {distance != null && (
              <>
                <span>·</span>
                <span className="tabular-nums">{formatKm(distance)}</span>
              </>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-white/40">
            {barber.home_service ? "Comes to your house" : barber.address || "Address on request"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {barber.latitude != null && barber.longitude != null && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${barber.latitude},${barber.longitude}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-white/[0.08] text-[13px] font-semibold text-white/90 active:scale-[0.97] transition-transform"
          >
            <MapPin className="h-4 w-4" style={{ color: theme.accent }} />
            Directions
          </a>
        )}
        <button
          type="button"
          disabled={!barber.booking_link}
          onClick={(e) => { e.stopPropagation(); onBook(); }}
          className={cn(
            "flex h-10 flex-[1.3] items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-50",
            !theme.isCustom && "btn-soft-dark",
          )}
          style={theme.isCustom ? { background: theme.button, color: theme.onBase } : undefined}
        >
          <Calendar className="h-4 w-4" style={theme.isCustom ? undefined : { color: theme.accent }} />
          {barber.booking_link ? "Book" : "Unavailable"}
        </button>
      </div>
    </motion.div>
  );
}

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
        (supabase as any).rpc("get_public_agenda_settings", { _user_id: barberId }),
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
      const agenda = Array.isArray(agendaRes?.data) ? agendaRes.data[0] : agendaRes?.data;
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
                transition={{ delay: Math.min(i, 10) * 0.03, ...spring }}
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
                transition={{ delay: Math.min(i, 10) * 0.04, ...spring }}
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
