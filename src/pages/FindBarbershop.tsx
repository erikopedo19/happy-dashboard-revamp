import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarbershopMap } from "@/components/BarbershopMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Navigation, Phone, MapPin, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Barbershop {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
}

const FindBarbershop = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: barbershops, isLoading } = useQuery({
    queryKey: ["public-barbershops"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, business_name, full_name, address, latitude, longitude, phone")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) throw error;
      return ((data || []) as any[]).map((p) => ({
        id: p.id,
        name: p.business_name || p.full_name || "Barbershop",
        location: p.address || "",
        latitude: p.latitude,
        longitude: p.longitude,
        contact_phone: p.phone || undefined,
      })) as Barbershop[];
    },
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Default to New York City if geolocation fails
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, []);

  const filteredBarbershops = barbershops?.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.location && b.location.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const sortedBarbershops = userLocation
    ? filteredBarbershops
        .map((b) => ({
          ...b,
          distance: b.latitude && b.longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
            : Infinity,
        }))
        .sort((a, b) => (a.distance as number) - (b.distance as number))
    : filteredBarbershops;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border-b border-[#C6C6C8] dark:border-[#2C2C2E]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                Find Barbershops
              </h1>
              <p className="text-sm text-[#8E8E93] dark:text-gray-500">
                Discover barbershops near you
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93] dark:text-gray-500" />
              <Input
                placeholder="Search barbershops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-[#1C1C1E] border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] overflow-hidden">
              <CardHeader>
                <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">
                  Map View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarbershopMap
                  barbershops={sortedBarbershops}
                  userLocation={userLocation || undefined}
                  height="500px"
                  onBarbershopClick={setSelectedBarbershop}
                />
              </CardContent>
            </Card>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                Nearby Barbershops
              </h2>
              <span className="text-sm text-[#8E8E93] dark:text-gray-500">
                {sortedBarbershops.length} found
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-[#8E8E93] dark:text-gray-500">
                Loading barbershops...
              </div>
            ) : sortedBarbershops.length === 0 ? (
              <Card className="border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <MapPin className="h-12 w-12 text-[#8E8E93] dark:text-gray-500 mb-4" />
                  <p className="text-[#8E8E93] dark:text-gray-500">No barbershops found</p>
                </CardContent>
              </Card>
            ) : (
              sortedBarbershops.map((barbershop) => (
                <Card
                  key={barbershop.id}
                  className={cn(
                    "border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:shadow-md transition-all cursor-pointer",
                    selectedBarbershop?.id === barbershop.id && "ring-2 ring-[#007AFF]"
                  )}
                  onClick={() => setSelectedBarbershop(barbershop)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                          {barbershop.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-[#8E8E93] dark:text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {barbershop.location}
                        </div>
                      </div>
                      {"distance" in barbershop && barbershop.distance !== Infinity && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#007AFF]">
                            {(barbershop.distance as number).toFixed(1)} mi
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {barbershop.contact_phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${barbershop.contact_phone}`);
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      )}
                      {userLocation && barbershop.latitude && barbershop.longitude && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${barbershop.latitude},${barbershop.longitude}`
                            );
                          }}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Directions
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile Map Toggle */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
        <Button
          className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-lg"
          onClick={() => {
            const mapElement = document.querySelector(".leaflet-container");
            mapElement?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <MapPin className="h-4 w-4 mr-2" />
          View on Map
        </Button>
      </div>
    </div>
  );
};

export default FindBarbershop;
