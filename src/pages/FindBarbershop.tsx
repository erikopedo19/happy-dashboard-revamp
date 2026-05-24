import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarbershopMap } from "@/components/BarbershopMap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Navigation, MapPin, Star, Users, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

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

const FindBarbershop = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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
        (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserLocation({ lat: 40.7128, lng: -74.006 })
      );
    } else setUserLocation({ lat: 40.7128, lng: -74.006 });
  }, []);

  const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const shops = useMemo(() => {
    const filtered = (data || []).filter((s) => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!userLocation) return filtered.map((s) => ({ ...s, distance: Infinity }));
    return filtered
      .map((s) => ({
        ...s,
        distance: s.latitude && s.longitude ? distance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [data, searchTerm, userLocation]);

  const mapPins = shops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      name: s.name,
      location: s.kind === "team" ? s.address || "" : "",
      latitude: s.latitude!,
      longitude: s.longitude!,
    }));

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-24">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Find Barbershops</h1>
              <p className="text-sm text-[#8E8E93]">Discover shops & stylists near you</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Input
                placeholder="Search shops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full bg-white dark:bg-[#1C1C1E]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden rounded-3xl border-black/5 dark:border-white/10">
            <CardContent className="p-0">
              <BarbershopMap
                barbershops={mapPins as any}
                userLocation={userLocation || undefined}
                height="560px"
                onBarbershopClick={(b: any) => setSelectedId(b.id)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold">Nearby</h2>
            <span className="text-xs text-[#8E8E93]">{shops.length} found</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-[#8E8E93]">Loading…</div>
          ) : shops.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-[#8E8E93] mb-3" />
                <p className="text-[#8E8E93]">No public shops yet</p>
              </CardContent>
            </Card>
          ) : (
            shops.map((s) => <ShopCard key={s.id} shop={s} selected={selectedId === s.id} onSelect={() => setSelectedId(s.id)} userLocation={userLocation} />)
          )}
        </div>
      </div>
    </div>
  );
};

const ShopCard = ({ shop, selected, onSelect, userLocation }: { shop: Shop & { distance?: number }; selected: boolean; onSelect: () => void; userLocation: { lat: number; lng: number } | null }) => {
  const banner = shop.kind === "solo" ? shop.banner_url : shop.banner_url;
  const avatar = shop.kind === "solo" ? shop.avatar_url : shop.logo_url;
  const accent = shop.kind === "solo" ? shop.brand_color : shop.color || "#e0c4a8";

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "rounded-3xl overflow-hidden cursor-pointer transition-all border-black/5 dark:border-white/10 bg-white dark:bg-[#1C1C1E] hover:shadow-xl hover:-translate-y-0.5",
        selected && "ring-2 ring-[#FF2D55]"
      )}
    >
      <div className="relative h-28 w-full overflow-hidden" style={{ background: banner ? undefined : `linear-gradient(135deg, ${accent}, #00000020)` }}>
        {banner && <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 right-3 flex gap-1">
          {shop.kind === "team" && <Badge className="bg-white/90 text-black hover:bg-white"><Users className="h-3 w-3 mr-1" />Team</Badge>}
          {shop.kind === "solo" && <Badge className="bg-white/90 text-black hover:bg-white"><Scissors className="h-3 w-3 mr-1" />Solo</Badge>}
        </div>
        <div className="absolute -bottom-6 left-4">
          <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-[#1C1C1E]">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback style={{ background: accent }}>{shop.name?.[0]}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardContent className="pt-8 pb-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{shop.name}</h3>
            {shop.kind === "solo" ? (
              <div className="flex items-center gap-1 text-xs text-[#8E8E93] mt-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {shop.rating.toFixed(1)} <span>·</span> {shop.rating_count} reviews
              </div>
            ) : (
              <div className="text-xs text-[#8E8E93] mt-0.5 truncate">{shop.address || "Team shop"}</div>
            )}
          </div>
          {shop.distance !== undefined && shop.distance !== Infinity && (
            <div className="text-xs font-semibold text-[#FF2D55] whitespace-nowrap">{shop.distance.toFixed(1)} mi</div>
          )}
        </div>

        {shop.kind === "team" && shop.stylists?.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-[#8E8E93] mb-2">Stylists</p>
            <div className="flex flex-wrap gap-2">
              {shop.stylists.slice(0, 6).map((st) => (
                <div key={st.id} className="flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full pr-2.5 py-0.5 pl-0.5">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={st.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{st.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{st.name}</span>
                </div>
              ))}
              {shop.stylists.length > 6 && <span className="text-xs text-[#8E8E93] self-center">+{shop.stylists.length - 6}</span>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          {shop.kind === "solo" && shop.booking_link && (
            <Button
              size="sm"
              className="flex-1 rounded-full bg-[#FF2D55] hover:bg-[#FF1744] text-white"
              onClick={(e) => { e.stopPropagation(); window.location.href = `/book/${shop.booking_link}`; }}
            >
              Book Now
            </Button>
          )}
          {userLocation && shop.latitude && shop.longitude && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-full"
              onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`); }}
            >
              <Navigation className="h-3.5 w-3.5 mr-1.5" /> Directions
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FindBarbershop;
