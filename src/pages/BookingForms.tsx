
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, User, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

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

      // Get brand profiles for additional info
      const { data: brandProfiles, error: brandError } = await supabase
        .from('brand_profiles')
        .select('user_id, name, about, industry, location, contact_email, contact_phone, logo_url');
      
      if (brandError) {
        console.error('Error fetching brand profiles:', brandError);
      }

      // Combine the data
      const combinedData = profiles.map(profile => {
        const brandProfile = brandProfiles?.find(bp => bp.user_id === profile.id);
        return {
          ...profile,
          brandName: brandProfile?.name || profile.full_name || 'Unknown Business',
          about: brandProfile?.about,
          industry: brandProfile?.industry,
          location: brandProfile?.location,
          contactEmail: brandProfile?.contact_email,
          contactPhone: brandProfile?.contact_phone,
          logoUrl: brandProfile?.logo_url
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Your Perfect Service</h1>
          <p className="text-xl text-gray-600 mb-8">
            Browse and book appointments with local businesses
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No booking forms found</h3>
            <p className="text-gray-600">
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
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {brand.brandName}
                        </CardTitle>
                        {brand.industry && (
                          <p className="text-sm text-gray-500">{brand.industry}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {brand.about && (
                    <p className="text-gray-600 text-sm line-clamp-3">{brand.about}</p>
                  )}
                  
                  <div className="space-y-2">
                    {brand.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{brand.location}</span>
                      </div>
                    )}
                    {brand.contactPhone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{brand.contactPhone}</span>
                      </div>
                    )}
                    {brand.contactEmail && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
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
