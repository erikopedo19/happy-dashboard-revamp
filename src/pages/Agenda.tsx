/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Plus,
  Filter,
  DollarSign,
  Settings
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppointmentForm } from "@/components/AppointmentForm";
import { ModernAppointmentsCalendar } from "@/components/ModernAppointmentsCalendar";
import { LiquidGlassAgenda } from "@/components/LiquidGlassAgenda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function StatPill({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone?: 'rose' | 'green' | 'blue' }) {
  const toneClass = tone === 'rose' ? 'bg-[#FF375F]/10 text-[#FF375F]' : tone === 'green' ? 'bg-[#30D158]/10 text-[#30D158]' : 'bg-[#0A84FF]/10 text-[#0A84FF]';
  return (
    <div className="flex items-center gap-3 bg-[#22222A] border border-white/[0.08] rounded-2xl p-3">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", toneClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-white/50">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<'week' | 'day'>('day');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Always default to grid (day) view; user can switch to weekly overview manually.
  useEffect(() => {
    setViewMode('day');
  }, [isMobile]);

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
        .is('deleted_at', null)
        .order('name');
      const { data, error } = result;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch appointments for current range via SECURITY DEFINER RPC.
  // This avoids RLS quirks on the joined customers/services tables.
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', format(fetchStartDate, 'yyyy-MM-dd'), format(fetchEndDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .rpc('get_user_appointments', {
          p_start_date: format(fetchStartDate, 'yyyy-MM-dd'),
          p_end_date: format(fetchEndDate, 'yyyy-MM-dd'),
        });

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
      .filter((apt) => {
        const hasService = !!apt?.service;
        const hasCustomer = !!apt?.customer;
        if (!hasService || !hasCustomer) {
          console.warn('Agenda: filtering out appointment with missing customer/service', {
            id: apt?.id,
            appointment_date: apt?.appointment_date,
            appointment_time: apt?.appointment_time,
            hasService,
            hasCustomer,
          });
        }
        return hasService && hasCustomer;
      })
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
        <div className="h-screen flex w-full overflow-hidden bg-[#0A0A0C]">
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
              showViewModeToggle={false}
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
      <div className="h-screen flex w-full overflow-hidden bg-[#0A0A0C] font-geist">
        <AppSidebar />
        <main className="relative flex-1 flex flex-col overflow-hidden bg-[#0A0A0C] text-white">
          <div className="h-full overflow-hidden lg:p-2 w-full">
            <div className="lg:border lg:rounded-[20px] overflow-hidden flex flex-col bg-[#15151A] border-white/[0.08] h-full w-full">
              {/* Header */}
              <div className="border-b border-white/[0.08] bg-[#15151A] px-4 md:px-6 py-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SidebarTrigger className="lg:hidden text-white" />
                    <div className="flex items-center bg-[#22222A] border border-white/[0.08] rounded-xl p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePreviousWeek}
                        className="h-8 w-8 rounded-lg hover:bg-[#15151A] text-white/70 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToday}
                        className="h-8 px-3 rounded-lg hover:bg-[#15151A] text-xs font-medium text-white/70 hover:text-white"
                      >
                        Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextWeek}
                        className="h-8 w-8 rounded-lg hover:bg-[#15151A] text-white/70 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center bg-[#22222A] border border-white/[0.08] rounded-xl p-1">
                        <button
                          onClick={() => setViewMode('week')}
                          className={cn(
                            "flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all",
                            viewMode === 'week'
                              ? 'bg-[#FF375F] text-white shadow-sm'
                              : 'text-white/50 hover:text-white'
                          )}
                          title="Weeks"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMode('day')}
                          className={cn(
                            "flex items-center justify-center px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all",
                            viewMode === 'day'
                              ? 'bg-[#FF375F] text-white shadow-sm'
                              : 'text-white/50 hover:text-white'
                          )}
                          title="Grid"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-base md:text-lg font-semibold text-white truncate">
                        {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d yyyy')}
                      </h1>
                      <p className="hidden md:block text-xs text-white/50">
                        Week {format(currentWeek, 'w')} · {weeklyStats.total} appointments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative flex-1 md:flex-none md:max-w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        placeholder="Search in calendar..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 bg-[#22222A] border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/40 focus-visible:ring-[#FF375F]/30 w-full"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-[#22222A]"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setIsAppointmentFormOpen(true)}
                      className="h-9 rounded-xl bg-[#FF375F] hover:bg-[#FF375F]/90 text-white text-sm font-semibold px-3 md:px-4 shadow-none"
                    >
                      <Plus className="h-4 w-4 md:mr-1.5" />
                      <span className="hidden md:inline">New</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl text-white/70 hover:text-white hover:bg-[#22222A] px-3"
                    >
                      <Filter className="h-4 w-4 md:mr-1.5" />
                      <span className="hidden md:inline">Filter</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress Cards */}
              {viewMode === 'week' && (
                <div className="px-4 md:px-6 py-3 border-b border-white/[0.08] bg-[#15151A]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <StatPill icon={CalendarIcon} label="Bookings" value={weeklyStats.total} tone="rose" />
                    <StatPill icon={Clock} label="Completed" value={weeklyStats.completed} tone="green" />
                    <StatPill icon={Filter} label="Pending" value={weeklyStats.pending} tone="blue" />
                    <StatPill icon={DollarSign} label="Revenue" value={`$${weeklyStats.revenue}`} tone="rose" />
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 overflow-auto p-4 md:p-6">
                {viewMode === 'week' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {weekCards.map((week, index) => {
                      const isCurrent = week.isCurrentWeek;
                      return (
                        <motion.div
                          key={week.weekOffset}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.35 }}
                          onClick={() => {
                            setCurrentWeek(week.weekStart);
                            setViewMode('day');
                          }}
                          className={cn(
                            "group cursor-pointer overflow-hidden rounded-3xl border border-white/[0.08] bg-[#15151A] transition-all duration-300 hover:border-white/[0.14]",
                            isCurrent && "ring-1 ring-[#FF375F]/30"
                          )}
                        >
                          <div className="h-2 bg-[#FF375F]" />
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-bold text-white">
                                    {format(week.weekStart, 'w')}
                                  </span>
                                  <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                                    Week
                                  </span>
                                </div>
                                <p className="text-sm text-white/50 mt-1">
                                  {format(week.weekStart, 'MMM d')} - {format(week.weekEnd, 'MMM d')}
                                </p>
                              </div>
                              {isCurrent && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FF375F]/10 text-[#FF375F] text-[10px] font-semibold uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-[#22222A] rounded-xl p-3">
                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Bookings</p>
                                <p className="text-xl font-semibold text-white mt-0.5">{week.appointments.length}</p>
                              </div>
                              <div className="bg-[#22222A] rounded-xl p-3">
                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Revenue</p>
                                <p className="text-xl font-semibold text-white mt-0.5">${week.revenue}</p>
                              </div>
                              <div className="bg-[#22222A] rounded-xl p-3">
                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Clients</p>
                                <p className="text-xl font-semibold text-white mt-0.5">{week.customers}</p>
                              </div>
                            </div>
                            {week.appointments.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/[0.08]">
                                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">
                                  Next 3 appointments
                                </p>
                                <div className="space-y-2">
                                  {week.appointments.slice(0, 3).map((apt) => (
                                    <div key={apt.id} className="flex items-center gap-2 text-sm">
                                      <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: apt.service.color || '#FF375F' }}
                                      />
                                      <span className="truncate flex-1 text-white/70">{apt.service.name}</span>
                                      <span className="text-xs text-white/40">{apt.appointment_time.slice(0, 5)}</span>
                                    </div>
                                  ))}
                                  {week.appointments.length > 3 && (
                                    <p className="text-xs text-white/40 pl-4">
                                      +{week.appointments.length - 3} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <ModernAppointmentsCalendar
                    appointments={filteredAppointments}
                    onDateTimeClick={handleDateTimeClick}
                    services={services}
                    currentWeekExternal={currentWeek}
                    onWeekChange={setCurrentWeek}
                  />
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Appointment Form Dialog */}
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
      </div>
    </SidebarProvider>
  );
};

export default Agenda;
