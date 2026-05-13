import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Phone,
  Scissors,
  Heart,
  Calendar,
  User,
  Clock,
  Map as MapIcon,
  Loader2,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BarbershopMap } from "@/components/BarbershopMap";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { cn } from "@/lib/utils";

interface BarberProfile {
  id: string;
  full_name: string | null;
  booking_link: string | null;
  brand_color: string | null;
  brandName: string;
  profile_photo_url?: string;
  description?: string;
  distance?: number;
}

interface ClientBooking {
  id: string;
  appointment_date: string;
  appointment_time: string;
  barber_name: string | null;
  barber_id: string;
  service_name: string | null;
  status: string;
}

type TabKey = "explore" | "map" | "bookings" | "favorites";

const TABS: { key: TabKey; label: string; icon: any; activeColor: string }[] = [
  { key: "explore", label: "Explore", icon: Search, activeColor: "#FF2D55" },
  { key: "map", label: "Map", icon: MapIcon, activeColor: "#FF2D55" },
  { key: "bookings", label: "Bookings", icon: Calendar, activeColor: "#FF2D55" },
  { key: "favorites", label: "Favorites", icon: Heart, activeColor: "#FF2D55" },
];

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

const FindBarber = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("explore");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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
      const { data, error } = await supabase.rpc("list_public_profiles");
      if (error) throw error;
      return (data || []).map((p: any): BarberProfile => ({
        id: p.id,
        full_name: p.full_name,
        booking_link: p.booking_link,
        brand_color: p.brand_color,
        brandName: p.full_name || "Barber",
      }));
    },
  });

  const { data: myBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_bookings" as any);
      if (error) {
        console.error("bookings error", error);
        return [] as ClientBooking[];
      }
      return (data || []) as ClientBooking[];
    },
  });

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = barbers ?? [];
    if (!term) return list;
    return list.filter((b) => b.brandName.toLowerCase().includes(term));
  }, [barbers, searchTerm]);

  const favoriteBarbers = (barbers ?? []).filter((b) => favorites.includes(b.id));

  // Auth gate
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
                <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
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
                <User className="w-5 h-5 text-[#FF2D55]" />
              </Button>
            </Link>
            {user && user.user_metadata?.role === 'client' && (
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:scale-95 transition-transform ml-2">
                  <User className="w-5 h-5 text-[#FF2D55]" />
                </Button>
              </Link>
            )}
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
          <div className="mt-4 relative grid grid-cols-4 gap-1 p-1 bg-[#E9E9EE] dark:bg-[#2C2C2E] rounded-2xl">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
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
              />
            )}

            {activeTab === "map" && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#1C1C1E]">
                  <BarbershopMap
                    barbershops={[]}
                    userLocation={userLocation || undefined}
                    height="460px"
                  />
                </div>
                <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 border border-black/5 dark:border-white/5">
                  <p className="text-sm text-[#8E8E93]">
                    Locations will appear here once barbers add their address.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "bookings" && (
              <BookingsList loading={bookingsLoading} items={myBookings || []} onExplore={() => setActiveTab("explore")} />
            )}

            {activeTab === "favorites" && (
              <FavoritesList
                items={favoriteBarbers}
                onToggleFavorite={toggleFavorite}
                onExplore={() => setActiveTab("explore")}
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
  onToggleFavorite,
  isExpanded,
  onExpand,
}: {
  barber: BarberProfile;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isExpanded?: boolean;
  onExpand?: () => void;
}) {
  const accent = barber.brand_color || "#007AFF";
  return (
    <motion.div
      custom={index}
      variants={cardItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className={`rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 overflow-hidden shadow-sm ${isExpanded ? 'scale-105' : ''}`}
      onClick={onExpand}
    >
      <div className="p-4 flex items-start gap-3">
          <img src="/logo.svg" alt="Logo" className="w-14 h-14" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
            {barber.brandName}
          </h3>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">Independent stylist</p>
        </div>
        <button
          onClick={() => onToggleFavorite(barber.id)}
          className="p-2 -mr-2 -mt-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-90"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isFavorite ? "fill-[#FF2D55] text-[#FF2D55]" : "text-[#8E8E93]"
            )}
          />
        </button>
      </div>
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

function ExploreList({
  loading,
  items,
  favorites,
  onToggleFavorite,
  searchTerm,
}: {
  loading: boolean;
  items: BarberProfile[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  searchTerm: string;
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((b, i) => (
        <BarberCard
          key={b.id}
          barber={b}
          index={i}
          isFavorite={favorites.includes(b.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

function BookingsList({
  loading,
  items,
  onExplore,
}: {
  loading: boolean;
  items: ClientBooking[];
  onExplore: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/60 dark:bg-[#1C1C1E]/60 animate-pulse" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-9 h-9 text-[#8E8E93]" />}
        title="No bookings yet"
        subtitle="Your appointments will show up here"
        action={
          <Button onClick={onExplore} className="bg-[#007AFF] hover:bg-[#0062CC] rounded-2xl h-11 px-6">
            <Search className="w-4 h-4 mr-2" /> Find barbers
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((b, i) => (
        <motion.div
          key={b.id}
          custom={i}
          variants={cardItem}
          initial="hidden"
          animate="show"
          className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                  {b.barber_name || "Barber"}
                </p>
                <p className="text-sm text-[#8E8E93] truncate">{b.service_name || "Service"}</p>
              </div>
            </div>
            <Badge
              className={cn(
                "rounded-full font-medium",
                b.status === "confirmed" && "bg-[#34C759]/10 text-[#34C759]",
                b.status === "scheduled" && "bg-[#007AFF]/10 text-[#007AFF]",
                b.status === "pending" && "bg-[#FF9500]/10 text-[#FF9500]",
                b.status === "cancelled" && "bg-[#FF3B30]/10 text-[#FF3B30]"
              )}
            >
              {b.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-[#8E8E93]">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {b.appointment_date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {b.appointment_time?.slice(0, 5)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FavoritesList({
  items,
  onToggleFavorite,
  onExplore,
}: {
  items: BarberProfile[];
  onToggleFavorite: (id: string) => void;
  onExplore: () => void;
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((b, i) => (
        <BarberCard key={b.id} barber={b} index={i} isFavorite={true} onToggleFavorite={onToggleFavorite} />
      ))}
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
      className="text-center py-20"
    >
      <div className="w-20 h-20 mx-auto rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{title}</h3>
      <p className="text-sm text-[#8E8E93] mt-1 mb-5">{subtitle}</p>
      {action}
    </motion.div>
  );
}

export default FindBarber;
