
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, MapPin, Phone, Mail, Scissors, Home } from "lucide-react";
import { Link } from "react-router-dom";

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
}

const FindBarber = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all profiles with booking links and brand profiles
  const { data: barbers, isLoading } = useQuery({
    queryKey: ['find-barber'],
    queryFn: async () => {
      console.log('Fetching all barber profiles');
      
      // Get profiles with booking links (via secure RPC)
      const { data: profiles, error: profilesError } = await supabase
        .rpc('list_public_profiles');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get brand profiles for additional info
      const { data: brandProfiles, error: brandError } = await supabase
        .from('brand_profiles')
        .select('user_id, name, about, industry, location, contact_email, contact_phone, logo_url');
      
      if (brandError) {
        console.error('Error fetching brand profiles:', brandError);
      }

      // Combine the data
      const combinedData: BarberProfile[] = profiles.map(profile => {
        const brandProfile = brandProfiles?.find(bp => bp.user_id === profile.id);
        return {
          ...profile,
          brandName: brandProfile?.name || profile.full_name || 'Unknown Barber',
          about: brandProfile?.about,
          industry: brandProfile?.industry,
          location: brandProfile?.location,
          contactEmail: brandProfile?.contact_email,
          contactPhone: brandProfile?.contact_phone,
          logoUrl: brandProfile?.logo_url
        };
      });

      console.log('Combined barber data:', combinedData);
      return combinedData;
    },
  });

  const filteredBarbers = barbers?.filter(barber =>
    barber.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barber.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barber.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Public Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">BarberBook</h1>
            </div>
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-sm">
                <Home className="w-4 h-4 mr-2" />
                Business Login
              </Button>
            </Link>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Find Your Perfect Barber
            </h2>
            <p className="text-slate-600">Browse and book appointments with local barbers</p>
          </div>

          {/* Compact Search Bar */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, service, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Finding barbers near you...</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && filteredBarbers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No barbers found</h3>
            <p className="text-slate-600">
              {searchTerm ? 'Try adjusting your search terms.' : 'No barbers have set up their booking pages yet.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBarbers.map((barber) => (
              <Card key={barber.id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {barber.logoUrl ? (
                      <img
                        src={barber.logoUrl}
                        alt={`${barber.brandName} logo`}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Scissors className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 leading-tight">
                        {barber.brandName}
                      </CardTitle>
                      {barber.industry && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {barber.industry}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {barber.about && (
                    <p className="text-slate-600 text-sm line-clamp-2">{barber.about}</p>
                  )}
                  
                  <div className="space-y-2">
                    {barber.location && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{barber.location}</span>
                      </div>
                    )}
                    {barber.contactPhone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{barber.contactPhone}</span>
                      </div>
                    )}
                    {barber.contactEmail && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{barber.contactEmail}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {barber.booking_link ? (
                      <Link to={`/book/${barber.booking_link}`}>
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2">
                          <ExternalLink className="w-3.5 h-3.5 mr-2" />
                          Book Appointment
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled size="sm" className="w-full bg-slate-400 text-white cursor-not-allowed py-2 text-sm">
                        Booking Not Available
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindBarber;
