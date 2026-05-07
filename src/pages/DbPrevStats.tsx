import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Users, Briefcase, Calendar, Building2, MapPin } from "lucide-react";

interface Stylist {
  id: string;
  name: string;
  years_of_experience?: string;
  average_clients_per_day?: string;
  specialties: string[];
}

interface BrandProfile {
  id: string;
  name: string;
  industry: string;
  location: string;
  hear_about_us?: string;
  goals?: string[];
}

interface StatsData {
  totalStylists: number;
  businessTypes: { [key: string]: number };
  averageExperience: number;
  topSpecialties: { specialty: string; count: number }[];
  locationDistribution: { [key: string]: number };
  averageClientsPerDay: number;
  marketingChannels: { [key: string]: number };
  topGoals: { goal: string; count: number }[];
}

const DbPrevStats = () => {
  const [accessCode, setAccessCode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const checkAccess = () => {
    if (accessCode === "1900") {
      setIsAuthorized(true);
      fetchStats();
    } else {
      toast.error("Invalid access code");
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch stylists data
      const { data: stylistsData, error: stylistsError } = await supabase
        .from('stylists')
        .select('*') as { data: Stylist[] | null, error: any };

      if (stylistsError) throw stylistsError;

      // Fetch brand profiles data
      const { data: brandData, error: brandError } = await supabase
        .from('brand_profiles')
        .select('*') as { data: BrandProfile[] | null, error: any };

      if (brandError) throw brandError;

      // Calculate statistics
      const stats: StatsData = {
        totalStylists: stylistsData?.length || 0,
        businessTypes: brandData?.reduce((acc: any, curr) => {
          acc[curr.industry] = (acc[curr.industry] || 0) + 1;
          return acc;
        }, {}),
        averageExperience: stylistsData?.reduce((acc, curr) => acc + (parseInt(curr.years_of_experience?.split('-')[0] || '0')), 0) / (stylistsData?.length || 1),
        topSpecialties: Object.entries(
          stylistsData?.reduce((acc: any, curr) => {
            curr.specialties?.forEach((s: string) => {
              acc[s] = (acc[s] || 0) + 1;
            });
            return acc;
          }, {}) || {}
        )
          .map(([specialty, count]) => ({ specialty, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        locationDistribution: brandData?.reduce((acc: any, curr) => {
          const state = curr.location?.split(',').pop()?.trim();
          if (state) {
            acc[state] = (acc[state] || 0) + 1;
          }
          return acc;
        }, {}),
        averageClientsPerDay: stylistsData?.reduce((acc, curr) => {
          const range = curr.average_clients_per_day?.split('-') || [];
          const avg = (parseInt(range[0] || '0') + parseInt(range[1] || range[0] || '0')) / 2;
          return acc + avg;
        }, 0) / (stylistsData?.length || 1),
        marketingChannels: brandData?.reduce((acc: any, curr) => {
          if (curr.hear_about_us) {
            acc[curr.hear_about_us] = (acc[curr.hear_about_us] || 0) + 1;
          }
          return acc;
        }, {}),
        topGoals: Object.entries(
          brandData?.reduce((acc: any, curr) => {
            curr.goals?.forEach((g: string) => {
              acc[g] = (acc[g] || 0) + 1;
            });
            return acc;
          }, {}) || {}
        )
          .map(([goal, count]) => ({ goal, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };

      setStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch statistics");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-[#f8f9fa] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="text-lg tracking-wider"
            />
            <Button 
              className="w-full" 
              onClick={checkAccess}
              size="lg"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statistics Overview</h1>
            <p className="text-gray-500">Comprehensive analysis of onboarding data</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchStats} 
            disabled={isLoading}
          >
            Refresh Data
          </Button>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-[120px] bg-gray-100" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Business Types */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Business Types
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats && Object.entries(stats.businessTypes).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{type}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Specialties */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-rose-500" />
                  Top Specialties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.topSpecialties.map((item) => (
                  <div key={item.specialty} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.specialty}</span>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Location Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Location Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats && Object.entries(stats.locationDistribution).map(([location, count]) => (
                  <div key={location} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{location}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Stylists</span>
                    <span className="text-sm font-medium">{stats?.totalStylists}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Experience (Years)</span>
                    <span className="text-sm font-medium">{stats?.averageExperience.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Daily Clients</span>
                    <span className="text-sm font-medium">{stats?.averageClientsPerDay.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Marketing Channels */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Marketing Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats && Object.entries(stats.marketingChannels).map(([channel, count]) => (
                  <div key={channel} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{channel}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Goals */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-500" />
                  Top Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats?.topGoals.map((item) => (
                  <div key={item.goal} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item.goal}</span>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DbPrevStats;
