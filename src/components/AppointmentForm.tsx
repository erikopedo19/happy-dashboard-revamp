import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, ChevronLeft, Clock, User, ArrowRight, Check, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { RevealSheet } from "@/components/ui/reveal-sheet";
import {
  Drawer as BottomDrawer,
  DrawerContent as BottomDrawerContent,
  DrawerTitle as BottomDrawerTitle,
  DrawerDescription as BottomDrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { generateBookingTimeSlots, getAvailableBookingSlots, type BookedSlotLike } from "@/lib/bookingSlots";
import { dateStrInTz, getBrowserTimezone } from "@/lib/tz";


interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedTime: string;
  skipTimeSelection?: boolean;
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

export function AppointmentForm({ isOpen, onClose, selectedDate, selectedTime, skipTimeSelection = false, services: providedServices, initialServiceId = null }: AppointmentFormProps) {
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
  const [mounted, setMounted] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => setMounted(true), []);

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
    queryKey: ['services', user?.id],
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

  // Fetch stylists (active only — soft-deleted stylists can't be assigned to new bookings)
  const { data: stylists = [] } = useQuery<any[]>({
    queryKey: ['stylists-active', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('stylists')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
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
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Prefetch nearby days so switching dates doesn't wait on the network
  useEffect(() => {
    if (!user || !isOpen) return;
    for (const offset of [-2, -1, 1, 2]) {
      const d = new Date(selectedDateObj);
      d.setDate(d.getDate() + offset);
      const iso = format(d, 'yyyy-MM-dd');
      queryClient.prefetchQuery({
        queryKey: ['booked-slots', user.id, iso],
        staleTime: 30_000,
        queryFn: async () => {
          const { data, error } = await (supabase as any).rpc('get_booked_slots', {
            _business_id: user.id,
            _date: iso,
          });
          if (error) throw error;
          return data || [];
        },
      });
    }
  }, [user, isOpen, selectedDateObj, queryClient]);

  // Days the barber marked off — never bookable from anywhere
  const { data: timeOffDates = [] } = useQuery<string[]>({
    queryKey: ['time-off-dates', user?.id],
    enabled: !!user && isOpen,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).rpc('get_time_off_dates', { _user_id: user.id });
      return (data || []).map((r: any) => r.off_date as string);
    },
  });
  const timeOffSet = useMemo(() => new Set(timeOffDates), [timeOffDates]);

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
      allowPastSlots: false,
      timeOffDates: timeOffSet,
    });
  }, [selectedService, agendaSettings, selectedDateObj, timeSlots, bookedSlots, tzProfile?.timezone, stylistId, timeOffSet]);

  // Realtime sync — agenda hours + bookings + stylists updated instantly on this form
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stylists', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['stylists-active', user.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['profile-tz', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isOpen, queryClient]);



  // Calendar days
  const calendarDays = useMemo(() => {
    // Pad the grid with surrounding week days so the day-of-week header (SUN..SAT)
    // stays aligned with the actual weekday of each date.
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const showServiceSelection = !selectedService;
  const showCalendarSelection = !isMobile || !!selectedService;
  const showTimeSelection = !isMobile || (!!selectedService && !!selectedDateObj);
  const showSelectedTimeSummary = (isMobile || skipTimeSelection) && !!selectedTimeSlot;

  useEffect(() => {
    if (!services.length) return;

    const hasSelectedService = services.some((service: Service) => service.id === serviceId);
    if (!hasSelectedService && initialServiceId) {
      const preferredServiceId = services.some((service: Service) => service.id === initialServiceId)
        ? initialServiceId
        : services[0]?.id;
      if (preferredServiceId) setServiceId(preferredServiceId);
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
    // Stylist is optional — no guard. Empty stylistId means "any stylist / skip".

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
    if (!requireAuth("Sign in to book an appointment")) return;
    
    if (!user || !selectedService || !selectedTimeSlot || !customerName) {
      toast({
        title: "Missing information",
        description: "Please complete the service, time, and customer details before booking.",
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
          stylist_id: stylistId || null,
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
          : error?.code === '42501'
            ? "Your account couldn't access this booking. Please refresh and try again."
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
    setCustomerPhone("");
    setNotes("");
    setServiceId("");
    setStylistId("");
    setCurrentMonth(new Date(selectedDate));
    onClose();
  };

  // Wait one tick so useIsMobile has resolved — otherwise the desktop
  // drawer mounts for one frame on phones and can leave a stuck scroll lock.
  if (!isOpen || !mounted) return null;

  // Mobile: bottom sheet Drawer, PC: side Drawer
  if (isMobile) {
    const stepIndex = ["datetime", "details", "success"].indexOf(step);
    const stepTitle = step === "datetime" ? "Pick a slot" : step === "details" ? "Client details" : "Confirmed";
    const slotPeriods = [
      { key: "morning", label: "Morning", color: "#FFB020", slots: availableTimeSlots.filter((t) => Number(t.slice(0, 2)) < 12) },
      { key: "afternoon", label: "Afternoon", color: "#FF5A6E", slots: availableTimeSlots.filter((t) => { const h = Number(t.slice(0, 2)); return h >= 12 && h < 17; }) },
      { key: "evening", label: "Evening", color: "#8B5CF6", slots: availableTimeSlots.filter((t) => Number(t.slice(0, 2)) >= 17) },
    ].filter((p) => p.slots.length > 0);
    const selectedPeriodColor = selectedTimeSlot
      ? (Number(selectedTimeSlot.slice(0, 2)) < 12 ? "#FFB020" : Number(selectedTimeSlot.slice(0, 2)) < 17 ? "#FF5A6E" : "#8B5CF6")
      : "#FF2D46";
    const inputCls = "w-full h-[54px] px-4 bg-white/[0.04] border border-white/[0.08] rounded-[16px] focus:border-[#FF2D46]/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(255,45,70,0.12)] focus:outline-none transition text-[15px] text-white placeholder:text-white/30";
    const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40";
    const primaryBtn = "w-full min-h-[56px] px-6 rounded-full font-semibold text-[15px] text-white transition-all flex items-center justify-center gap-2 active:scale-[0.98]";
    const primaryOn = "bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[0_14px_34px_-14px_rgba(255,45,70,0.9),inset_0_1px_0_rgba(255,255,255,0.3)]";
    const primaryOff = "bg-white/[0.08] text-white/40 cursor-not-allowed";
    const stickyFooter = "sticky bottom-0 z-30 -mx-4 mt-6 border-t border-white/[0.06] bg-[#0B0B0D]/85 px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-2xl";

    return (
      <BottomDrawer open={isOpen} onOpenChange={(v) => (!v ? handleClose() : null)}>
        <BottomDrawerContent className="h-[94dvh] max-h-[94dvh] bg-[#0B0B0D] dark:bg-[#0B0B0D] border-white/[0.08] rounded-t-[32px] p-0 overflow-hidden shadow-[0_-24px_80px_-16px_rgba(0,0,0,0.7)]">
          <BottomDrawerTitle className="sr-only">Book Appointment</BottomDrawerTitle>
          <BottomDrawerDescription className="sr-only">Select a service, stylist, date and time to book an appointment.</BottomDrawerDescription>

          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
            <div className="absolute -top-32 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-[#FF2D46]/25 blur-[90px]" />
          </div>

          <div
            ref={contentRef}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-6"
          >
            {/* Sticky header with step progress */}
            <div className="sticky top-0 z-30 bg-[#0B0B0D]/75 backdrop-blur-2xl border-b border-white/[0.06]">
              <div className="px-4 pt-2 pb-2.5 flex items-center justify-between gap-3">
                <button
                  onClick={step === "details" ? () => setStep("datetime") : handleClose}
                  className="h-9 w-9 rounded-full bg-white/[0.07] border border-white/[0.08] text-white/80 flex items-center justify-center active:scale-90 transition"
                  aria-label={step === "details" ? "Back" : "Close"}
                >
                  {step === "details" ? <ChevronLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
                <div className="min-w-0 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Step {Math.min(stepIndex + 1, 3)} of 3
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={stepTitle}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="text-[15px] font-semibold text-white tracking-tight"
                    >
                      {stepTitle}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <button
                  onClick={handleClose}
                  className={cn(
                    "h-9 w-9 rounded-full bg-white/[0.07] border border-white/[0.08] text-white/80 flex items-center justify-center active:scale-90 transition",
                    step !== "details" && "invisible"
                  )}
                  aria-label="Close"
                >
                  {step === "details" ? "Back" : "Cancel"}
                </button>
              </div>
              <div className="px-4 pb-3 flex items-center gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="h-1 flex-1 rounded-full bg-white/[0.07] overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{ width: stepIndex >= idx ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-[#FF8FA3] via-[#FF5A6E] to-[#E0152F]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Booking summary hero */}
            <div className="px-4 pt-4">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-4"
              >
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FF2D46]/20 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-[16px] overflow-hidden ring-1 ring-white/10 bg-white/[0.06]">
                    <img
                      src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'user'}`}
                      alt={profile?.full_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-white/50 truncate">{profile?.full_name || profile?.business_name || 'Your Business'}</p>
                    <h2 className="text-[17px] font-semibold text-white tracking-tight truncate">
                      {selectedService ? selectedService.name : 'Select a service'}
                    </h2>
                  </div>
                  {selectedService && (
                    <p className="shrink-0 text-[22px] font-bold text-white tabular-nums tracking-tight">${selectedService.price}</p>
                  )}
                </div>
                {selectedService && (
                  <div className="relative mt-3.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/[0.06] px-2.5 text-[12px] font-medium text-white/80">
                      <Clock className="h-3.5 w-3.5 text-white/50" /> {selectedService.duration} min
                    </span>
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/[0.06] px-2.5 text-[12px] font-medium text-white/80">
                      <CalendarIcon className="h-3.5 w-3.5 text-white/50" /> {format(selectedDateObj, 'EEE, MMM d')}
                    </span>
                    {selectedTimeSlot && (
                      <span
                        className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold text-white border"
                        style={{ backgroundColor: `${selectedPeriodColor}26`, borderColor: `${selectedPeriodColor}55` }}
                      >
                        <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: selectedPeriodColor }} />
                        {formatTime(selectedTimeSlot)}
                      </span>
                    )}
                    {step === "datetime" && (
                      <button
                        type="button"
                        onClick={() => { setServiceId(""); setSelectedTimeSlot(""); }}
                        className="ml-auto h-7 rounded-full px-2.5 text-[12px] font-semibold text-[#FF8FA3] hover:text-white transition"
                      >
                        Change
                      </button>
                    )}
                  </div>
                )}
                {selectedService?.description && (
                  <p className="relative mt-3 text-[13px] leading-relaxed text-white/50 line-clamp-2">{selectedService.description}</p>
                )}
              </motion.div>
            </div>

            <div className="px-4 pt-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === "datetime" ? (
                    <div className="space-y-6">
                      {/* Service Selection */}
                      {showServiceSelection && (
                        <div>
                          <p className={cn(sectionLabel, "mb-3 px-1")}>Choose a service</p>
                          <div className="grid grid-cols-1 gap-2">
                            {services.map((service: Service, i: number) => {
                              const color = (service as any).color?.startsWith?.("#") ? (service as any).color : "#FF2D46";
                              return (
                                <motion.button
                                  key={service.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(i, 8) * 0.04, type: "spring", stiffness: 380, damping: 30 }}
                                  onClick={() => {
                                    setServiceId(service.id);
                                    setSelectedTimeSlot("");
                                  }}
                                  className="relative flex items-center justify-between gap-3 overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.03] py-3.5 pl-5 pr-3.5 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
                                >
                                  <span
                                    aria-hidden
                                    className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full"
                                    style={{ backgroundColor: color, boxShadow: `0 0 10px color-mix(in srgb, ${color} 55%, transparent)` }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[15px] font-semibold text-white truncate">{service.name}</p>
                                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-white/45">
                                      <Clock className="h-3 w-3" /> {service.duration} min
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[14px] font-bold text-white tabular-nums">
                                    ${service.price}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stylist Selection — optional, with quick-add / invite / skip */}
                      {selectedService && (
                        <div>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <p className={sectionLabel}>
                              Stylist <span className="normal-case tracking-normal text-white/25">· optional</span>
                            </p>
                            {stylists.length > 0 && stylistId && (
                              <button type="button" onClick={() => setStylistId("")} className="text-[12px] font-semibold text-white/50 hover:text-white">
                                Clear
                              </button>
                            )}
                          </div>

                          {stylists.length === 0 ? (
                            <div className="rounded-[20px] border border-dashed border-white/[0.1] bg-white/[0.02] p-4 text-center space-y-3">
                              <p className="text-[13px] text-white/55">No stylists yet. Book without one, or add your team.</p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => { onClose(); navigate("/stylists"); }}
                                  className="h-9 px-4 rounded-full text-[13px] font-semibold bg-white/[0.07] text-white border border-white/[0.08] active:scale-95 transition"
                                >
                                  + Add stylist
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { onClose(); navigate("/teams"); }}
                                  className="h-9 px-4 rounded-full text-[13px] font-semibold bg-white/[0.07] text-white border border-white/[0.08] active:scale-95 transition"
                                >
                                  Invite worker
                                </button>
                              </div>
                              <p className="text-[11px] text-white/30">You can continue without a stylist.</p>
                            </div>
                          ) : (
                            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              <button
                                type="button"
                                onClick={() => setStylistId("")}
                                className={cn(
                                  "flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[18px] border px-2 py-3 transition-all active:scale-95",
                                  !stylistId ? "border-[#FF2D46]/60 bg-[#FF2D46]/[0.1]" : "border-white/[0.07] bg-white/[0.03]"
                                )}
                              >
                                <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", !stylistId ? "bg-gradient-to-br from-[#FF5A6E] to-[#C8102E] text-white" : "bg-white/[0.07] text-white/60")}>
                                  <User className="h-5 w-5" />
                                </div>
                                <span className="text-[11px] font-semibold text-white/80">Any</span>
                              </button>
                              {stylists.map((stylist: any) => {
                                const active = stylistId === stylist.id;
                                return (
                                  <button
                                    key={stylist.id}
                                    type="button"
                                    onClick={() => setStylistId(stylist.id)}
                                    className={cn(
                                      "relative flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[18px] border px-2 py-3 transition-all active:scale-95",
                                      active ? "border-[#FF2D46]/60 bg-[#FF2D46]/[0.1]" : "border-white/[0.07] bg-white/[0.03]"
                                    )}
                                  >
                                    <div className={cn("relative h-11 w-11 rounded-full overflow-hidden bg-[#2C2C2E] flex items-center justify-center text-[13px] font-semibold text-white", active && "ring-2 ring-[#FF2D46] ring-offset-2 ring-offset-[#0B0B0D]")}>
                                      {stylist.avatar_url ? (
                                        <img src={stylist.avatar_url} alt={stylist.name} className="w-full h-full object-cover" />
                                      ) : (
                                        stylist.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                                      )}
                                    </div>
                                    <span className="w-full truncate text-center text-[11px] font-semibold text-white/80">{stylist.name.split(/\s+/)[0]}</span>
                                    {active && (
                                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF2D46]">
                                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => { onClose(); navigate("/stylists"); }}
                                className="flex w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-white/[0.1] px-2 py-3 text-white/50 active:scale-95 transition"
                              >
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-[20px] leading-none">+</div>
                                <span className="text-[11px] font-semibold">Add</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {showCalendarSelection && (
                        <div>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-[19px] font-bold text-white tracking-tight">
                              {format(currentMonth, 'MMMM yyyy')}
                            </h3>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.07] active:scale-90 transition text-white/80"
                                aria-label="Previous month"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.07] active:scale-90 transition text-white/80"
                                aria-label="Next month"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-2.5">
                            <div className="grid grid-cols-7 gap-1 mb-1">
                              {weekDays.map(day => (
                                <div key={day} className="text-center text-[10px] font-semibold uppercase tracking-wide text-white/35 py-1.5">
                                  {day.slice(0, 2)}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {calendarDays.map((day) => {
                                const isSelected = isSameDay(day, selectedDateObj);
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const tz = tzProfile?.timezone || getBrowserTimezone();
                                const todayStr = dateStrInTz(new Date(), tz);
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const isPast = dayStr < todayStr;
                                const isToday = dayStr === todayStr;
                                const isWorkingDay = (agendaSettings?.working_days ?? [0, 1, 2, 3, 4, 5, 6]).includes(day.getDay());
                                const isDayOff = timeOffSet.has(dayStr);
                                const isDisabled = !isCurrentMonth || isPast || !isWorkingDay || isDayOff;
                                const showDot = !isDisabled && !isSelected;

                                return (
                                  <button
                                    key={day.toISOString()}
                                    onClick={() => handleDateSelect(day)}
                                    disabled={isDisabled}
                                    className={cn(
                                      "relative aspect-square flex items-center justify-center text-[14px] font-semibold rounded-[14px] transition-all active:scale-90",
                                      isSelected
                                        ? "text-white"
                                        : isDisabled
                                        ? "text-white/15"
                                        : isToday
                                        ? "bg-white/[0.08] text-white ring-1 ring-white/15"
                                        : "text-white/90 hover:bg-white/[0.06]"
                                    )}
                                  >
                                    {isSelected && (
                                      <motion.span
                                        layoutId="apptform-day"
                                        transition={{ type: "spring", stiffness: 480, damping: 34 }}
                                        className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[0_8px_20px_-8px_rgba(255,45,70,0.9)]"
                                      />
                                    )}
                                    <span className="relative">{format(day, 'd')}</span>
                                    {showDot && (
                                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#FF5A6E]/80" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : step === "details" ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className={cn(sectionLabel, "block mb-2 px-1")}>Full name *</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/35" />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="John Doe"
                            required
                            className={cn(inputCls, "pl-11")}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={cn(sectionLabel, "block mb-2 px-1")}>Email address</label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="john@example.com"
                          className={inputCls}
                        />
                        <p className="text-[11px] text-white/35 mt-1.5 px-1">We'll send a confirmation email to this address.</p>
                      </div>

                      <div>
                        <label className={cn(sectionLabel, "block mb-2 px-1")}>Phone number</label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+1 555 123 4567"
                          className={inputCls}
                        />
                        <p className="text-[11px] text-white/35 mt-1.5 px-1">Optional. We'll send an SMS confirmation if provided.</p>
                      </div>

                      <div>
                        <label className={cn(sectionLabel, "block mb-2 px-1")}>Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any appointment notes"
                          rows={3}
                          className={cn(inputCls, "h-auto py-3.5 resize-none")}
                        />
                      </div>

                      <div className={stickyFooter}>
                        <button
                          type="submit"
                          disabled={isLoading || !customerName}
                          className={cn(primaryBtn, customerName && !isLoading ? primaryOn : primaryOff)}
                        >
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Booking...
                            </>
                          ) : (
                            <>
                              Book appointment
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="relative mb-6">
                        <motion.span
                          aria-hidden
                          initial={{ scale: 0.6, opacity: 0.8 }}
                          animate={{ scale: 1.9, opacity: 0 }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full bg-[#FF2D46]/40"
                        />
                        <motion.div
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 320, damping: 16 }}
                          className="relative w-20 h-20 rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] flex items-center justify-center shadow-[0_18px_40px_-12px_rgba(255,45,70,0.9),inset_0_1px_0_rgba(255,255,255,0.35)]"
                        >
                          <Check className="w-9 h-9 text-white" strokeWidth={3} />
                        </motion.div>
                      </div>
                      <h3 className="text-[26px] font-bold text-white tracking-tight mb-2">You're booked!</h3>
                      <p className="text-[14px] text-white/55 mb-8 max-w-[280px]">
                        Appointment for {format(selectedDateObj, 'MMMM d')} at {selectedTimeSlot} is confirmed.
                      </p>
                      <button onClick={handleClose} className={cn(primaryBtn, primaryOn, "max-w-[260px]")}>
                        Done
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Time slots */}
            {step === "datetime" && showTimeSelection && selectedService && (
              <div className="px-4 pt-6 pb-6">
                {!showSelectedTimeSummary && (
                  <>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <p className={sectionLabel}>Available times</p>
                        <h4 className="text-[15px] font-semibold text-white tracking-tight mt-0.5">
                          {format(selectedDateObj, 'EEEE, MMM d')}
                        </h4>
                      </div>
                      <div className="relative inline-flex p-0.5 rounded-full bg-white/[0.06] border border-white/[0.06]">
                        {(["12h", "24h"] as const).map((tf) => (
                          <button
                            key={tf}
                            onClick={() => setTimeFormat(tf)}
                            className={cn(
                              "relative px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                              timeFormat === tf ? "text-[#0B0B0D]" : "text-white/50 hover:text-white"
                            )}
                          >
                            {timeFormat === tf && (
                              <motion.span layoutId="apptform-tf" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 500, damping: 34 }} />
                            )}
                            <span className="relative">{tf}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {availableTimeSlots.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-white/[0.1] p-6 text-center text-[13px] text-white/45">
                        No available times for this service.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {slotPeriods.map((period) => (
                          <div key={period.key}>
                            <div className="mb-2 flex items-center gap-2 px-1">
                              <span className="h-3 w-[3px] rounded-full" style={{ backgroundColor: period.color }} />
                              <span className="text-[12px] font-semibold text-white/70">{period.label}</span>
                              <span className="text-[11px] text-white/30">{period.slots.length}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {period.slots.map((time, i) => (
                                <motion.button
                                  key={time}
                                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ delay: Math.min(i, 15) * 0.018, type: "spring", stiffness: 420, damping: 30 }}
                                  onClick={() => handleTimeSelect(time)}
                                  className="group relative h-12 overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.035] pl-4 pr-2 text-left text-[14px] font-semibold tabular-nums text-white/90 transition-colors hover:bg-white/[0.07] active:scale-[0.96]"
                                >
                                  <span
                                    aria-hidden
                                    className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full opacity-70 transition-opacity group-hover:opacity-100"
                                    style={{ backgroundColor: period.color }}
                                  />
                                  {formatTime(time)}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {showSelectedTimeSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="relative overflow-hidden rounded-[20px] border py-4 pl-6 pr-4"
                    style={{ borderColor: `${selectedPeriodColor}55`, background: `linear-gradient(90deg, ${selectedPeriodColor}2b 0%, ${selectedPeriodColor}08 70%)` }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-2 top-3 bottom-3 w-1.5 rounded-full"
                      style={{ backgroundColor: selectedPeriodColor, boxShadow: `0 0 14px ${selectedPeriodColor}` }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={sectionLabel}>Selected slot</p>
                        <p className="text-[18px] font-bold text-white tracking-tight mt-1 tabular-nums">{formatTime(selectedTimeSlot)}</p>
                        <p className="text-[12px] text-white/55">{format(selectedDateObj, 'EEEE, MMM d')} · {selectedService.duration} min</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTimeSlot("")}
                        className="shrink-0 h-9 rounded-full bg-white/[0.08] border border-white/[0.1] px-4 text-[13px] font-semibold text-white active:scale-95 transition"
                      >
                        Change
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          {step === "datetime" && showTimeSelection && selectedService && (
            <div className="relative z-30 shrink-0 border-t border-white/[0.06] bg-[#0B0B0D]/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedTimeSlot}
                className={cn(primaryBtn, selectedTimeSlot ? primaryOn : primaryOff)}
              >
                Continue
                {selectedTimeSlot && <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          )}
        </BottomDrawerContent>
      </BottomDrawer>
    );
  }

  // PC: reveal-sheet booking form
  return (
    <RevealSheet
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      side="right"
      title="New booking"
      description="Pick a service, stylist, date and time."
      className="bg-[#0b0b0d] !max-w-[880px]"
    >
      <div className="dark -mx-6 -my-6 sm:-mx-8 sm:-my-6 flex flex-col h-[calc(100dvh-120px)]">
        <motion.div
          ref={contentRef}
          className="flex flex-1 min-h-0 overflow-hidden bg-[#0b0b0d]"
        >

          {/* Left Panel - Service Info */}
          <div className="w-[264px] shrink-0 p-6 bg-white/[0.02] border-r border-white/[0.06] flex flex-col">
            {/* Profile */}
            <div className="mt-6 mb-6">
              <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 w-14 h-14 shadow-lg">
                <img
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'user'}`}
                  alt={profile?.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[13px] text-gray-400 mt-3 font-medium">{profile?.full_name || profile?.business_name || 'Your Business'}</p>
            </div>

            {/* Service Title */}
            <h2 className="text-[22px] leading-tight font-semibold text-white tracking-tight mb-2">
              {selectedService ? selectedService.name : 'Select a service'}
            </h2>

            {/* Service Description */}
            {selectedService?.description && (
              <p className="text-[13px] leading-relaxed text-gray-400 mb-5">{selectedService.description}</p>
            )}

            {/* Service Details */}
            {selectedService && (
              <div className="mt-2 inline-flex items-center gap-2 self-start rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-[12px] text-gray-300">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{selectedService.duration} min</span>
              </div>
            )}

            {/* Price */}
            {selectedService && (
              <div className="mt-auto pt-6">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Total</p>
                <p className="text-[28px] font-semibold text-white tracking-tight">${selectedService.price}</p>
              </div>
            )}
          </div>

          {/* Center Panel - Calendar */}
          <div className="flex-1 p-7 overflow-y-auto bg-[#0b0b0d]">
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
                  <h3 className="text-[22px] font-semibold text-white tracking-tight">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex gap-1.5 p-1 rounded-full bg-white/[0.05] border border-white/[0.06]">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.1] transition-all active:scale-95 text-gray-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.1] transition-all active:scale-95 text-gray-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Service Selection */}
                {showServiceSelection && (
                  <div className="mb-6">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-3">Select service</label>
                    <div className="grid grid-cols-1 gap-2">
                      {services.map((service: Service) => (
                        <button
                          key={service.id}
                          onClick={() => setServiceId(service.id)}
                          className={cn(
                            "flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99]",
                            serviceId === service.id
                              ? "border-white/25 bg-white/[0.09] shadow-[0_6px_24px_-8px_rgba(0,0,0,0.6)]"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]"
                          )}
                        >
                          <div>
                            <p className="font-medium text-white text-[15px] tracking-tight">{service.name}</p>
                            <p className="text-[12px] text-gray-500 mt-0.5">{service.duration} mins</p>
                          </div>
                          <p className="font-semibold text-white text-[15px]">${service.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stylist Selection */}
                {selectedService && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                        Stylist <span className="text-gray-600">(optional)</span>
                      </label>
                      {stylists.length > 0 && stylistId && (
                        <button
                          type="button"
                          onClick={() => setStylistId("")}
                          className="text-xs text-gray-500 hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {stylists.length === 0 ? (
                        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center space-y-3">
                          <p className="text-sm text-gray-400">
                            No stylists yet. Book without one, or add your team.
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => { onClose(); navigate("/stylists"); }}
                              className="h-9 px-4 rounded-full text-sm font-medium bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                            >
                              + Add stylist
                            </button>
                            <button
                              type="button"
                              onClick={() => { onClose(); navigate("/teams"); }}
                              className="h-9 px-4 rounded-full text-sm font-medium bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                            >
                              Invite worker
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {stylists.map((stylist: any) => (
                            <button
                              key={stylist.id}
                              type="button"
                              onClick={() => setStylistId(stylist.id)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99]",
                                stylistId === stylist.id
                                  ? "border-white/25 bg-white/[0.09]"
                                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]"
                              )}
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#2C2C2E] dark:to-[#1C1C1E] flex items-center justify-center text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-sm overflow-hidden">
                                {stylist.avatar_url ? (
                                  <img src={stylist.avatar_url} alt={stylist.name} className="w-full h-full object-cover" />
                                ) : (
                                  stylist.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-white">{stylist.name}</p>
                                <p className="text-sm text-gray-500">{stylist.title || 'Stylist'}</p>
                              </div>
                              {stylistId === stylist.id && (
                                <Check className="w-5 h-5 text-white" />
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setStylistId("")}
                            className={cn(
                              "h-8 px-3 rounded-full text-xs font-medium border transition-all mt-2",
                              !stylistId
                                ? "bg-white/[0.08] border-white/20 text-white"
                                : "bg-transparent border-white/[0.08] text-gray-400 hover:text-white"
                            )}
                          >
                            Skip / any stylist
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {showCalendarSelection && (
                  <>
                    {/* Week days header */}
                    <div className="grid grid-cols-7 mb-1 gap-1.5">
                      {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 py-2">
                          {day.slice(0, 3)}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] p-2">
                      {calendarDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDateObj);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const tz = tzProfile?.timezone || getBrowserTimezone();
                        const todayStr = dateStrInTz(new Date(), tz);
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isPast = dayStr < todayStr;
                        const isToday = dayStr === todayStr;
                        const isWorkingDay = (agendaSettings?.working_days ?? [0, 1, 2, 3, 4, 5, 6]).includes(day.getDay());
                        const isDayOff = timeOffSet.has(dayStr);
                        const isDisabled = !isCurrentMonth || isPast || !isWorkingDay || isDayOff;
                        const showDot = !isDisabled && !isSelected;

                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => handleDateSelect(day)}
                            disabled={isDisabled}
                            className={cn(
                              "relative aspect-square flex items-center justify-center text-[13px] font-semibold rounded-full transition-all duration-200",
                              isSelected
                                ? "bg-white text-[#0b0b0d] scale-[1.04]"
                                : isDisabled
                                ? "text-white/20"
                                : isToday
                                ? "bg-white/[0.12] text-white hover:bg-white/[0.18]"
                                : "text-white/85 hover:bg-white/[0.08] hover:text-white"
                            )}
                          >
                            {format(day, 'd')}
                            {showDot && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/40" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : step === "details" ? (
              <div className="h-full flex flex-col">
                <h3 className="text-[22px] font-semibold text-white tracking-tight mb-6">
                  Your details
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
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
                        className="w-full pl-12 pr-4 py-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all text-white placeholder-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all text-white placeholder-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send a confirmation email to this address.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="w-full px-4 py-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all text-white placeholder-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional. We'll send an SMS confirmation if provided.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any appointment notes"
                      rows={3}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/30 focus:bg-white/[0.06] focus:outline-none transition-all text-white placeholder-gray-600 resize-none"
                    />
                  </div>

                  <div className="mt-auto pt-6">
                    <button
                      type="submit"
                      disabled={isLoading || !customerName}
                      className={cn(
                        "w-full min-h-[54px] py-3.5 px-6 rounded-[18px] text-[17px] font-semibold transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2",
                        customerName && !isLoading
                          ? "bg-[linear-gradient(180deg,#FF5A6E_0%,#FF2D46_55%,#E0152F_100%)] text-white"
                          : "bg-white/[0.08] text-white/40 cursor-not-allowed"
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
                <div className="w-16 h-16 rounded-full bg-[#FF2D46] flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">You're Booked!</h3>
                <p className="text-gray-400 mb-6">
                  Your appointment for {format(selectedDateObj, 'MMMM d')} at {selectedTimeSlot} is confirmed.
                </p>
                <button
                  onClick={handleClose}
                  className="w-full max-w-xs min-h-[54px] px-8 rounded-[18px] text-[17px] font-semibold transition-transform active:scale-[0.98] bg-[linear-gradient(180deg,#FF5A6E_0%,#FF2D46_55%,#E0152F_100%)] text-white"
                >
                  Done
                </button>
              </div>
            )}
            </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel - Time Slots */}
          {(step === "datetime" && showTimeSelection && selectedService) && (
            <div className="w-[300px] shrink-0 p-5 overflow-y-auto border-l border-white/[0.06] bg-white/[0.02] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[15px] font-semibold text-white tracking-tight">
                  {format(selectedDateObj, 'EEE, MMM d')}
                </h4>
                <div className="inline-flex p-0.5 rounded-full bg-white/[0.06]">
                  {(["12h", "24h"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeFormat(tf)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                        timeFormat === tf ? "bg-white text-[#0e0e10]" : "text-gray-400 hover:text-white"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pr-1 overflow-y-auto flex-1 min-h-0 content-start">
                {availableTimeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={cn(
                      "py-2.5 px-2 rounded-xl border text-[13px] font-semibold text-center transition-all duration-200 active:scale-[0.97]",
                      selectedTimeSlot === time
                        ? "border-[#FF2D46] bg-[#FF2D46] text-white"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.08] text-white/90"
                    )}
                  >
                    {formatTime(time)}
                  </button>
                ))}
                {availableTimeSlots.length === 0 && (
                  <div className="col-span-2 rounded-2xl border border-white/[0.06] p-5 text-center text-[13px] text-gray-500">
                    No available times for this service.
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={handleContinue}
                  disabled={!selectedTimeSlot}
                  className={cn(
                    "w-full min-h-[54px] py-3.5 px-6 rounded-[18px] text-[17px] font-semibold transition-all duration-200 active:scale-[0.99]",
                    selectedTimeSlot
                      ? "bg-[linear-gradient(180deg,#FF5A6E_0%,#FF2D46_55%,#E0152F_100%)] text-white"
                      : "bg-white/[0.08] text-white/40 cursor-not-allowed"
                  )}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </RevealSheet>
  );
}
