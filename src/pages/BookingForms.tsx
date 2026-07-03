
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, User, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

const BookingForms = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all profiles with booking links and brand profiles
  const { data: brands, isLoading } = useQuery({
    queryKey: ['booking-forms'],
    queryFn: async () => {
      console.log('Fetching all booking forms');
      
      // Get profiles with booking links (via secure RPC)
      const { data: profiles, error: profilesError } = await (supabase as any)
        .rpc('list_public_profiles');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Combine the data (brand_profiles table not available)
      const combinedData = profiles.map(profile => {
        return {
          ...profile,
          brandName: profile.business_name || profile.full_name || 'Unknown Business',
          about: profile.description,
          industry: undefined as string | undefined,
          location: profile.address,
          contactEmail: profile.sender_email,
          contactPhone: profile.phone,
          logoUrl: profile.avatar_url
        };
      });

      console.log('Combined booking forms data:', combinedData);
      return combinedData;
    },
  });

  const filteredBrands = brands?.filter(brand =>
    brand.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
//fix the stylist to not let book on blocked day
  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading booking forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Seo
        title="Booking Forms Directory — Cutzioo"
        description="Browse every business accepting appointments through Cutzioo and book with your favourite in seconds."
        path="/bookingforms"
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Find Your Perfect Service</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Browse and book appointments with local businesses
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by business name, industry, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        {filteredBrands.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No booking forms found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms.' : 'No businesses have set up booking forms yet.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={`${brand.brandName} logo`}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {brand.brandName}
                        </CardTitle>
                        {brand.industry && (
                          <p className="text-sm text-muted-foreground">{brand.industry}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {brand.about && (
                    <p className="text-muted-foreground text-sm line-clamp-3">{brand.about}</p>
                  )}
                  
                  <div className="space-y-2">
                    {brand.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{brand.location}</span>
                      </div>
                    )}
                    {brand.contactPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{brand.contactPhone}</span>
                      </div>
                    )}
                    {brand.contactEmail && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{brand.contactEmail}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Link to={`/book/${brand.booking_link}`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Book Appointment
                      </Button>
                    </Link>
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

export default BookingForms;
