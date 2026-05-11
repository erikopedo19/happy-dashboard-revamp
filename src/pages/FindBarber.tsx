import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Scissors, 
  Heart, 
  Calendar, 
  User, 
  Star,
  Clock,
  Navigation,
  ChevronRight,
  Map as MapIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BarbershopMap } from "@/components/BarbershopMap";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { cn } from "@/lib/utils";

interface BarberProfile {
  id: string;
  full_name: string | null;
  booking_link: string | null;
  brandName: string;
  about: string | null;
  industry: string | null;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  latitude?: number;
  longitude?: number;
}

interface ClientBooking {
  id: string;
  appointment_date: string;
  appointment_time: string;
  barber_name: string;
  barber_id: string;
  service_name: string;
  status: string;
}

const FindBarber = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("explore");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteBarbers');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermission(true);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationPermission(false);
          // Default to NYC
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      setLocationPermission(false);
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (barberId: string) => {
    const newFavorites = favorites.includes(barberId)
      ? favorites.filter(id => id !== barberId)
      : [...favorites, barberId];
    setFavorites(newFavorites);
    localStorage.setItem('favoriteBarbers', JSON.stringify(newFavorites));
  };

  // Fetch barbers with location data
  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['find-barbers'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .rpc('list_public_profiles');
      
      if (error) throw error;

      // Get brand profiles with locations
      const { data: brandProfiles } = await (supabase as any)
        .from('brand_profiles')
        .select('id, name, location, latitude, longitude, contact_phone');

      const brandMap = new Map(brandProfiles?.map((b: any) => [b.id, b]) || []);

      return profiles.map((profile: any) => {
        const brand = brandMap.get(profile.id);
        return {
          ...profile,
          brandName: brand?.name || profile.full_name || 'Unknown Barber',
          location: brand?.location || null,
          latitude: brand?.latitude || null,
          longitude: brand?.longitude || null,
          contactPhone: brand?.contact_phone || null,
        };
      }) as BarberProfile[];
    },
  });

  // Fetch client bookings if logged in
  const { data: myBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // This would need a proper query based on your appointments table structure
      // Assuming there's a way to query by customer_email or similar
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          stylist:stylist_id(full_name),
          service:service_id(name)
        `)
        .eq('customer_email', user.email)
        .order('appointment_date', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }
      
      return data?.map((booking: any) => ({
        id: booking.id,
        appointment_date: booking.appointment_date,
        appointment_time: booking.appointment_time,
        barber_name: booking.stylist?.full_name || 'Unknown',
        barber_id: booking.stylist_id,
        service_name: booking.service?.name || 'Service',
        status: booking.status,
      })) as ClientBooking[] || [];
    },
    enabled: !!user,
  });

  // Calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter and sort barbers
  const filteredBarbers = barbers?.filter(barber =>
    barber.brandName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barber.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const sortedBarbers = userLocation
    ? filteredBarbers
        .map(b => ({
          ...b,
          distance: b.latitude && b.longitude
            ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
            : Infinity,
        }))
        .sort((a, b) => (a.distance as number) - (b.distance as number))
    : filteredBarbers;

  const favoriteBarbers = barbers?.filter(b => favorites.includes(b.id)) || [];

  const barbersForMap = sortedBarbers
    .filter(b => b.latitude && b.longitude)
    .map(b => ({
      id: b.id,
      name: b.brandName,
      location: b.location || '',
      latitude: b.latitude,
      longitude: b.longitude,
      contact_phone: b.contactPhone || undefined,
    }));

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-24">
      {/* Modern iOS Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-[#C6C6C8] dark:border-[#2C2C2E]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">Cutzio</h1>
                <p className="text-xs text-[#8E8E93] dark:text-gray-500">Find your barber</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {user ? (
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <User className="w-5 h-5 text-[#007AFF]" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="rounded-full border-[#007AFF] text-[#007AFF]">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93] dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Search barbers by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-full rounded-2xl border-[#C6C6C8] dark:border-[#2C2C2E] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          {/* Location Status */}
          {locationPermission === false && (
            <p className="text-xs text-[#FF3B30] mt-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location access denied. Showing default results.
            </p>
          )}
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-white dark:bg-[#1C1C1E] p-1 rounded-2xl border border-[#C6C6C8] dark:border-[#2C2C2E] mb-4">
            <TabsTrigger value="explore" className="flex-1 rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-[#007AFF]">
              <Search className="w-4 h-4 mr-1" />
              Explore
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1 rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-[#007AFF]">
              <MapIcon className="w-4 h-4 mr-1" />
              Map
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1 rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-[#007AFF]">
              <Calendar className="w-4 h-4 mr-1" />
              My Bookings
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 rounded-xl data-[state=active]:bg-[#F2F2F7] dark:data-[state=active]:bg-[#2C2C2E] data-[state=active]:text-[#FF2D55]">
              <Heart className="w-4 h-4 mr-1" />
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* Explore Tab */}
          <TabsContent value="explore" className="mt-0">
            {barbersLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#007AFF] border-t-transparent mb-4"></div>
                <p className="text-[#8E8E93] dark:text-gray-500">Finding barbers near you...</p>
              </div>
            ) : sortedBarbers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Scissors className="w-10 h-10 text-[#8E8E93]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mb-2">No barbers found</h3>
                <p className="text-[#8E8E93] dark:text-gray-500">
                  {searchTerm ? 'Try adjusting your search.' : 'No barbers available in your area yet.'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedBarbers.map((barber) => (
                  <Card key={barber.id} className="bg-white dark:bg-[#1C1C1E] border border-[#C6C6C8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        {barber.logoUrl ? (
                          <img
                            src={barber.logoUrl}
                            alt={barber.brandName}
                            className="w-14 h-14 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center">
                            <Scissors className="w-7 h-7 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                            {barber.brandName}
                          </CardTitle>
                          {barber.location && (
                            <div className="flex items-center gap-1 text-xs text-[#8E8E93] dark:text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{barber.location}</span>
                            </div>
                          )}
                          {'distance' in barber && barber.distance !== Infinity && (
                            <p className="text-xs font-medium text-[#007AFF] mt-1">
                              {(barber.distance as number).toFixed(1)} mi away
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-8 w-8 shrink-0"
                          onClick={() => toggleFavorite(barber.id)}
                        >
                          <Heart 
                            className={cn(
                              "w-5 h-5 transition-colors",
                              favorites.includes(barber.id) 
                                ? "fill-[#FF2D55] text-[#FF2D55]" 
                                : "text-[#8E8E93] dark:text-gray-500"
                            )} 
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {barber.about && (
                        <p className="text-sm text-[#8E8E93] dark:text-gray-500 line-clamp-2 mb-3">
                          {barber.about}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {barber.booking_link ? (
                          <Link to={`/book/${barber.booking_link}`} className="flex-1">
                            <Button className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl">
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Now
                            </Button>
                          </Link>
                        ) : (
                          <Button disabled className="flex-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#8E8E93] rounded-xl">
                            Not Available
                          </Button>
                        )}
                        
                        {barber.contactPhone && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="rounded-xl border-[#C6C6C8] dark:border-[#2C2C2E]"
                            onClick={() => window.open(`tel:${barber.contactPhone}`)}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="mt-0">
            <Card className="border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                <BarbershopMap
                  barbershops={barbersForMap}
                  userLocation={userLocation || undefined}
                  height="500px"
                />
              </CardContent>
            </Card>
            
            {/* Nearby List Below Map */}
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#8E8E93] dark:text-gray-500 uppercase tracking-wide">
                Nearby Barbers
              </h3>
              {sortedBarbers.slice(0, 5).map((barber) => (
                <div 
                  key={barber.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-[#C6C6C8] dark:border-[#2C2C2E]"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center shrink-0">
                    <Scissors className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{barber.brandName}</p>
                    <p className="text-xs text-[#8E8E93] dark:text-gray-500 truncate">{barber.location}</p>
                  </div>
                  {'distance' in barber && barber.distance !== Infinity && (
                    <Badge variant="secondary" className="shrink-0 bg-[#007AFF]/10 text-[#007AFF]">
                      {(barber.distance as number).toFixed(1)} mi
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* My Bookings Tab */}
          <TabsContent value="bookings" className="mt-0">
            {!user ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-[#8E8E93]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mb-2">Sign in to see your bookings</h3>
                <p className="text-[#8E8E93] dark:text-gray-500 mb-4">Track all your appointments in one place</p>
                <Link to="/auth">
                  <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl">
                    Sign In
                  </Button>
                </Link>
              </div>
            ) : bookingsLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#007AFF] border-t-transparent mb-4"></div>
                <p className="text-[#8E8E93] dark:text-gray-500">Loading your bookings...</p>
              </div>
            ) : myBookings && myBookings.length > 0 ? (
              <div className="space-y-3">
                {myBookings.map((booking) => (
                  <Card key={booking.id} className="bg-white dark:bg-[#1C1C1E] border border-[#C6C6C8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{booking.barber_name}</p>
                            <p className="text-sm text-[#8E8E93] dark:text-gray-500">{booking.service_name}</p>
                          </div>
                        </div>
                        <Badge 
                          className={cn(
                            "rounded-full",
                            booking.status === 'confirmed' && "bg-[#34C759]/10 text-[#34C759]",
                            booking.status === 'pending' && "bg-[#FF9500]/10 text-[#FF9500]",
                            booking.status === 'cancelled' && "bg-[#FF3B30]/10 text-[#FF3B30]"
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-[#8E8E93] dark:text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {booking.appointment_date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.appointment_time}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-[#8E8E93]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mb-2">No bookings yet</h3>
                <p className="text-[#8E8E93] dark:text-gray-500 mb-4">Start booking with your favorite barbers</p>
                <Button 
                  onClick={() => setActiveTab('explore')}
                  className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Find Barbers
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="mt-0">
            {favoriteBarbers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#FFE5E8] dark:bg-[#2C2C2E] rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-[#FF2D55]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mb-2">No favorites yet</h3>
                <p className="text-[#8E8E93] dark:text-gray-500 mb-4">Save your favorite barbers for quick access</p>
                <Button 
                  onClick={() => setActiveTab('explore')}
                  className="bg-[#FF2D55] hover:bg-[#E6294D] text-white rounded-xl"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Explore Barbers
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteBarbers.map((barber) => (
                  <Card key={barber.id} className="bg-white dark:bg-[#1C1C1E] border border-[#C6C6C8] dark:border-[#2C2C2E] rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#FF2D55] to-[#FF6B8A] rounded-2xl flex items-center justify-center">
                          <Heart className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                            {barber.brandName}
                          </CardTitle>
                          {barber.location && (
                            <div className="flex items-center gap-1 text-xs text-[#8E8E93] dark:text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{barber.location}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-8 w-8 shrink-0"
                          onClick={() => toggleFavorite(barber.id)}
                        >
                          <Heart className="w-5 h-5 fill-[#FF2D55] text-[#FF2D55]" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2">
                        {barber.booking_link ? (
                          <Link to={`/book/${barber.booking_link}`} className="flex-1">
                            <Button className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl">
                              <Calendar className="w-4 h-4 mr-2" />
                              Book Now
                            </Button>
                          </Link>
                        ) : (
                          <Button disabled className="flex-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#8E8E93] rounded-xl">
                            Not Available
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Client Mobile Dock */}
      <ClientMobileDock />
    </div>
  );
};

export default FindBarber;
