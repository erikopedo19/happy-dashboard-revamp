import { useState, useMemo, useEffect, useRef } from "react";
import { X, ChevronLeft, Clock, User, ArrowRight, Video, Globe, Check, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

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

// Generate time slots from 9 AM to 6 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 18; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour !== 18) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

export function AppointmentForm({ isOpen, onClose, selectedDate, selectedTime, services: providedServices, initialServiceId = null }: AppointmentFormProps) {
  const [step, setStep] = useState<"datetime" | "details" | "success">("datetime");
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date(selectedDate));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(selectedTime);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const shouldFetchServices = !providedServices;
  const selectedDateIso = format(selectedDateObj, 'yyyy-MM-dd');

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
  const { data: bookedSlots = [] } = useQuery<string[]>({
    queryKey: ['booked-slots', user?.id, selectedDateIso],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('appointments')
        .select('appointment_time, status')
        .eq('user_id', user.id)
        .eq('appointment_date', selectedDateIso)
        .neq('status', 'cancelled')
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: { appointment_time: string }) => row.appointment_time.slice(0, 5));
    },
    enabled: !!user && isOpen,
  });

  const bookedSlotsSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedService = services.find((s: Service) => s.id === serviceId);
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
    if (!selectedTimeSlot) {
      toast({
        title: "Select a time",
        description: "Please select an available time slot.",
        variant: "destructive",
      });
      return;
    }

    if (bookedSlotsSet.has(selectedTimeSlot)) {
      toast({
        title: "Time unavailable",
        description: "That time slot is already booked. Please choose another time.",
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
            user_id: user.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        customerId = newCustomer.id;
      }

      // Double-check time slot availability before creating appointment
      const normalizedSelectedTime = selectedTimeSlot.slice(0, 5);
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

      // Send confirmation email + SMS (non-blocking)
      if (customerEmail || customerPhone) {
        try {
          await (supabase as any).functions.invoke('send-booking-confirmation', {
            body: {
              customerEmail: customerEmail || undefined,
              customerName,
              customerPhone: customerPhone || undefined,
              businessName: profile?.business_name || profile?.full_name || 'Your appointment',
              serviceName: validSelectedService.name,
              appointmentDate: format(selectedDateObj, 'EEEE, MMMM d, yyyy'),
              appointmentTime: selectedTimeSlot,
              price: validSelectedService.price,
              notes: notes.trim() || undefined,
              bookingId: createdAppt?.id?.toString().substring(0, 8),
              accentColor: profile?.brand_color || '#1a1a1a',
              senderEmail: profile?.sender_email || 'noreply@cutzioo.com',
              senderName: profile?.sender_name || profile?.business_name || profile?.full_name || 'Cutzioo',
            },
          });
        } catch (emailErr) {
          console.warn('Confirmation email/SMS failed:', emailErr);
        }
      }

      toast({
        title: "Appointment Booked!",
        description: `Your appointment is confirmed for ${format(selectedDateObj, 'MMMM d')} at ${selectedTimeSlot}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === 'appointments' || key === 'public-appointments';
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
    setCurrentMonth(new Date(selectedDate));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "p-0 overflow-hidden border-0 shadow-2xl",
        isMobile
          ? "w-screen h-[100dvh] max-w-none rounded-none m-0 bg-[#1a1a1a] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300"
          : "max-w-5xl w-[92vw] max-h-[88vh] rounded-2xl bg-[#1a1a1a]"
      )}>
        <DialogTitle className="sr-only">Book Appointment</DialogTitle>
        
        <motion.div
          ref={contentRef}
          initial={isMobile ? { y: 24, opacity: 0 } : false}
          animate={isMobile ? { y: 0, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
          className={cn(
            "bg-[#1a1a1a]",
            isMobile ? "h-[100dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]" : "flex max-h-[88vh] min-h-[560px] overflow-hidden"
          )}
        >
          {/* Left Panel - Service Info */}
          <div className={cn(
            "bg-[#1a1a1a] flex flex-col",
            isMobile ? "p-4 pt-14 border-b border-[#2a2a2a]" : "w-[320px] p-8 border-r border-[#2a2a2a]"
          )}>
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Profile */}
            <div className={cn(isMobile ? "mt-0 mb-4" : "mt-8 mb-6")}>
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'user'}`}
                  alt={profile?.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="mt-3 text-sm text-gray-400">{profile?.full_name || profile?.business_name || 'Your Business'}</p>
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
                <div className="flex items-center gap-2 text-gray-300">
                  <Video className="w-4 h-4 text-gray-500" />
                  <span>Google Meet</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span>Europe/Bucharest</span>
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
            "bg-[#1a1a1a]",
            isMobile ? "p-4 border-b border-[#2a2a2a]" : "flex-1 p-8 border-r border-[#2a2a2a] overflow-y-auto"
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
                        reached ? "bg-red-500" : "bg-[#2a2a2a]"
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2a2a2a] transition-colors text-gray-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2a2a2a] transition-colors text-gray-400"
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
                              ? "border-red-500 bg-[#2a2a2a]"
                              : "border-[#2a2a2a] hover:border-gray-600"
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
                        
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => handleDateSelect(day)}
                            disabled={!isCurrentMonth}
                            className={cn(
                              "aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all",
                              isSelected
                                ? "bg-red-500 text-white"
                                : !isCurrentMonth
                                ? "text-gray-600"
                                : "text-white hover:bg-[#2a2a2a]"
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

                <form onSubmit={handleSubmit} className={cn("space-y-4 flex-1", isMobile && "pb-24") }>
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
                        className="w-full pl-12 pr-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl focus:border-red-500 focus:outline-none transition-colors text-white placeholder-gray-500"
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
                      className="w-full px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl focus:border-red-500 focus:outline-none transition-colors text-white placeholder-gray-500"
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
                      className="w-full px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl focus:border-red-500 focus:outline-none transition-colors text-white placeholder-gray-500"
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
                      className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl focus:border-red-500 focus:outline-none transition-colors text-white placeholder-gray-500 resize-none"
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

                  <div className={cn(isMobile ? "sticky bottom-0 bg-[#1a1a1a] pt-4 pb-2" : "mt-auto pt-6")}>
                    <button
                      type="submit"
                      disabled={isLoading || !customerName}
                      className={cn(
                        "w-full py-4 px-6 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2",
                        customerName && !isLoading
                          ? "bg-red-500 hover:bg-red-600"
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
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">You're Booked!</h3>
                <p className="text-gray-400 mb-6">
                  Your appointment for {format(selectedDateObj, 'MMMM d')} at {selectedTimeSlot} is confirmed.
                </p>
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            )}
            </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel - Time Slots */}
          {step === "datetime" && showTimeSelection && selectedService && (
            <div className={cn(
              "bg-[#1a1a1a]",
              isMobile ? "p-4 pb-8" : "w-[280px] p-6 overflow-y-auto"
            )}>
              {!showSelectedTimeSummary && (
                <>
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setTimeFormat("12h")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        timeFormat === "12h" ? "bg-[#2a2a2a] text-white" : "text-gray-500 hover:text-white"
                      )}
                    >
                      12h
                    </button>
                    <button
                      onClick={() => setTimeFormat("24h")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        timeFormat === "24h" ? "bg-[#2a2a2a] text-white" : "text-gray-500 hover:text-white"
                      )}
                    >
                      24h
                    </button>
                  </div>

                  <h4 className="text-sm font-medium text-white mb-4">
                    {format(selectedDateObj, 'EEE dd')}
                  </h4>

                  <div className={cn("space-y-2 overflow-y-auto", isMobile ? "max-h-none" : "max-h-[400px]")}>
                    {timeSlots.map((time) => {
                      const isBooked = bookedSlotsSet.has(time);

                      return (
                        <button
                          key={time}
                          onClick={() => {
                            if (isBooked) return;
                            handleTimeSelect(time);
                          }}
                          disabled={isBooked}
                          className={cn(
                            "w-full py-3 px-4 rounded-xl border font-medium transition-all text-center flex items-center justify-center gap-2",
                            isBooked
                              ? "border-[#2a2a2a] text-gray-500 cursor-not-allowed opacity-60"
                              : selectedTimeSlot === time
                                ? "border-red-500 bg-red-500/10 text-white"
                                : "border-[#2a2a2a] hover:border-gray-600 text-white"
                          )}
                        >
                          <span>{formatTime(time)}</span>
                          {isBooked && <span className="text-[10px] uppercase tracking-wide">Booked</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {showSelectedTimeSummary && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Selected slot</p>
                      <p className="text-white font-semibold mt-1">{format(selectedDateObj, 'EEE, MMM d')} · {formatTime(selectedTimeSlot)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeSlot("")}
                      className="text-sm text-red-300 hover:text-white transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <div className={cn(isMobile ? "sticky bottom-0 bg-[#1a1a1a] pt-4" : "mt-6")}>
                <button
                  onClick={handleContinue}
                  disabled={!selectedTimeSlot}
                  className={cn(
                    "w-full py-3 px-6 rounded-xl font-semibold text-white transition-all",
                    selectedTimeSlot
                      ? "bg-red-500 hover:bg-red-600"
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
