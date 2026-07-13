import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, ChevronLeft, Clock, User, ArrowRight, Check, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { generateBookingTimeSlots, getAvailableBookingSlots, type BookedSlotLike } from "@/lib/bookingSlots";
import { dateStrInTz, getBrowserTimezone } from "@/lib/tz";


interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedTime: string;
  services?: Service[];
  initialServiceId?: string | null;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
}

export function AppointmentForm({ isOpen, onClose, selectedDate, selectedTime, services: providedServices, initialServiceId = null }: AppointmentFormProps) {
  const [step, setStep] = useState<"datetime" | "details" | "success">("datetime");
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date(selectedDate));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(selectedTime);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const shouldFetchServices = !providedServices;
  const selectedDateIso = format(selectedDateObj, 'yyyy-MM-dd');


  // Fetch agenda settings (single source of truth for hours)
  const { data: agendaSettings } = useQuery<{ start_hour: string; end_hour: string; service_duration: number; working_days?: number[] | null } | null>({
    queryKey: ['agenda-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from('agenda_settings')
        .select('start_hour, end_hour, service_duration, working_days')
        .eq('user_id', user.id)
        .maybeSingle();
      return data || null;
    },
    enabled: !!user,
  });

  // Fetch profile timezone for accurate "past hour" filtering
  const { data: tzProfile } = useQuery<{ timezone: string | null } | null>({
    queryKey: ['profile-tz', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle();
      return data || null;
    },
    enabled: !!user,
  });

  const timeSlots = useMemo(() => {
    const start = agendaSettings?.start_hour || '09:00';
    const end = agendaSettings?.end_hour || '18:00';
    const interval = agendaSettings?.service_duration || 30;
    return generateBookingTimeSlots(start, end, interval);
  }, [agendaSettings]);


  // Fetch services
  const { data: fetchedServices = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && shouldFetchServices,
  });

  const services = providedServices ?? fetchedServices;

  // Fetch stylists
  const { data: stylists = [] } = useQuery<any[]>({
    queryKey: ['stylists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('stylists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch user profile for business info
  const { data: profile } = useQuery<any>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch already-booked slots for selected day to prevent duplicate bookings
  const { data: bookedSlots = [] } = useQuery<BookedSlotLike[]>({
    queryKey: ['booked-slots', user?.id, selectedDateIso],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase as any).rpc('get_booked_slots', {
        _business_id: user.id,
        _date: selectedDateIso,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOpen,
    refetchInterval: isOpen ? 10000 : false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const selectedService = services.find((s: Service) => s.id === serviceId);

  const availableTimeSlots = useMemo(() => {
    if (!selectedService) return [];
    const startHour = agendaSettings?.start_hour || '09:00';
    const endHour = agendaSettings?.end_hour || '18:00';
    const interval = agendaSettings?.service_duration || 30;

    return getAvailableBookingSlots({
      date: selectedDateObj,
      allSlots: timeSlots,
      startHour,
      endHour,
      interval,
      serviceDuration: selectedService.duration,
      bookedSlots,
      workingDays: agendaSettings?.working_days,
      timezone: tzProfile?.timezone,
      stylistId: stylistId || null,
      allowPastSlots: true,

    });
  }, [selectedService, agendaSettings, selectedDateObj, timeSlots, bookedSlots, tzProfile?.timezone, stylistId]);

  // Realtime sync — agenda hours + bookings updated instantly on this form
  useEffect(() => {
    if (!user || !isOpen) return;
    const channel = supabase
      .channel(`barber-form-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_settings', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['agenda-settings', user.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['booked-slots', user.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['profile-tz', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isOpen, queryClient]);


  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const showServiceSelection = !selectedService;
  const showCalendarSelection = !isMobile || !!selectedService;
  const showTimeSelection = !isMobile || (!!selectedService && !!selectedDateObj);
  const showSelectedTimeSummary = isMobile && !!selectedTimeSlot;

  useEffect(() => {
    if (!services.length) return;

    const hasSelectedService = services.some((service: Service) => service.id === serviceId);
    if (!hasSelectedService) {
      const preferredServiceId = initialServiceId && services.some((service: Service) => service.id === initialServiceId)
        ? initialServiceId
        : services[0].id;
      setServiceId(preferredServiceId);
    }
  }, [services, serviceId, initialServiceId]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedDateObj(new Date(selectedDate));
    setSelectedTimeSlot(selectedTime);
    setCurrentMonth(new Date(selectedDate));
    setStep("datetime");
  }, [isOpen, selectedDate, selectedTime]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container || !isMobile) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 180);
    };

    container.addEventListener("focusin", handleFocusIn);

    return () => {
      container.removeEventListener("focusin", handleFocusIn);
    };
  }, [isMobile, isOpen, step]);

  const handleDateSelect = (date: Date) => {
    setSelectedDateObj(date);
    setSelectedTimeSlot("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimeSlot(time);
  };

  const handleContinue = () => {
    if (!selectedService) {
      toast({
        title: "Select a service",
        description: "Please choose a service before continuing.",
        variant: "destructive",
      });
      return;
    }
    if (!stylistId) {
      toast({
        title: "Select a stylist",
        description: "Please choose a stylist before continuing.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedTimeSlot) {
      toast({
        title: "Select a time",
        description: "Please select an available time slot.",
        variant: "destructive",
      });
      return;
    }

    if (!availableTimeSlots.includes(selectedTimeSlot)) {
      toast({
        title: "Time unavailable",
        description: "That time slot is no longer available. Please choose another time.",
        variant: "destructive",
      });
      return;
    }

    setStep("details");
  };

  const formatTime = (time: string) => {
    if (timeFormat === "24h") return time;
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedService || !selectedTimeSlot || !customerName || !stylistId) {
      toast({
        title: "Missing information",
        description: "Please complete the service, stylist, time, and customer details before booking.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const validSelectedService = services.find((service: Service) => service.id === serviceId);
      if (!validSelectedService?.id) {
        toast({
          title: "Service unavailable",
          description: "Please reselect a service and try again.",
          variant: "destructive",
        });
        return;
      }

      // Create or find customer
      let customerId: string;
      
      if (customerEmail) {
        // Check if customer exists
        const { data: existingCustomer, error: existingCustomerError } = await (supabase as any)
          .from('customers')
          .select('id')
          .eq('email', customerEmail)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingCustomerError) throw existingCustomerError;
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          const { data: newCustomer, error } = await (supabase as any)
            .from('customers')
            .insert({
              name: customerName,
              email: customerEmail,
              phone: customerPhone || null,
              user_id: user.id,
            })
            .select()
            .single();
          
          if (error) throw error;
          customerId = newCustomer.id;
        }
      } else {
        // Create customer without email
        const { data: newCustomer, error } = await (supabase as any)
          .from('customers')
          .insert({
            name: customerName,
            phone: customerPhone || null,
            user_id: user.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        customerId = newCustomer.id;
      }

      // Double-check time slot availability before creating appointment
      const normalizedSelectedTime = selectedTimeSlot.slice(0, 5);
      if (!availableTimeSlots.includes(normalizedSelectedTime)) {
        toast({
          title: "Time unavailable",
          description: "This slot was just booked or has passed. Please choose a different time.",
          variant: "destructive",
        });
        setStep("datetime");
        return;
      }
      const { data: existingAppointment, error: existingAppointmentError } = await (supabase as any)
        .from('appointments')
        .select('id')
        .eq('user_id', user.id)
        .eq('appointment_date', format(selectedDateObj, 'yyyy-MM-dd'))
        .eq('appointment_time', normalizedSelectedTime)
        .neq('status', 'cancelled')
        .limit(1)
        .maybeSingle();

      if (existingAppointmentError) throw existingAppointmentError;

      if (existingAppointment) {
        toast({
          title: "Time unavailable",
          description: "This slot was just booked. Please choose a different time.",
          variant: "destructive",
        });
        setStep("datetime");
        return;
      }

      // Create appointment
      const { data: createdAppt, error: appointmentError } = await (supabase as any)
        .from('appointments')
        .insert({
          customer_id: customerId,
          service_id: validSelectedService.id,
          stylist_id: stylistId,
          appointment_date: format(selectedDateObj, 'yyyy-MM-dd'),
          appointment_time: normalizedSelectedTime,
          price: validSelectedService.price,
          notes: notes.trim() || null,
          status: 'scheduled',
          user_id: user.id,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Confirmation email + SMS sent automatically by DB trigger (works for all booking sources)


      toast({
        title: "Appointment Booked!",
        description: `Your appointment is confirmed for ${format(selectedDateObj, 'MMMM d')} at ${selectedTimeSlot}.`,
      });

      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'appointments'
            || key === 'public-appointments'
            || key === 'booked-slots'
            || key === 'quickbook-booked';
        }
      });
      window.dispatchEvent(new Event('appointmentUpdated'));
      setStep("success");
    } catch (error: any) {
      console.error('Error creating appointment:', error);

      const isDuplicateSlot = error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate');
      toast({
        title: isDuplicateSlot ? "Time unavailable" : "Error",
        description: isDuplicateSlot
          ? "That time slot is already taken. Please choose another one."
          : "Failed to book appointment. Please try again.",
        variant: "destructive",
      });

      if (isDuplicateSlot) {
        setStep("datetime");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("datetime");
    setSelectedDateObj(new Date(selectedDate));
    setSelectedTimeSlot(selectedTime);
    setCustomerName("");
    setCustomerEmail("");
    setNotes("");
    setServiceId("");
    setStylistId("");
    setCurrentMonth(new Date(selectedDate));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "overflow-hidden shadow-2xl",
        isMobile
          ? "w-screen h-[100dvh] max-w-none max-h-none rounded-none m-0 bg-[#0e0e10] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 p-0 border-0"
          : "sm:w-[98vw] sm:max-w-[1600px] sm:max-h-[95vh] sm:rounded-[24px] sm:p-0 sm:border sm:border-white/[0.06] bg-[#0e0e10]"
      )}>
        <DialogTitle className="sr-only">Book Appointment</DialogTitle>

        <motion.div
          ref={contentRef}
          initial={isMobile ? { y: 24, opacity: 0 } : false}
          animate={isMobile ? { y: 0, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
          className={cn(
            "bg-[#0e0e10]",
            isMobile ? "h-[100dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]" : "flex sm:max-h-[95vh] min-h-[600px] overflow-hidden"
          )}
        >
          {/* Mobile sticky top bar with drag-handle + close */}
          {isMobile && (
            <div className="sticky top-0 z-30 bg-[#0e0e10]/85 backdrop-blur-xl border-b border-white/[0.06]">
              <div className="pt-2 pb-1 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-white/15" />
              </div>
              <div className="px-4 py-2 flex items-center justify-between">
                <button
                  onClick={handleClose}
                  className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/70 flex items-center justify-center active:scale-95 transition"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-[13px] font-semibold text-white tracking-tight">
                  {step === "datetime" ? "Pick a slot" : step === "details" ? "Your details" : "Confirmed"}
                </p>
                <div className="w-9" />
              </div>
            </div>
          )}

          {/* Left Panel - Service Info */}
          <div className={cn(
            "bg-[#0e0e10] flex flex-col",
            isMobile ? "p-4 border-b border-white/[0.06] shrink-0" : "w-[420px] p-8 border-r border-white/[0.06]"
          )}>
            {/* Desktop close */}
            {!isMobile && (
              <button
                onClick={handleClose}
                className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.06] text-gray-400 hover:text-white transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Profile */}
            <div className={cn(isMobile ? "mt-0 mb-4 flex items-center gap-3" : "mt-8 mb-6")}>
              <div className={cn("rounded-full overflow-hidden ring-1 ring-white/10", isMobile ? "w-11 h-11" : "w-12 h-12")}>
                <img
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'user'}`}
                  alt={profile?.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className={cn("text-sm text-gray-400", isMobile ? "" : "mt-3")}>{profile?.full_name || profile?.business_name || 'Your Business'}</p>
            </div>

            {/* Service Title */}
            <h2 className="text-xl font-semibold text-white mb-2">
              {selectedService ? `[${selectedService.duration}-min] ${selectedService.name}` : 'Select a Service'}
            </h2>

            {/* Service Description */}
            {selectedService?.description && (
              <p className="text-sm text-gray-400 mb-6">{selectedService.description}</p>
            )}

            {/* Service Details */}
            {selectedService && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{selectedService.duration} min</span>
                </div>
              </div>
            )}

            {/* Price */}
            {selectedService && (
              <div className={cn(isMobile ? "pt-4" : "mt-auto pt-6")}>
                <p className="text-2xl font-bold text-white">${selectedService.price}</p>
              </div>
            )}
          </div>

          {/* Center Panel - Calendar */}
          <div className={cn(
            "bg-[#0e0e10]",
            isMobile ? "p-4 border-b border-white/[0.06]" : "flex-1 p-8 overflow-y-auto"
          )}>
            {isMobile && (
              <div className="flex items-center gap-2 mb-5">
                {(["datetime", "details", "success"] as const).map((s, idx) => {
                  const reached = ["datetime", "details", "success"].indexOf(step) >= idx;
                  return (
                    <div
                      key={s}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-500",
                        reached ? "bg-[#0A84FF]" : "bg-white/[0.06]"
                      )}
                    />
                  );
                })}
              </div>
            )}
            <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
            {step === "datetime" ? (
              <div className="h-full flex flex-col">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-white">
                    {format(currentMonth, 'MMMM')} <span className="text-gray-500">{format(currentMonth, 'yyyy')}</span>
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Service Selection */}
                {showServiceSelection && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-3">Select Service</label>
                    <div className="grid grid-cols-1 gap-2">
                      {services.map((service: Service) => (
                        <button
                          key={service.id}
                          onClick={() => {
                            setServiceId(service.id);
                            if (isMobile) {
                              setSelectedTimeSlot("");
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                            serviceId === service.id
                              ? "border-[#0A84FF] bg-white/[0.06]"
                              : "border-white/[0.06] hover:border-gray-600"
                          )}
                        >
                          <div>
                            <p className="font-medium text-white">{service.name}</p>
                            <p className="text-sm text-gray-500">{service.duration} mins</p>
                          </div>
                          <p className="font-bold text-white">${service.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stylist Selection */}
                {selectedService && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-3">Select Stylist *</label>
                    <div className="grid grid-cols-1 gap-2">
                      {stylists.length === 0 ? (
                        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center">
                          <p className="text-sm text-rose-400">No stylists available. Please add a stylist first.</p>
                        </div>
                      ) : (
                        stylists.map((stylist: any) => (
                          <button
                            key={stylist.id}
                            onClick={() => setStylistId(stylist.id)}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                              stylistId === stylist.id
                                ? "border-[#0A84FF] bg-white/[0.06]"
                                : "border-white/[0.06] hover:border-gray-600"
                            )}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#2C2C2E] dark:to-[#1C1C1E] flex items-center justify-center text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-sm">
                              {stylist.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">{stylist.name}</p>
                              <p className="text-sm text-gray-500">{stylist.title || 'Stylist'}</p>
                            </div>
                            {stylistId === stylist.id && (
                              <Check className="w-5 h-5 text-[#0A84FF]" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {showCalendarSelection && (
                  <>
                    {/* Week days header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className={cn("grid grid-cols-7", isMobile ? "gap-1.5" : "gap-2")}>
                      {calendarDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDateObj);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const tz = tzProfile?.timezone || getBrowserTimezone();
                        const isPast = format(day, 'yyyy-MM-dd') < dateStrInTz(new Date(), tz);
                        const isWorkingDay = (agendaSettings?.working_days ?? [0, 1, 2, 3, 4, 5, 6]).includes(day.getDay());
                        const isDisabled = !isCurrentMonth || isPast || !isWorkingDay;
                        
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => handleDateSelect(day)}
                            disabled={isDisabled}
                            className={cn(
                              "aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all",
                              isSelected
                                ? "bg-[#0A84FF] text-white"
                                : isDisabled
                                ? "text-gray-600"
                                : "text-white hover:bg-white/[0.06]"
                            )}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : step === "details" ? (
              <div className="h-full flex flex-col">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Enter Your Details
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/[0.08] rounded-xl focus:border-[#0A84FF] focus:outline-none transition-colors text-white placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-4 bg-white/[0.06] border border-white/[0.08] rounded-xl focus:border-[#0A84FF] focus:outline-none transition-colors text-white placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send a confirmation email to this address.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="w-full px-4 py-4 bg-white/[0.06] border border-white/[0.08] rounded-xl focus:border-[#0A84FF] focus:outline-none transition-colors text-white placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional — we'll send an SMS confirmation if provided.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any appointment notes"
                      rows={3}
                      className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl focus:border-[#0A84FF] focus:outline-none transition-colors text-white placeholder-gray-500 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("datetime")}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mt-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to calendar</span>
                  </button>

                  <div className={cn(isMobile ? "sticky bottom-0 z-30 -mx-4 mt-6 border-t border-white/10 bg-[#0e0e10]/95 px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-18px_50px_rgba(0,0,0,0.45)]" : "mt-auto pt-6")}>
                    <button
                      type="submit"
                      disabled={isLoading || !customerName}
                      className={cn(
                        "w-full min-h-[56px] py-4 px-6 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-2",
                        customerName && !isLoading
                          ? "bg-[#0A84FF] hover:bg-[#0066d6]"
                          : "bg-gray-600 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          Book Appointment
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#0A84FF] flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">You're Booked!</h3>
                <p className="text-gray-400 mb-6">
                  Your appointment for {format(selectedDateObj, 'MMMM d')} at {selectedTimeSlot} is confirmed.
                </p>
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-[#0A84FF] hover:bg-[#0066d6] text-white rounded-xl font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            )}
            </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel - Time Slots / Booking Summary */}
          {((step === "datetime" && showTimeSelection && selectedService) || (!isMobile && step === "details" && selectedService)) && (
            <div className={cn(
              "bg-[#0e0e10]",
              isMobile ? "p-4 pb-6" : "w-[380px] p-6 overflow-y-auto border-l border-white/[0.06]"
            )}>
            {!isMobile && step === "details" && (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Booking summary</p>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.06]/50 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="text-white font-semibold text-sm mt-0.5">{selectedService.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{selectedService.duration} min · ${selectedService.price}</p>
                  </div>
                  <div className="border-t border-white/[0.08]" />
                  <div>
                    <p className="text-xs text-gray-500">Date & time</p>
                    <p className="text-white font-semibold text-sm mt-0.5">{format(selectedDateObj, "EEE, MMM d")}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{selectedTimeSlot}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("datetime")}
                  className="w-full py-2.5 rounded-xl border border-white/[0.06] text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Change slot
                </button>
              </div>
            )}
              {!showSelectedTimeSummary && (
                <>
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setTimeFormat("12h")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        timeFormat === "12h" ? "bg-white/[0.06] text-white" : "text-gray-500 hover:text-white"
                      )}
                    >
                      12h
                    </button>
                    <button
                      onClick={() => setTimeFormat("24h")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        timeFormat === "24h" ? "bg-white/[0.06] text-white" : "text-gray-500 hover:text-white"
                      )}
                    >
                      24h
                    </button>
                  </div>

                  <h4 className="text-sm font-medium text-white mb-4">
                    {format(selectedDateObj, 'EEE dd')}
                  </h4>

                  <div className={cn("overflow-y-auto max-h-[420px]", isMobile ? "max-h-none grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2")}>
                    {availableTimeSlots.map((time) => {
                      return (
                        <button
                          key={time}
                          onClick={() => {
                            handleTimeSelect(time);
                          }}
                          className={cn(
                            "py-3 px-2 rounded-xl border font-medium transition-all text-center flex items-center justify-center gap-1",
                            selectedTimeSlot === time
                                ? "border-[#0A84FF] bg-[#0A84FF]/10 text-white"
                                : "border-white/[0.06] hover:border-gray-600 text-white"
                          )}
                        >
                          <span className="text-sm">{formatTime(time)}</span>
                        </button>
                      );
                    })}
                    {availableTimeSlots.length === 0 && (
                      <div className="col-span-2 rounded-xl border border-white/[0.06] p-4 text-center text-sm text-gray-500">
                        No available times for this service.
                      </div>
                    )}
                  </div>
                </>
              )}

              {showSelectedTimeSummary && (
                <div className="rounded-2xl border border-[#0A84FF]/40 bg-[#0A84FF]/10 p-4 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Selected slot</p>
                      <p className="text-white font-semibold mt-1">{format(selectedDateObj, 'EEE, MMM d')} · {formatTime(selectedTimeSlot)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeSlot("")}
                      className="text-sm text-[#5ac8fa] hover:text-white transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <div className={cn(isMobile ? "sticky bottom-0 z-30 -mx-4 mt-6 border-t border-white/10 bg-[#0e0e10]/95 px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-18px_50px_rgba(0,0,0,0.45)]" : "mt-6")}>
                <button
                  onClick={handleContinue}
                  disabled={!selectedTimeSlot}
                  className={cn(
                    "w-full min-h-[56px] py-4 px-6 rounded-2xl font-semibold text-white transition-all",
                    selectedTimeSlot
                      ? "bg-[#0A84FF] hover:bg-[#0066d6]"
                      : "bg-gray-600 cursor-not-allowed"
                  )}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
