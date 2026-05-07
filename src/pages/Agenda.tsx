import { useState, useEffect, useMemo } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppointmentForm } from "@/components/AppointmentForm";
import { ModernAppointmentsCalendar } from "@/components/ModernAppointmentsCalendar";
import { LiquidGlassAgenda } from "@/components/LiquidGlassAgenda";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// iOS-style icons - minimal and clean
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  LayoutGrid,
  List,
  Plus,
  Filter
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  text_color: string;
  border_color: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  customer: Customer;
  service: Service;
  status: string;
  price?: number;
  notes?: string;
  totalDurationMinutes?: number;
}

const Agenda = () => {
  const [currentDate] = useState(new Date());
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: string; time: string } | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const getAdditionalServiceNames = (notes?: string) => {
    if (!notes) return [] as string[];

    const match = notes.match(/Additional(?: services)?:\s*(.+)$/i);
    if (!match?.[1]) return [] as string[];

    return match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
  };

  const fetchStartDate = startOfWeek(subWeeks(currentDate, 4), { weekStartsOn: 1 });
  const fetchEndDate = endOfWeek(addWeeks(currentDate, 12), { weekStartsOn: 1 });

  // Fetch services for the legend
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      if (!user) return [];
      const result = await (supabase as any)
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      const { data, error } = result;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch appointments for current range - with automatic refresh
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', format(fetchStartDate, 'yyyy-MM-dd'), format(fetchEndDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return [];
      const result = await (supabase as any)
        .from('appointments')
        .select(`
          *,
          customer:customers(*),
          service:services(*)
        `)
        .eq('user_id', user.id)
        .gte('appointment_date', format(fetchStartDate, 'yyyy-MM-dd'))
        .lte('appointment_date', format(fetchEndDate, 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
      const { data, error } = result;

      if (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Unable to load appointments",
          description: error.message || "Please try again in a moment.",
          variant: "destructive",
        });
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
    staleTime: 0, // Always consider data stale to enable immediate refetch
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  const hydratedAppointments = useMemo(
    () => appointments
      .filter((apt) => apt?.service && apt?.customer)
      .map((apt) => {
        const additionalDuration = getAdditionalServiceNames(apt.notes).reduce((sum, serviceName) => {
          const matchedService = services.find((service) => service.name.toLowerCase() === serviceName.toLowerCase());
          return sum + (matchedService?.duration || 0);
        }, 0);

        return {
          ...apt,
          totalDurationMinutes: (apt.service.duration || 0) + additionalDuration,
        };
      }),
    [appointments, services]
  );

  // Filter appointments by selected service and search
  const filteredAppointments = useMemo(() => {
    let filtered = hydratedAppointments;
    
    if (selectedServiceId) {
      filtered = filtered.filter((apt) => apt.service?.id === selectedServiceId);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.customer.name.toLowerCase().includes(query) || 
        apt.service.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [hydratedAppointments, selectedServiceId, searchQuery]);

  // Weekly stats for progress cards
  const weeklyStats = useMemo(() => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    
    const weekAppointments = filteredAppointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= weekStart && aptDate <= weekEnd;
    });
    
    const totalRevenue = weekAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const uniqueCustomers = new Set(weekAppointments.map(apt => apt.customer.id)).size;
    const completed = weekAppointments.filter(apt => apt.status === 'completed').length;
    const pending = weekAppointments.filter(apt => apt.status === 'scheduled').length;
    
    return {
      total: weekAppointments.length,
      revenue: totalRevenue,
      customers: uniqueCustomers,
      completed,
      pending
    };
  }, [filteredAppointments, currentWeek]);

  // Set up real-time subscription for appointments
  useEffect(() => {
    if (!user) return;

    const channel = (supabase as any)
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Real-time appointment change:', payload);
          // Invalidate ALL appointment-related queries to refresh agenda immediately
          await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
          await queryClient.invalidateQueries({ queryKey: ['public-appointments'], exact: false });
          await queryClient.invalidateQueries({ queryKey: ['recent-bookings'], exact: false });
          
          // Force immediate refetch
          await queryClient.refetchQueries({ queryKey: ['appointments'], exact: false });

          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Booking!",
              description: "A new appointment has been scheduled.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [user, toast, queryClient]);

  const handleDateTimeClick = (date: string, time: string) => {
    setSelectedTimeSlot({ date, time });
    setIsAppointmentFormOpen(true);
  };

  const handleCloseAppointmentForm = () => {
    setIsAppointmentFormOpen(false);
    setSelectedTimeSlot(null);
  };

  const handleServiceSelect = (serviceId: string | null) => {
    setSelectedServiceId(serviceId);
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  // Week cards data
  const weekCards = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const weekOffset = i - 2;
      const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const isCurrentWeek = weekOffset === 0;
      
      const weekAppointments = filteredAppointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
      
      const revenue = weekAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
      const customers = new Set(weekAppointments.map(apt => apt.customer.id)).size;
      
      return {
        weekOffset,
        weekStart,
        weekEnd,
        isCurrentWeek,
        appointments: weekAppointments,
        revenue,
        customers
      };
    });
  }, [filteredAppointments]);

  // Mobile: Render LiquidGlassAgenda
  if (isMobile) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="h-screen flex w-full overflow-hidden">
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-hidden relative">
            <LiquidGlassAgenda
              appointments={filteredAppointments}
              onDateTimeClick={handleDateTimeClick}
              services={services}
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </main>
        </div>

        {selectedTimeSlot && (
          <AppointmentForm
            isOpen={isAppointmentFormOpen}
            onClose={handleCloseAppointmentForm}
            selectedDate={selectedTimeSlot.date}
            selectedTime={selectedTimeSlot.time}
            services={services}
            initialServiceId={selectedServiceId}
          />
        )}
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* iOS-style Header */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-20">
            <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Title & Date */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-gray-600 hover:text-gray-900 lg:hidden" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Agenda</h1>
                  <p className="text-xs text-gray-500">
                    {format(currentWeek, 'MMMM yyyy')} • Week {format(currentWeek, 'w')}
                  </p>
                </div>
              </div>

              {/* Center: Search - Hidden on mobile, shown on md+ */}
              <div className="hidden md:block flex-1 max-w-sm mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search appointments..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-gray-100/80 border-0 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Right: View Toggle & Navigation */}
              <div className="flex items-center gap-2">
                {/* View Mode Tabs - iOS Style */}
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      viewMode === 'week'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Weeks</span>
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      viewMode === 'day'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handlePreviousWeek} 
                    className="h-8 w-8 rounded-lg hover:bg-white text-gray-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleToday}
                    className="h-8 px-3 rounded-lg hover:bg-white text-xs font-medium text-gray-700"
                  >
                    Today
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleNextWeek} 
                    className="h-8 w-8 rounded-lg hover:bg-white text-gray-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Progress Cards - iOS Style - Only show in Week view */}
            {viewMode === 'week' && (
            <div className="px-4 md:px-6 pb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bookings</p>
                      <p className="text-lg font-semibold text-gray-900">{weeklyStats.total}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-lg font-semibold text-gray-900">{weeklyStats.completed}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Filter className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="text-lg font-semibold text-gray-900">{weeklyStats.pending}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Revenue</p>
                      <p className="text-lg font-semibold text-gray-900">${weeklyStats.revenue}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {viewMode === 'week' ? (
              /* Week Overview Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weekCards.map((week, index) => {
                  const colors = [
                    { bg: 'from-blue-50 to-indigo-50', accent: 'bg-blue-500', text: 'text-blue-600' },
                    { bg: 'from-purple-50 to-pink-50', accent: 'bg-purple-500', text: 'text-purple-600' },
                    { bg: 'from-green-50 to-emerald-50', accent: 'bg-green-500', text: 'text-green-600' },
                    { bg: 'from-orange-50 to-amber-50', accent: 'bg-orange-500', text: 'text-orange-600' },
                    { bg: 'from-rose-50 to-red-50', accent: 'bg-rose-500', text: 'text-rose-600' },
                    { bg: 'from-cyan-50 to-teal-50', accent: 'bg-cyan-500', text: 'text-cyan-600' },
                  ][index % 6];

                  return (
                    <Card
                      key={week.weekOffset}
                      onClick={() => {
                        setCurrentWeek(week.weekStart);
                        setViewMode('day');
                      }}
                      className={cn(
                        "group cursor-pointer overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
                        week.isCurrentWeek && "ring-2 ring-blue-500/20"
                      )}
                    >
                      <div className={cn("h-2 bg-gradient-to-r", colors.bg)} />
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-gray-900">
                                {format(week.weekStart, 'w')}
                              </span>
                              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Week
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {format(week.weekStart, 'MMM d')} - {format(week.weekEnd, 'MMM d')}
                            </p>
                          </div>
                          {week.isCurrentWeek && (
                            <Badge className="bg-blue-100 text-blue-700 border-0 font-medium">
                              Current
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Bookings</p>
                            <p className="text-xl font-semibold text-gray-900 mt-0.5">{week.appointments.length}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Revenue</p>
                            <p className="text-xl font-semibold text-gray-900 mt-0.5">${week.revenue}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Clients</p>
                            <p className="text-xl font-semibold text-gray-900 mt-0.5">{week.customers}</p>
                          </div>
                        </div>

                        {/* Mini appointments preview */}
                        {week.appointments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                              Next 3 appointments
                            </p>
                            <div className="space-y-2">
                              {week.appointments.slice(0, 3).map((apt) => (
                                <div key={apt.id} className="flex items-center gap-2 text-sm">
                                  <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: apt.service.color || '#3b82f6' }}
                                  />
                                  <span className="truncate flex-1 text-gray-700">{apt.service.name}</span>
                                  <span className="text-xs text-gray-400">{apt.appointment_time.slice(0, 5)}</span>
                                </div>
                              ))}
                              {week.appointments.length > 3 && (
                                <p className="text-xs text-gray-400 pl-4">
                                  +{week.appointments.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Day Grid View */
              <ModernAppointmentsCalendar
                appointments={filteredAppointments}
                onDateTimeClick={handleDateTimeClick}
                services={services}
                currentWeekExternal={currentWeek}
                onWeekChange={setCurrentWeek}
              />
            )}
          </div>
        </main>
      </div>

      {/* Appointment Form Dialog - Outside zoomed container for proper centering */}
      {selectedTimeSlot && (
        <AppointmentForm
          isOpen={isAppointmentFormOpen}
          onClose={handleCloseAppointmentForm}
          selectedDate={selectedTimeSlot.date}
          selectedTime={selectedTimeSlot.time}
          services={services}
          initialServiceId={selectedServiceId}
        />
      )}
    </SidebarProvider>
  );
};

export default Agenda;
