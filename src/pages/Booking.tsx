
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import ModernBookingForm from "@/components/ModernBookingForm";


const bookingSchema = z.object({
  customer_name: z.string().min(1, "Name is required"),
  customer_email: z.string().email("Valid email is required"),
  customer_phone: z.string().optional(),
  service_ids: z.array(z.string()).optional(),
  stylist_id: z.string().optional(),
  notes: z.string().optional(),
});

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  text_color: string;
  border_color: string;
}

interface Stylist {
  id: string;
  name: string;
  avatar_url?: string | null;
  title?: string | null;
}

interface BusinessProfile {
  id: string;
  full_name: string;
  brand_color?: string;
  booking_link?: string;
}

interface BookingError {
  code: string;
  message: string;
  details?: string;
}

interface AgendaSettings {
  start_hour: string;
  end_hour: string;
  service_duration: number;
  working_days?: number[] | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service: Service;
  stylist_id?: string | null;
}

const Booking = () => {
  const params = useParams();
  const bookingLink = params.bookingLink;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState<BookingError | null>(null);
  const [emailTheme, setEmailTheme] = useState<"default" | "minimal" | "festive">("default");
  const [accentColor, setAccentColor] = useState<string>("#1a1a1a");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('Booking component loaded with bookingLink:', bookingLink);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      service_ids: [] as string[],
      stylist_id: "",
      notes: "",
    },
  });

  // Fetch business profile by booking link
  const { data: businessProfile, isLoading: profileLoading, isFetching: profileFetching, error: profileError } = useQuery<BusinessProfile>({
    queryKey: ['business-profile', bookingLink],
    enabled: !!bookingLink,
    retry: 1,
    queryFn: async () => {
      console.log('Fetching business profile for booking link:', bookingLink);

      if (!bookingLink) {
        const error: BookingError = {
          code: 'MISSING_BOOKING_LINK',
          message: 'No booking link provided',
          details: 'The URL is missing the booking link parameter'
        };
        console.error('Booking error:', error);
        throw error;
      }

      const { data, error } = await (supabase as any)
        .rpc('get_public_profile_by_booking_link', { _booking_link: bookingLink });

      console.log('Business profile RPC result:', { data, error });

      if (error) {
        const bookingError: BookingError = {
          code: error.code || 'RPC_ERROR',
          message: 'Failed to fetch business profile',
          details: error.message || 'Database query failed'
        };
        console.error('RPC error:', bookingError);
        throw bookingError;
      }

      const profile = Array.isArray(data) ? data[0] : data;

      if (!profile) {
        const error: BookingError = {
          code: 'PROFILE_NOT_FOUND',
          message: 'Business profile not found',
          details: `No business found with booking link: ${bookingLink}`
        };
        console.error('Profile not found:', error);
        throw error;
      }

      return profile as BusinessProfile;
    },
    enabled: !!bookingLink,
    retry: (failureCount, error: any) => {
      console.log('Retry attempt:', failureCount, 'Error:', error);
      // Don't retry if it's a known error that won't resolve
      if (error?.code === 'PROFILE_NOT_FOUND' || error?.code === 'MISSING_BOOKING_LINK') {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Fetch public stylists for this business (after profile resolves)
  const { data: stylists = [] } = useQuery<Stylist[]>({
    queryKey: ['public-stylists', businessProfile?.id],
    queryFn: async () => {
      if (!businessProfile?.id) return [];

      const { data, error } = await (supabase
        .from('stylists' as any)
        .select('id, name, avatar_url, title') as any)
        .eq('user_id', businessProfile.id)
        .eq('is_public', true);

      if (error) {
        console.error('Error fetching stylists:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!businessProfile?.id,
  });

  // Fetch services for this business
  const { data: services = [], error: servicesError } = useQuery<Service[]>({
    queryKey: ['public-services', businessProfile?.id],
    queryFn: async () => {
      if (!businessProfile?.id) return [];

      console.log('Fetching services for business:', businessProfile.id);
      const { data, error } = await (supabase
        .from('services' as any)
        .select('*') as any)
        .eq('user_id', businessProfile.id)
        .order('name');

      console.log('Services query result:', { data, error });

      if (error) {
        console.error('Error fetching services:', error);
        const bookingError: BookingError = {
          code: 'SERVICES_FETCH_ERROR',
          message: 'Failed to load services',
          details: error.message
        };
        throw bookingError;
      }

      if (!data || data.length === 0) {
        const bookingError: BookingError = {
          code: 'NO_SERVICES',
          message: 'No services available',
          details: 'This business has not set up any services yet'
        };
        console.warn('No services found:', bookingError);
      }

      return data || [];
    },
    enabled: !!businessProfile?.id,
  });

  // Fetch agenda settings
  const { data: settings } = useQuery<AgendaSettings>({
    queryKey: ['public-agenda-settings', businessProfile?.id],
    queryFn: async () => {
      if (!businessProfile?.id) return null;

      console.log('Fetching agenda settings for business:', businessProfile.id);
      const { data, error } = await (supabase
        .from('agenda_settings' as any)
        .select('*') as any)
        .eq('user_id', businessProfile.id)
        .maybeSingle();

      console.log('Agenda settings query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching agenda settings:', error);
        return { start_hour: '08:00', end_hour: '18:00', service_duration: 30, working_days: [0,1,2,3,4,5,6] };
      }
      return data || { start_hour: '08:00', end_hour: '18:00', service_duration: 30, working_days: [0,1,2,3,4,5,6] };
    },
    enabled: !!businessProfile?.id,
  });

  // Fetch existing appointments for selected date
  const selectedStylistId = form.watch("stylist_id") || "";

  const { data: existingAppointments = [] } = useQuery<Appointment[], Error>({
    queryKey: [
      'public-appointments',
      businessProfile?.id ?? 'no-business',
      selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'no-date',
    ],
    queryFn: async (): Promise<Appointment[]> => {
      if (!businessProfile?.id || !selectedDate) return [];

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await (supabase as any).rpc('get_booked_slots', {
        _business_id: businessProfile.id,
        _date: dateStr,
      });
      if (error) {
        console.error('Error fetching booked slots:', error);
        return [];
      }
      return (data || []) as Appointment[];
    },
    enabled: !!businessProfile?.id && !!selectedDate,
  });

  // Fetch stylist-service relationships
  const { data: stylistServices = [] } = useQuery<{ stylist_id: string; service_id: string }[]>({
    queryKey: ['stylist-services', businessProfile?.id],
    queryFn: async () => {
      if (!businessProfile?.id) return [];
      const { data, error } = await (supabase as any).rpc('get_public_stylist_services', {
        _business_id: businessProfile.id,
      });
      if (error) {
        console.error('Error fetching stylist services:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!businessProfile?.id,
  });
  const generateTimeSlots = (startHour: string, endHour: string, interval: number = 30) => {
    const slots = [];
    const start = parseInt(startHour.split(':')[0]);
    const end = parseInt(endHour.split(':')[0]);

    for (let hour = start; hour <= end; hour++) {
      for (let minutes = 0; minutes < 60; minutes += interval) {
        if (hour === end && minutes > 0) break;
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push(timeSlot);
      }
    }
    return slots;
  };

  useEffect(() => {
    if (settings) {
      console.log('Generating time slots with settings:', settings);
      const slots = generateTimeSlots(settings.start_hour, settings.end_hour, settings.service_duration);
      setTimeSlots(slots);
    }
  }, [settings]);

  // Use profile brand color as fallback accent
  useEffect(() => {
    if (businessProfile?.brand_color && accentColor === "#1a1a1a") {
      setAccentColor(businessProfile.brand_color);
    }
  }, [businessProfile?.brand_color]);

  // Parse query params for theme/accent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get('theme') as "default" | "minimal" | "festive" | null;
    const accent = params.get('accent');
    if (theme) setEmailTheme(theme);
    if (accent) setAccentColor(accent);
  }, []);

  // Check if a time slot is available
  const isTimeSlotAvailable = (time: string, serviceIds?: string[]) => {
    try {
      const ids = serviceIds || (form.getValues("service_ids") as string[]);
      const stylistId = selectedStylistId;
      if (!ids || ids.length === 0 || !selectedDate) return false;

      // Calculate total duration of all selected services
      const totalDuration = ids.reduce((sum, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return sum + (service?.duration || 0);
      }, 0);

      // Check if selected date is a working day
      const dayOfWeek = selectedDate.getDay();
      if (!settings?.working_days?.includes(dayOfWeek)) {
        return false;
      }

      // Check if time is in the past (for today)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

      if (selectedDay.getTime() === today.getTime()) {
        // It's today - check if the time slot is in the past
        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        if (slotTime <= now) {
          return false;
        }
      }

      const slotInterval = settings?.service_duration || 30;
      const slotsNeeded = Math.ceil(totalDuration / slotInterval);
      const startSlotIndex = timeSlots.indexOf(time);

      // Check if this slot and required subsequent slots are free
      for (let i = 0; i < slotsNeeded; i++) {
        const checkTime = timeSlots[startSlotIndex + i];
        if (!checkTime) return false;

        // If no stylist selected yet, check if ANY stylist is available at this time
        // If stylist selected, only check availability for that specific stylist
        const isOccupied = existingAppointments.some(apt => {
          if (!apt.service) return false;
          const aptTime = apt.appointment_time?.substring(0, 5);
          if (!aptTime) return false;
          const aptDuration = apt.service.duration;
          const aptSlotsNeeded = Math.ceil(aptDuration / slotInterval);
          const aptStartIndex = timeSlots.indexOf(aptTime);
          const checkIndex = timeSlots.indexOf(checkTime);

          // If checking for specific stylist
          if (stylistId) {
            const matchesStylist = apt.stylist_id ? apt.stylist_id === stylistId : false;
            if (!matchesStylist) return false; // Different stylist, doesn't affect this slot
          }

          // Check if the appointment overlaps with this time slot
          return checkIndex >= aptStartIndex && checkIndex < aptStartIndex + aptSlotsNeeded;
        });

        if (isOccupied) return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }
  };

  const getAvailableStylistsForTime = (selectedTime: string, serviceIds?: string[]) => {
    if (!selectedTime || !selectedDate) return [];

    const ids = serviceIds || (form.getValues("service_ids") as string[]);
    if (!ids || ids.length === 0) return [];

    // Calculate total duration of all selected services
    const totalDur = ids.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return sum + (service?.duration || 0);
    }, 0);

    // Check if selected date is a working day
    const dayOfWeek = selectedDate.getDay();
    if (!settings?.working_days?.includes(dayOfWeek)) {
      return [];
    }

    // Check if time is in the past (for today)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    if (selectedDay.getTime() === today.getTime()) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      if (slotTime <= now) {
        return [];
      }
    }

    const slotInterval = settings?.service_duration || 30;
    const slotsNeeded = Math.ceil(totalDur / slotInterval);
    const startSlotIndex = timeSlots.indexOf(selectedTime);

    return stylists.filter(stylist => {
      // Check if this stylist has all required slots free
      for (let i = 0; i < slotsNeeded; i++) {
        const checkTime = timeSlots[startSlotIndex + i];
        if (!checkTime) return false;

        const isOccupied = existingAppointments.some(apt => {
          if (!apt.service) return false;
          const aptTime = apt.appointment_time?.substring(0, 5);
          if (!aptTime) return false;
          const aptDuration = apt.service.duration;
          const aptSlotsNeeded = Math.ceil(aptDuration / slotInterval);
          const aptStartIndex = timeSlots.indexOf(aptTime);
          const checkIndex = timeSlots.indexOf(checkTime);

          // Check if appointment overlaps and is for this stylist
          return checkIndex >= aptStartIndex && checkIndex < aptStartIndex + aptSlotsNeeded &&
                 apt.stylist_id === stylist.id;
        });

        if (isOccupied) return false;
      }

      return true;
    });
  };

  const getAvailableDatesForStylist = (stylistId: string) => {
    const today = new Date();
    const availableDates = [];

    // Check next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Check if it's a working day
      const dayOfWeek = date.getDay();
      if (!settings?.working_days?.includes(dayOfWeek)) {
        continue;
      }

      // Check if there's at least one free slot for this stylist
      const hasFreeSlot = timeSlots.some(time => {
        return !existingAppointments.some(apt =>
          apt.stylist_id === stylistId &&
          apt.appointment_time?.substring(0, 5) === time
        );
      });

      if (hasFreeSlot) {
        availableDates.push(date);
      }
    }

    return availableDates;
  };

  const getAvailableTimesForStylistAndDate = (stylistId: string, date: Date, serviceIds?: string[]) => {
    if (!stylistId || !date) return [];

    const ids = serviceIds || (form.getValues("service_ids") as string[]);
    if (!ids || ids.length === 0) return [];

    // Calculate total duration of all selected services
    const totalDuration = ids.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return sum + (service?.duration || 0);
    }, 0);

    const slotInterval = settings?.service_duration || 30;
    const slotsNeeded = Math.ceil(totalDuration / slotInterval);

    return timeSlots.filter(time => {
      // Check if this stylist has all required slots free
      for (let i = 0; i < slotsNeeded; i++) {
        const timeIndex = timeSlots.indexOf(time);
        const checkTime = timeSlots[timeIndex + i];
        if (!checkTime) return false;

        const isOccupied = existingAppointments.some(apt => {
          if (!apt.service || apt.stylist_id !== stylistId) return false;
          const aptTime = apt.appointment_time?.substring(0, 5);
          if (!aptTime) return false;
          const aptDuration = apt.service.duration;
          const aptSlotsNeeded = Math.ceil(aptDuration / slotInterval);
          const aptStartIndex = timeSlots.indexOf(aptTime);
          const checkIndex = timeSlots.indexOf(checkTime);

          return checkIndex >= aptStartIndex && checkIndex < aptStartIndex + aptSlotsNeeded;
        });

        if (isOccupied) return false;
      }

      return true;
    });
  };

  const onSubmit = async (values: any) => {
    setBookingError(null);

    // Ensure service_ids is present
    const serviceIds = Array.isArray(values.service_ids) ? values.service_ids.filter(Boolean) : [];
    const selectedServicesList = serviceIds
      .map((id: string) => services.find(s => s.id === id))
      .filter((service): service is Service => Boolean(service));

    if (!businessProfile?.id || !selectedDate || !selectedTime || selectedServicesList.length === 0) {
      const error: BookingError = {
        code: 'INCOMPLETE_BOOKING',
        message: 'Incomplete booking information',
        details: 'Please select services, a date and time before confirming'
      };
      setBookingError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating booking with values:', values);
      console.log('Validated services for booking:', selectedServicesList);

      const primaryService = selectedServicesList[0];
      if (!primaryService?.id) {
        const error: BookingError = {
          code: 'INVALID_SERVICE_SELECTION',
          message: 'Selected service is no longer available',
          details: 'Please reselect your service and try again.',
        };
        setBookingError(error);
        toast({
          title: error.message,
          description: error.details,
          variant: 'destructive',
        });
        return false;
      }

      // Guard against race: ensure the slot is still free for this stylist
      if (!isTimeSlotAvailable(selectedTime, selectedServicesList.map(service => service.id))) {
        const error: BookingError = {
          code: 'SLOT_TAKEN',
          message: 'Time slot unavailable',
          details: 'This stylist is no longer free at the selected time. Please pick another slot.',
        };
        setBookingError(error);
        toast({
          title: error.message,
          description: error.details,
          variant: "destructive",
        });
        return false;
      }

      // Create booking via SECURITY DEFINER RPC (works without auth, no edge fn dependency)
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('create_public_booking', {
        p_business_id: businessProfile.id,
        p_customer_name: values.customer_name,
        p_customer_email: values.customer_email,
        p_customer_phone: values.customer_phone || null,
        p_service_id: primaryService.id,
        p_appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        p_appointment_time: selectedTime,
        p_notes: values.notes || null,
      });

      if (rpcError || !rpcResult?.success) {
        console.error('Booking RPC error:', rpcError, rpcResult);
        const error: BookingError = {
          code: rpcError?.code || 'BOOKING_RPC_ERROR',
          message: 'Failed to create appointment',
          details: rpcResult?.error || rpcError?.message || 'Could not schedule the appointment. Please try again.',
        };
        setBookingError(error);
        throw error;
      }

      const newAppointment = { id: rpcResult.appointment_id };

      console.log('Appointment created successfully:', newAppointment);

      // Fire-and-forget Brevo confirmation email via existing edge function
      try {
        (supabase as any).functions.invoke('send-booking-confirmation', {
          body: {
            userId: businessProfile.id,
            customerEmail: values.customer_email,
            customerName: values.customer_name,
            customerPhone: values.customer_phone || null,
            businessName: businessProfile.full_name,
            serviceName: primaryService.name,
            appointmentDate: format(selectedDate, 'EEEE, MMMM d, yyyy'),
            appointmentTime: selectedTime,
            price: primaryService.price,
            notes: values.notes || null,
            bookingId: rpcResult.appointment_id,
            cancelToken: rpcResult.cancel_token,
            manageUrl: `${window.location.origin}/manage/${rpcResult.cancel_token}`,
            accentColor: accentColor,
          },
        }).catch((e: any) => console.warn('Email send failed (non-fatal):', e));
      } catch (e) {
        console.warn('Email invoke threw (non-fatal):', e);
      }

      toast({
        title: "Booking Confirmed!",
        description: "Your appointment has been scheduled successfully. Check your email for confirmation.",
      });

      // Invalidate ALL appointment-related queries to refresh agenda immediately
      await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['public-appointments'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['recent-bookings'], exact: false });

      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['appointments'], exact: false });

      form.reset();
      setSelectedTime("");
      return true; // Return true to advance to success step
    } catch (error: any) {
      console.error('Error creating booking:', error);

      const displayError = bookingError || {
        code: 'UNKNOWN_ERROR',
        message: 'Booking failed',
        details: error?.message || 'An unexpected error occurred. Please try again.'
      };

      toast({
        title: displayError.message,
        description: displayError.details,
        variant: "destructive",
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading booking page...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (profileError || !businessProfile) {
    console.error('Profile loading error or no business profile:', profileError, businessProfile);

    const error = profileError as any;
    const errorCode = error?.code || 'UNKNOWN_ERROR';
    const errorMessage = error?.message || 'Booking Not Found';
    const errorDetails = error?.details || "The booking link you're looking for doesn't exist or has been removed.";

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">{errorMessage}</h1>
            <p className="text-slate-300 mb-4">{errorDetails}</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
            <div className="text-xs text-slate-500 mb-2">Error Details:</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Error Code:</span>
                <span className="font-mono text-slate-300">{errorCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Booking Link:</span>
                <span className="font-mono text-slate-300">{bookingLink || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
   );
  }

  // Show warning if no services available
  if (services.length === 0 && !servicesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">No Services Available</h1>
            <p className="text-slate-300 mb-4">
              {businessProfile?.full_name || 'This business'} hasn't set up any services yet.
            </p>
            <p className="text-slate-400 text-sm">
              Please contact them directly or check back later.
            </p>
          </div>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ModernBookingForm
      form={form}
      services={services || []}
      stylists={stylists}
      stylistServices={stylistServices}
      existingAppointments={existingAppointments}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      selectedTime={selectedTime}
      setSelectedTime={setSelectedTime}
      timeSlots={timeSlots}
      isTimeSlotAvailable={isTimeSlotAvailable}
      getAvailableStylistsForTime={getAvailableStylistsForTime}
      getAvailableDatesForStylist={getAvailableDatesForStylist}
      getAvailableTimesForStylistAndDate={getAvailableTimesForStylistAndDate}
      onSubmit={onSubmit}
      isLoading={isLoading}
      businessProfile={businessProfile}
      workingDays={settings?.working_days ?? [0,1,2,3,4,5,6]}
    />
  );
};

export default Booking;
