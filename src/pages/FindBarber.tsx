import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ShoppingBag,
  Sparkles,
  BellRing,
  SlidersHorizontal,
  LocateFixed,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BarbershopMap } from "@/components/BarbershopMap";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BarberProfile {
  id: string;
  full_name: string | null;
  booking_link: string | null;
  brand_color: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  rating: number | null;
  rating_count: number | null;
  description: string | null;
  brandName: string;
}

type TabKey = "explore" | "map" | "favorites";

const TABS: { key: TabKey; label: string; icon: any; activeColor: string }[] = [
  { key: "explore", label: "Explore", icon: Search, activeColor: "#e11d48" },
  { key: "map", label: "Map", icon: MapIcon, activeColor: "#e11d48" },
  { key: "favorites", label: "Favorites", icon: Heart, activeColor: "#e11d48" },
];

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const FindBarber = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "explore";
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSearch, setMapSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState<"any" | "1" | "5" | "10">("any");
  const [minRating, setMinRating] = useState<"any" | "3" | "4" | "4.5">("any");

  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey | null;
    if (tab && tab !== activeTab) setActiveTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = (key: TabKey) => {
    setActiveTab(key);
    if (key === "explore") {
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

  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ["find-barbers"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_public_profiles");
      if (error) throw error;
      return (data || []).map((p: any): BarberProfile => ({
        id: p.id,
        full_name: p.full_name,
        booking_link: p.booking_link,
        brand_color: p.brand_color,
        avatar_url: p.avatar_url ?? null,
        banner_url: p.banner_url ?? null,
        rating: p.rating ?? null,
        rating_count: p.rating_count ?? null,
        description: p.description ?? null,
        brandName: p.full_name || "Barber",
      }));
    },
  });

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = barbers ?? [];
    if (!term) return list;
    return list.filter((b) => b.brandName.toLowerCase().includes(term));
  }, [barbers, searchTerm]);

  const favoriteBarbers = (barbers ?? []).filter((b) => favorites.includes(b.id));

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
        barbers={barbers ?? []}
        userLocation={userLocation}
        mapSearch={mapSearch}
        setMapSearch={setMapSearch}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        maxDistance={maxDistance}
        setMaxDistance={setMaxDistance}
        minRating={minRating}
        setMinRating={setMinRating}
        onBack={() => changeTab("explore")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-md shadow-blue-500/30">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[22px] leading-tight font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
                  Cutzio
                </h1>
                <p className="text-[11px] text-[#8E8E93]">Find your barber</p>
              </div>
            </motion.div>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:scale-95 transition-transform">
                <User className="w-5 h-5 text-[#007AFF]" />
              </Button>
            </Link>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
            <Input
              type="text"
              placeholder="Search barbers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 rounded-2xl border-transparent bg-[#E9E9EE] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            />
          </div>

          {/* Segmented Tabs */}
          <div className="mt-4 relative grid grid-cols-3 gap-1 p-1 bg-[#E9E9EE] dark:bg-[#2C2C2E] rounded-2xl">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => changeTab(t.key)}
                  className="relative h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: isActive ? t.activeColor : "#8E8E93" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tab-pill"
                      transition={spring}
                      className="absolute inset-0 bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm"
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {activeTab === "explore" && (
              <ExploreList
                loading={barbersLoading}
                items={filtered}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                searchTerm={searchTerm}
                expandedId={expandedId}
                onExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            )}

            {activeTab === "favorites" && (
              <FavoritesList
                items={favoriteBarbers}
                onToggleFavorite={toggleFavorite}
                onExplore={() => changeTab("explore")}
                expandedId={expandedId}
                onExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ClientMobileDock />
    </div>
  );
};

