import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BarbershopMap } from "@/components/BarbershopMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Search,
  Navigation,
  MapPin,
  Star,
  Scissors,
  SlidersHorizontal,
  LocateFixed,
  Heart,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { Seo } from "@/components/Seo";

type SoloShop = {
  kind: "solo";
  id: string;
  name: string;
  booking_link: string | null;
  brand_color: string;
  avatar_url: string | null;
  banner_url: string | null;
  rating: number;
  rating_count: number;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
};

type TeamShop = {
  kind: "team";
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  color: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  stylists: Array<{ id: string; name: string; title: string | null; avatar_url: string | null; specialties: string[] | null }>;
};

type Shop = SoloShop | TeamShop;
type ShopTypeFilter = "all" | "solo" | "team";
type ShopSort = "distance" | "rating" | "name";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const FindBarbershop = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ShopTypeFilter>("all");
  const [sortBy, setSortBy] = useState<ShopSort>("distance");

  const { data, isLoading } = useQuery({
    queryKey: ["public-shops"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_public_shops");
      if (error) throw error;
      const solo = (data?.solo || []) as SoloShop[];
      const teams = (data?.teams || []) as TeamShop[];
      return [...solo, ...teams] as Shop[];
    },
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => setUserLocation({ lat: 40.7128, lng: -74.006 }),
      );
    } else {
      setUserLocation({ lat: 40.7128, lng: -74.006 });
    }
  }, []);

  const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const shops = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = (data || []).filter((shop) => {
      const matchesSearch = !term || shop.name?.toLowerCase().includes(term);
      const matchesType = typeFilter === "all" || shop.kind === typeFilter;
      return matchesSearch && matchesType;
    });

    const withDistance = base.map((shop) => ({
      ...shop,
      distance:
        userLocation && shop.latitude && shop.longitude
          ? distance(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude)
          : Infinity,
    }));

    return withDistance.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rating") {
        const ratingA = a.kind === "solo" ? a.rating : 0;
        const ratingB = b.kind === "solo" ? b.rating : 0;
        return ratingB - ratingA;
      }
      return a.distance - b.distance;
    });
  }, [data, searchTerm, typeFilter, sortBy, userLocation]);

  const mapPins = shops
    .filter((shop) => shop.latitude && shop.longitude)
    .map((shop) => ({
      id: shop.id,
      name: shop.name,
      location: shop.kind === "team" ? shop.address || "" : "",
      latitude: shop.latitude!,
      longitude: shop.longitude!,
      contact_phone: undefined,
    }));

  const filterCount = Number(typeFilter !== "all") + Number(sortBy !== "distance") + Number(Boolean(searchTerm.trim()));

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setSortBy("distance");
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-32">
      <Seo
        title="Find Barbershops Near You — Cutzioo"
        description="Browse nearby barbershops by location, rating, and shop type. Book your next haircut in seconds with Cutzioo."
        path="/find-barbershop"
      />
      <div className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/85">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FF2D55]/10 px-3 py-1 text-[11px] font-semibold text-[#FF2D55]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Nearby barbershops
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] sm:text-3xl">
                  Find barbershops
                </h1>
                <p className="mt-1 text-sm text-[#8E8E93]">
                  Browse by location, rating, and shop type.
                </p>
              </div>

              <div className="hidden rounded-3xl bg-[#F2F2F7] px-4 py-3 text-right dark:bg-[#2C2C2E] sm:block">
                <div className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{shops.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-[#8E8E93]">matches</div>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
                <Input
                  placeholder="Search shops..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-12 rounded-2xl border-transparent bg-[#F2F2F7] pl-11 text-[#1C1C1E] shadow-none placeholder:text-[#8E8E93] focus-visible:ring-2 focus-visible:ring-[#FF2D55] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFiltersOpen(true)}
                className="h-12 rounded-2xl border-black/10 bg-white px-4 dark:border-white/10 dark:bg-[#1C1C1E]"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {filterCount > 0 && (
                  <span className="ml-2 rounded-full bg-[#FF2D55] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {filterCount}
                  </span>
                )}
              </Button>
            </div>

            <div className="md:hidden">
              <Button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex h-13 w-full items-center justify-between rounded-3xl bg-[#1C1C1E] px-4 text-left text-white shadow-lg shadow-black/10 hover:bg-[#1C1C1E]/95"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                    <Search className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Search & filters</span>
                    <span className="text-xs text-white/65">
                      {searchTerm ? searchTerm : "Tap to refine your map"}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {filterCount > 0 ? `${filterCount} active` : "Open"}
                </span>
              </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {[
                { label: "All", value: "all" as const },
                { label: "Solo", value: "solo" as const },
                { label: "Teams", value: "team" as const },
              ].map((item) => {
                const active = typeFilter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTypeFilter(item.value)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#1C1C1E] text-white shadow-sm dark:bg-[#F2F2F7] dark:text-[#1C1C1E]"
                        : "bg-white text-[#3C3C43] ring-1 ring-black/5 dark:bg-[#1C1C1E] dark:text-[#F2F2F7] dark:ring-white/10",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden flex-wrap gap-2 md:flex">
              {[
                { label: "All", value: "all" as const },
                { label: "Solo", value: "solo" as const },
                { label: "Teams", value: "team" as const },
              ].map((item) => {
                const active = typeFilter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTypeFilter(item.value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#1C1C1E] text-white shadow-sm dark:bg-[#F2F2F7] dark:text-[#1C1C1E]"
                        : "bg-[#F2F2F7] text-[#3C3C43] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-4 sm:px-4 lg:grid-cols-5 lg:px-4 lg:py-6">
        <div className="space-y-4 lg:col-span-3">
          <div className="grid grid-cols-3 gap-3 md:hidden">
            <MiniMetric label="Matches" value={String(shops.length)} />
            <MiniMetric label="Saved" value={String(0)} />
            <MiniMetric label="Type" value={typeFilter === "all" ? "All" : typeFilter === "solo" ? "Solo" : "Team"} />
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
            <div className="p-3 sm:p-4">
              <BarbershopMap
                barbershops={mapPins as any}
                userLocation={userLocation || undefined}
                height="min(62vh, 620px)"
                showControls={false}
                onBarbershopClick={(shop: any) => setSelectedId(shop.id)}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E] md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Nearby results</p>
                <p className="text-xs text-[#8E8E93]">{shops.length} places on the map</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFiltersOpen(true)}
                className="h-9 rounded-full px-3 text-[#FF2D55] hover:bg-[#FF2D55]/10 hover:text-[#FF2D55]"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Adjust
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="hidden items-center justify-between px-1 md:flex">
            <h2 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Nearby</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#F2F2F7] px-3 py-1 text-xs text-[#8E8E93] dark:bg-[#2C2C2E]">
                {shops.length} found
              </span>
              <button
                type="button"
                onClick={() => setSortBy("distance")}
                className="rounded-full bg-[#F2F2F7] px-3 py-1 text-xs text-[#3C3C43] transition-colors hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:text-[#F2F2F7] dark:hover:bg-[#3A3A3C]"
              >
                Nearby first
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[24px] border border-black/5 bg-white p-10 text-center text-[#8E8E93] shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
              Loading...
            </div>
          ) : shops.length === 0 ? (
            <div className="rounded-[24px] border border-black/5 bg-white p-10 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
              <EmptyState
                icon={<MapPin className="h-9 w-9 text-[#8E8E93]" />}
                title="No public shops yet"
                subtitle={searchTerm ? "Try another search or clear filters." : "New shops will appear here once they go live."}
                action={
                  <Button onClick={resetFilters} className="rounded-2xl bg-[#FF2D55] px-5 text-white hover:bg-[#FF1744]">
                    Reset filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {shops.map((shop, index) => (
                <Fragment key={shop.id}>
                  <BarberCard
                    barber={shop}
                    index={index}
                    isFavorite={false}
                    isExpanded={selectedId === shop.id}
                    onToggleFavorite={() => {}}
                    onExpand={() => setSelectedId(selectedId === shop.id ? null : shop.id)}
                    userLocation={userLocation}
                  />
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className="border-t border-black/5 bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] dark:border-white/10 dark:bg-[#1C1C1E]">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">Search & filters</DrawerTitle>
            <DrawerDescription className="text-[#8E8E93]">
              Find the right shop faster with a clean search and simple filters.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-0 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
              <Input
                autoFocus
                placeholder="Search shops..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-12 rounded-2xl border-black/10 bg-[#F2F2F7] pl-11 dark:border-white/10 dark:bg-[#2C2C2E]"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">Shop type</p>
              <div className="flex gap-2">
                {[
                  { label: "All", value: "all" as const },
                  { label: "Solo", value: "solo" as const },
                  { label: "Teams", value: "team" as const },
                ].map((item) => {
                  const active = typeFilter === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTypeFilter(item.value)}
                      className={cn(
                        "flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#1C1C1E] text-white dark:bg-[#F2F2F7] dark:text-[#1C1C1E]"
                          : "bg-[#F2F2F7] text-[#3C3C43] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8E8E93]">Sort by</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Nearby", value: "distance" as const },
                  { label: "Top rated", value: "rating" as const },
                  { label: "Name", value: "name" as const },
                ].map((item) => {
                  const active = sortBy === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSortBy(item.value)}
                      className={cn(
                        "rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#FF2D55] text-white"
                          : "bg-[#F2F2F7] text-[#3C3C43] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
                      () => setUserLocation({ lat: 40.7128, lng: -74.006 }),
                    );
                  }
                }}
                className="h-12 rounded-2xl"
              >
                <LocateFixed className="mr-2 h-4 w-4" />
                Use location
              </Button>
              <Button type="button" onClick={resetFilters} className="h-12 rounded-2xl bg-[#1C1C1E] text-white">
                Clear all
              </Button>
            </div>
          </div>

          <DrawerFooter className="px-0 pb-0 pt-2">
            <Button type="button" onClick={() => setFiltersOpen(false)} className="h-12 rounded-2xl bg-[#FF2D55] text-white hover:bg-[#FF1744]">
              Show {shops.length} results
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ClientMobileDock />
    </div>
  );
};

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
  userLocation,
}: {
  barber: Shop & { distance?: number };
  index: number;
  isFavorite: boolean;
  isExpanded: boolean;
  onToggleFavorite: (id: string) => void;
  onExpand: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const accent = barber.kind === "solo" ? barber.brand_color || "#007AFF" : barber.color || "#FF2D55";
  const rating = barber.kind === "solo" ? barber.rating : 5;
  const reviews = barber.kind === "solo" ? barber.rating_count : barber.stylists?.length ?? 0;
  const banner = barber.kind === "solo" ? barber.banner_url : barber.banner_url;
  const avatar = barber.kind === "solo" ? barber.avatar_url : barber.logo_url;

  return (
    <motion.div
      layout
      custom={index}
      variants={cardItem}
      initial="hidden"
      animate="show"
      transition={spring}
      className={cn(
        "overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]",
        isExpanded && "shadow-lg",
      )}
    >
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
              background: banner ? `url(${banner}) center/cover` : `linear-gradient(135deg, ${accent}, ${accent}88)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => onExpand(barber.id)} className="w-full text-left">
        <div className={cn("flex items-start gap-3 p-4", isExpanded && "-mt-8 relative")}>
          {avatar ? (
            <img
              src={avatar}
              alt={barber.name}
              className={cn(
                "shrink-0 rounded-full border-2 border-white object-cover dark:border-[#1C1C1E]",
                isExpanded ? "h-16 w-16" : "h-14 w-14",
              )}
            />
          ) : (
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-[#1C1C1E] overflow-hidden",
                isExpanded ? "h-16 w-16" : "h-14 w-14",
              )}
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            >
              <Scissors className={cn("text-white", isExpanded ? "h-8 w-8" : "h-7 w-7")} />
            </div>
          )}

          <div className="min-w-0 flex-1 pt-1">
            <h3 className="truncate text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{barber.name}</h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
              <span className="text-[12px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{Number(rating).toFixed(1)}</span>
              <span className="text-[12px] text-[#8E8E93]">({reviews})</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(barber.id);
              }}
              className="rounded-full p-2 transition-colors hover:bg-black/5 active:scale-90 dark:hover:bg-white/5"
            >
              <Heart className={cn("h-5 w-5 transition-colors", isFavorite ? "fill-[#FF2D55] text-[#FF2D55]" : "text-[#8E8E93]")} />
            </button>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={spring}>
              <ChevronDown className="h-4 w-4 text-[#8E8E93]" />
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
            {barber.description && (
              <p className="mb-3 text-[13px] leading-relaxed text-[#3C3C43] dark:text-[#EBEBF5]/80">{barber.description}</p>
            )}

            {barber.kind === "team" && barber.stylists.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#8E8E93]">Stylists</p>
                <div className="flex flex-wrap gap-2">
                  {barber.stylists.slice(0, 3).map((stylist) => (
                    <div
                      key={stylist.id}
                      className="flex items-center gap-1.5 rounded-full bg-[#F2F2F7] py-1 pl-1 pr-2.5 dark:bg-[#2C2C2E]"
                    >
                      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#1C1C1E] text-[10px] font-semibold text-white">
                        {stylist.avatar_url ? (
                          <img src={stylist.avatar_url} alt={stylist.name} className="h-full w-full object-cover" />
                        ) : (
                          stylist.name.slice(0, 1)
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{stylist.name}</span>
                    </div>
                  ))}
                  {barber.stylists.length > 3 && (
                    <span className="self-center text-xs text-[#8E8E93]">+{barber.stylists.length - 3}</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-4">
              <Stat label="Rating" value={Number(rating).toFixed(1)} />
              <Stat label="Reviews" value={String(reviews)} />
              <Stat label="Type" value={barber.kind === "solo" ? "Solo" : "Team"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {barber.kind === "solo" && barber.booking_link ? (
            <Link to={`/book/${barber.booking_link}`} className="block">
              <Button className="h-11 w-full rounded-2xl border-0 font-semibold text-white transition-opacity hover:opacity-90" style={{ background: accent }}>
                <Scissors className="mr-2 h-4 w-4" />
                Book Now
              </Button>
            </Link>
          ) : (
            <Button
              disabled
              className="h-11 w-full rounded-2xl bg-[#E5E5EA] text-[#8E8E93] dark:bg-[#2C2C2E]"
            >
              Booking unavailable
            </Button>
          )}

          {userLocation && barber.latitude && barber.longitude ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-black/10 dark:border-white/10"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${barber.latitude},${barber.longitude}`,
                )
              }
            >
              <Navigation className="mr-2 h-4 w-4" />
              Directions
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-11 rounded-2xl border-black/10 dark:border-white/10" disabled>
              Nearby view
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F2F2F7] py-2 text-center dark:bg-[#2C2C2E]">
      <div className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[#8E8E93]">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-white px-3 py-3 text-center shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[#8E8E93]">{label}</div>
    </div>
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
      className="text-center"
    >
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm dark:bg-[#1C1C1E]">
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{title}</h3>
      <p className="mt-1 text-sm text-[#8E8E93]">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export default FindBarbershop;
