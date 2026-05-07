import { useState } from 'react';
import { AppointmentsCounter, useAppointmentsCount } from '@/components/AppointmentsCounter';
import {
  Search, 
  Bell, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Percent,
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  Calendar,
  Scissors
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { PChart } from "@/components/p-chart";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppointmentsTable } from './AppointmentsTable';

const db = supabase as any;

const colorOptions = [
  { value: "bg-blue-50", label: "Blue", gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
  { value: "bg-emerald-50", label: "Emerald", gradient: "linear-gradient(135deg, #14b8a6, #0d9488)" },
  { value: "bg-purple-50", label: "Purple", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
  { value: "bg-teal-50", label: "Teal", gradient: "linear-gradient(135deg, #14b8a6, #0f766e)" },
  { value: "bg-pink-50", label: "Pink", gradient: "linear-gradient(135deg, #e57373, #dc2626)" },
  { value: "bg-red-50", label: "Red", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
  { value: "bg-orange-50", label: "Orange", gradient: "linear-gradient(135deg, #f97316, #ea580c)" },
  { value: "bg-yellow-50", label: "Yellow", gradient: "linear-gradient(135deg, #eab308, #ca8a04)" },
  { value: "bg-indigo-50", label: "Indigo", gradient: "linear-gradient(135deg, #6366f1, #4f46e5)" },
  { value: "bg-green-50", label: "Green", gradient: "linear-gradient(135deg, #22c55e, #16a34a)" },
];

interface Service {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
}

const revenueData = [
  { month: 'Jan', value: 25000 },
  { month: 'Feb', value: 32000 },
  { month: 'Mar', value: 28000 },
  { month: 'Apr', value: 35000 },
  { month: 'May', value: 42000 },
  { month: 'Jun', value: 38000 },
  { month: 'Jul', value: 45000 },
  { month: 'Aug', value: 52000 },
  { month: 'Sep', value: 48000 },
  { month: 'Oct', value: 55000 },
  { month: 'Nov', value: 62000 },
  { month: 'Dec', value: 72592 },
];
const servicedata = [
  {service:"haircut",countservice:100},
  {service:"beard",countservice:50},
  {service:"haircut",countservice:100},
  {service:"beard",countservice:50},
];

const countryData = [
  { country: 'United Kingdom', orders: '12.3K', percent: 80, flag: '🇬🇧' },
  { country: 'United States', orders: '10.8K', percent: 60, flag: '🇺🇸' },
  { country: 'Sweden', orders: '6,023', percent: 40, flag: '🇸🇪' },
  { country: 'Turkey', orders: '3,512', percent: 30, flag: '🇹🇷' },
];

const stats = [
  { 
    title: 'Test',
    value: '$30,720', 
    trend: '+12.04%', 
    trendUp: true, 
    period: 'Last 30 days',
    icon: DollarSign 
  },
  { 
    title: 'Total Orders', 
    value: '15,350', 
    trend: '+16.02%', 
    trendUp: true, 
    period: 'Last 30 days',
    icon: ShoppingCart 
  },
  { 
    title: 'test',
    value: '4,972', 
    trend: '+15.08%', 
    trendUp: true, 
    period: 'Last 30 days',
    icon: Users 
  },
  { 
    title: 'user', 
    value: '5.18%', 
    trend: '+10.02%', 
    trendUp: true, 
    period: 'Last 30 days',
    icon: Percent 
  },
];

export function DashboardContent() {
  const { user } = useAuth();
  const { count, isLoading: countLoading } = useAppointmentsCount();
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('yearly');
  const [showCancellations, setShowCancellations] = useState(false);

  // Fetch services for the services breakdown
  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['dashboard-services', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db
        .from('services')
        .select('id, name, color, icon')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch appointment counts per service
  const { data: serviceCounts = {}, isLoading: countsLoading } = useQuery<Record<string, number>>({
    queryKey: ['service-appointment-counts', user?.id],
    queryFn: async () => {
      if (!user) return {};
      // Fetch appointments with service_id and count them client-side
      const { data, error } = await db
        .from('appointments')
        .select('service_id')
        .eq('user_id', user.id);
      if (error) throw error;
      // Count per service
      const counts: Record<string, number> = {};
      data?.forEach((appt: any) => {
        const sid = appt.service_id;
        counts[sid] = (counts[sid] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Fetch recent bookings for the table
  const { data: recentBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['recent-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db
        .from('appointments')
        .select(`
          *,
          customer:customers(name),
          service:services(name),
          stylist:stylists(name)
        `)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Mock data for services breakdown (in real app, this would come from appointments aggregation)
  const servicesData: { name: string; appointments: string | number; percent: number; color: string | null; icon: string | null | undefined }[] = services.length > 0 
    ? services
        .map((service, index) => ({
          name: service.name,
          appointments: countsLoading ? '...' : (serviceCounts[service.id] || 0),
          percent: [80, 65, 55, 45, 35, 28, 22, 18][index % 8] || 15,
          color: service.color,
          icon: service.icon,
        }))
        .sort((a, b) => {
          const countA = typeof a.appointments === 'number' ? a.appointments : 0;
          const countB = typeof b.appointments === 'number' ? b.appointments : 0;
          return countB - countA; // Sort descending (highest count first)
        })
    : [];

  return (
    <div className="h-[calc(100vh-0px)] overflow-hidden bg-[#f8f9fa] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search..." 
              className="pl-10 w-56 bg-gray-50 border-gray-200 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
            <AvatarImage src="https://i.pravatar.cc/150?u=admin" alt="Admin" />
            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">A</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{stat.title}</p>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{stat.value}</h3>
                  <div className={`flex items-center gap-1 text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.trend}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{stat.period}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two Column Layout: Appointments Overview + Services */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Appointments Overview */}
          <Card className="col-span-2 bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Appointments Overview</CardTitle>
                <CardDescription className="text-2xl font-bold text-gray-900 mt-1">24</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showCancellations"
                    checked={showCancellations}
                    onCheckedChange={(checked) => setShowCancellations(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="showCancellations" className="text-xs text-gray-600 cursor-pointer">
                    Show cancellations
                  </Label>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-24 bg-gray-50 border-gray-200 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700 h-7">
                  View All →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              <div className="h-40">
                <PChart 
                  data={[
                    { period: 'Mon', booked: 8, cancelled: 2 },
                    { period: 'Tue', booked: 12, cancelled: 1 },
                    { period: 'Wed', booked: 15, cancelled: 3 },
                    { period: 'Thu', booked: 6, cancelled: 0 },
                    { period: 'Fri', booked: 18, cancelled: 2 },
                    { period: 'Sat', booked: 24, cancelled: 4 },
                    { period: 'Sun', booked: 10, cancelled: 1 },
                  ]}
                  showCancellations={showCancellations}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services Breakdown - Moved to Country's position */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Services</CardTitle>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {servicesLoading ? '...' : services.length}
                  </span>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-gray-500 hover:text-gray-700 h-7"
                onClick={() => window.location.href = '/services'}
              >
                Manage →
              </Button>
            </CardHeader>
            <CardContent className="pt-2 px-4 pb-4">
              {servicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : servicesData.length > 0 ? (
                <div className="space-y-3">
                  {servicesData.slice(0, 4).map((item, index) => {
                    const colorOption = colorOptions.find(c => c.value === item.color);
                    const gradient = colorOption?.gradient || 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ background: gradient }}
                            />
                            <span className="text-xs font-medium text-gray-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium text-gray-900">{item.appointments}</span>
                          </div>
                        </div>
                        <Progress value={item.percent} className="h-1 bg-gray-100" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Scissors className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-2">No services found</p>
                  <Button 
                    size="sm" 
                    className="text-xs"
                    onClick={() => window.location.href = '/services'}
                  >
                    Create Service
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings Table - Compact */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-base font-semibold text-gray-900">Recent Bookings</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs border-gray-200 text-gray-600">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs border-gray-200 text-gray-600">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-500 py-2">Customer</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 py-2">Service</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 py-2">Status</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 py-2">Payment</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 py-2">Stylist</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 py-2">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        <div className="animate-pulse text-gray-400 text-xs">Loading...</div>
                      </TableCell>
                    </TableRow>
                  ) : recentBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500 text-xs">
                        No recent bookings
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentBookings.map((booking: any, index: number) => (
                      <TableRow key={index} className="border-gray-50">
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                {booking.customer?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-gray-900">{booking.customer?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2">{booking.service?.name || '-'}</TableCell>
                        <TableCell className="py-2">
                          <Badge 
                            variant="secondary" 
                            className={`
                              ${booking.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                              ${booking.status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-100' : ''}
                              ${booking.status === 'scheduled' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
                              font-medium text-xs px-2 py-0.5
                            `}
                          >
                            {booking.status || 'scheduled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2">{booking.payment_method || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2">{booking.stylist?.name || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-500 py-2">{booking.appointment_date}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