/* ---------- Sub-components ---------- */

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
}: {
  barber: BarberProfile;
  index: number;
  isFavorite: boolean;
  isExpanded: boolean;
  onToggleFavorite: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const accent = barber.brand_color || "#007AFF";
  const rating = barber.rating ?? 5;
  const reviews = barber.rating_count ?? 0;

  return (
    <motion.div
      layout
      custom={index}
      variants={cardItem}
      initial="hidden"
      animate="show"
      transition={spring}
      className={cn(
        "rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 overflow-hidden shadow-sm",
        isExpanded && "sm:col-span-2 lg:col-span-3 shadow-lg"
      )}
    >
      {/* Banner area – appears when expanded */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="relative w-full overflow-hidden"
            style={{
              background: barber.banner_url
                ? `url(${barber.banner_url}) center/cover`
                : `linear-gradient(135deg, ${accent}, ${accent}88)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => onExpand(barber.id)}
        className="w-full text-left"
      >
        <div className={cn("p-4 flex items-start gap-3", isExpanded && "-mt-8 relative")}>
          {barber.avatar_url ? (
            <img
              src={barber.avatar_url}
              alt={barber.brandName}
              className={cn(
                "rounded-2xl object-cover shrink-0 border-2 border-white dark:border-[#1C1C1E]",
                isExpanded ? "w-16 h-16" : "w-14 h-14"
              )}
            />
          ) : (
            <div
              className={cn(
                "rounded-2xl flex items-center justify-center shrink-0 border-2 border-white dark:border-[#1C1C1E]",
                isExpanded ? "w-16 h-16" : "w-14 h-14"
              )}
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            >
              <Scissors className={cn("text-white", isExpanded ? "w-8 h-8" : "w-7 h-7")} />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
              {barber.brandName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-[#FFB800] text-[#FFB800]" />
              <span className="text-[12px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">
                {Number(rating).toFixed(1)}
              </span>
              <span className="text-[12px] text-[#8E8E93]">({reviews})</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(barber.id);
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-90"
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-colors",
                  isFavorite ? "fill-[#FF2D55] text-[#FF2D55]" : "text-[#8E8E93]"
                )}
              />
            </button>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={spring}>
              <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
            </motion.div>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4"
          >
            <BarberExpandedDetails barberId={barber.id} fallbackDescription={barber.description} accent={accent} rating={rating} reviews={reviews} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pb-4">
        {barber.booking_link ? (
          <Link to={`/book/${barber.booking_link}`} className="block">
            <Button
              className="w-full h-11 rounded-2xl text-white font-semibold border-0 hover:opacity-90 transition-opacity"
              style={{ background: accent }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Now
            </Button>
          </Link>
        ) : (
          <Button disabled className="w-full h-11 rounded-2xl bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#8E8E93]">
            Booking unavailable
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] py-2 text-center">
      <div className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[#8E8E93]">{label}</div>
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
}: {
  loading: boolean;
  items: BarberProfile[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  searchTerm: string;
  expandedId: string | null;
  onExpand: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-3xl bg-white/60 dark:bg-[#1C1C1E]/60 animate-pulse" />
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
        <BarberCard
          key={b.id}
          barber={b}
          index={i}
          isFavorite={favorites.includes(b.id)}
          isExpanded={expandedId === b.id}
          onToggleFavorite={onToggleFavorite}
          onExpand={onExpand}
        />
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
}: {
  items: BarberProfile[];
  onToggleFavorite: (id: string) => void;
  onExplore: () => void;
  expandedId: string | null;
  onExpand: (id: string) => void;
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
        <BarberCard
          key={b.id}
          barber={b}
          index={i}
          isFavorite={true}
          isExpanded={expandedId === b.id}
          onToggleFavorite={onToggleFavorite}
          onExpand={onExpand}
        />
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
      <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center mx-auto mb-4 shadow-sm">
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
          <BarbershopMap
            barbershops={[]}
            userLocation={userLocation || undefined}
            height="100%"
            accentColor="#e11d48"
            hideSearch
            showControls={false}
          />
        </div>
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
      const [profileRes, servicesRes, hoursRes, productsRes] = await Promise.all([
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
          .from("products")
          .select("id, name, price, image_url, category")
          .eq("user_id", barberId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      return {
        profile: profileRes.data,
        services: servicesRes.data || [],
        hours: hoursRes.data || [],
        products: productsRes.data || [],
      };
    },
    staleTime: 60_000,
  });

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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Rating" value={Number(rating).toFixed(1)} />
        <Stat label="Reviews" value={String(reviews)} />
        <Stat label="Experience" value={years ? `${years}y` : "Pro"} />
      </div>

      {/* Waitlist CTA */}
      {data?.profile?.accepts_waitlist && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={joinWaitlist}
          disabled={joining || joined}
          className="w-full rounded-2xl p-3.5 flex items-center gap-3 border border-rose-500/20 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 text-left disabled:opacity-70"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
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
      {data && data.services.length > 0 && (
        <Section icon={<Award className="w-3.5 h-3.5" style={{ color: accent }} />} title="Services & rates">
          <ul className="divide-y divide-black/5 dark:divide-white/5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
            {data.services.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{s.name}</div>
                  {s.duration && (
                    <div className="text-[11px] text-[#8E8E93]">{s.duration} min</div>
                  )}
                </div>
                {s.price != null && (
                  <div className="text-[13px] font-semibold tabular-nums" style={{ color: accent }}>
                    ${Number(s.price).toFixed(0)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Working hours */}
      {data && data.hours.length > 0 && (
        <Section icon={<Clock className="w-3.5 h-3.5" style={{ color: accent }} />} title="Working hours">
          <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] p-3 grid grid-cols-1 gap-1">
            {data.hours.map((h: any) => (
              <div key={h.day_of_week} className="flex items-center justify-between text-[12px]">
                <span className="text-[#1C1C1E] dark:text-[#F2F2F7] font-medium">{DAY_NAMES[h.day_of_week] || "—"}</span>
                <span className="text-[#8E8E93] tabular-nums">
                  {h.is_closed
                    ? "Closed"
                    : `${(h.open_time || "").slice(0, 5)} – ${(h.close_time || "").slice(0, 5)}`}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Products */}
      {data && data.products.length > 0 && (
        <Section icon={<ShoppingBag className="w-3.5 h-3.5" style={{ color: accent }} />} title="Products">
          <div className="grid grid-cols-3 gap-2">
            {data.products.map((p: any) => (
              <div key={p.id} className="rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#8E8E93]" />
                  </div>
                )}
                <div className="p-2">
                  <div className="text-[11px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{p.name}</div>
                  <div className="text-[11px] font-semibold tabular-nums" style={{ color: accent }}>
                    ${Number(p.price).toFixed(0)}
                  </div>
                </div>
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
