import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO, addMinutes } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Search, Filter, Calendar, Clock, Users, Sun, Moon, Eye, EyeOff, Coffee, Settings, Grid3X3, Edit3, Trash2, X, MoreHorizontal, RefreshCw, AlertTriangle, Check, Send, Edit, Phone, Scissors, DollarSign, User, Star, TrendingUp, Copy, ClipboardPaste, Pin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from 'react-hook-form';
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from '@tanstack/react-query';

// Simple RadialMenu replacement - just renders children with right-click menu
const RadialMenu = ({ children, menuItems, onSelect }: {
  children: React.ReactNode;
  menuItems: any[];
  onSelect: (item: any) => void;
}) => {
  return <div>{children}</div>;
};

interface Service {
  id: string;
  name: string;
  duration: number;
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
interface Stylist {
  id: string;
  name: string;
  email?: string;
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
  stylist?: Stylist;
  totalDurationMinutes?: number;
}
interface ModernAppointmentsCalendarProps {
  appointments: Appointment[];
  onDateTimeClick: (date: string, time: string) => void;
  services?: Service[];
  currentWeekExternal?: Date;
  onWeekChange?: (week: Date) => void;
}
export const ModernAppointmentsCalendar = ({
  appointments,
  onDateTimeClick,
  services = [],
  currentWeekExternal,
  onWeekChange
}: ModernAppointmentsCalendarProps) => {
  const isControlledExternally = !!currentWeekExternal;
  const [internalCurrentWeek, setInternalCurrentWeek] = useState(new Date());
  const currentWeek = currentWeekExternal ?? internalCurrentWeek;
  const setCurrentWeek = (week: Date | ((prev: Date) => Date)) => {
    if (onWeekChange) {
      const newWeek = typeof week === 'function' ? week(currentWeek) : week;
      onWeekChange(newWeek);
    } else {
      setInternalCurrentWeek(week);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  // showCards state removed
  const [breakSlots, setBreakSlots] = useState<Set<string>>(new Set());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [viewMode, setViewMode] = useState<'week' | 'day'>(currentWeekExternal ? 'day' : 'week');
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [quickBookingDate, setQuickBookingDate] = useState('');
  const [quickBookingTime, setQuickBookingTime] = useState('');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [stylistRating, setStylistRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; appointment: Appointment } | null>(null);
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Fetch agenda settings for dynamic time slots
  const { data: agendaSettings } = useQuery({
    queryKey: ['agenda_settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('agenda_settings')
        .select('start_hour, end_hour, service_duration, working_days')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching agenda settings:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  // Generate dynamic time slots based on settings
  const timeSlots = useMemo(() => {
    const startHour = agendaSettings?.start_hour ? parseInt(agendaSettings.start_hour.split(':')[0]) : 8;
    const startMinute = agendaSettings?.start_hour ? parseInt(agendaSettings.start_hour.split(':')[1] || '0') : 0;
    const endHour = agendaSettings?.end_hour ? parseInt(agendaSettings.end_hour.split(':')[0]) : 18;
    const endMinute = agendaSettings?.end_hour ? parseInt(agendaSettings.end_hour.split(':')[1] || '0') : 0;
    const duration = agendaSettings?.service_duration || 60;

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    if (endTotalMinutes <= startTotalMinutes || duration <= 0) {
      return [];
    }

    const slots: string[] = [];
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += duration) {
      const hour = Math.floor(minutes / 60);
      const mins = minutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    }

    return slots;
  }, [agendaSettings]);

  // Quick booking form
  const quickBookingForm = useForm({
    defaultValues: {
      customerName: '',
      serviceId: services[0]?.id || '',
    }
  });
  const startOfCurrentWeek = startOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const endOfCurrentWeek = endOfWeek(currentWeek, {
    weekStartsOn: 1
  });
  const weekDays = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfCurrentWeek,
      end: endOfCurrentWeek
    });

    const workingDays = agendaSettings?.working_days;
    if (!workingDays || workingDays.length === 0) {
      return days;
    }

    return days.filter(day => workingDays.includes(day.getDay()));
  }, [startOfCurrentWeek, endOfCurrentWeek, agendaSettings?.working_days]);
  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  // Filter appointments by search query and service
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => apt.customer.name.toLowerCase().includes(query) || apt.service.name.toLowerCase().includes(query));
    }
    if (selectedService) {
      filtered = filtered.filter(apt => apt.service.id === selectedService);
    }
    return filtered;
  }, [appointments, searchQuery, selectedService]);

  // Build appointment map for quick lookup
  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of filteredAppointments) {
      const key = `${apt.appointment_date}|${apt.appointment_time.slice(0, 5)}`;
      const arr = map.get(key);
      if (arr) arr.push(apt); else map.set(key, [apt]);
    }
    return map;
  }, [filteredAppointments]);
  const getAppointmentsForDateTime = (date: Date, time: string) => {
    const key = `${format(date, 'yyyy-MM-dd')}|${time.slice(0, 5)}`;
    return appointmentMap.get(key) || [];
  };

  // Calculate how many slots an appointment spans
  const getSlotSpan = (appointment: Appointment) => {
    const slotDuration = agendaSettings?.service_duration || 60;
    const serviceDuration = appointment.totalDurationMinutes || appointment.service.duration;
    return Math.ceil(serviceDuration / slotDuration);
  };

  // Check if a slot is occupied by a spanning appointment from an earlier slot
  const isSlotOccupied = (date: Date, time: string) => {
    const slotDuration = agendaSettings?.service_duration || 60;
    const currentSlotIndex = timeSlots.indexOf(time);
    if (currentSlotIndex === -1) return false;

    // Check previous slots to see if any appointments span into this slot
    for (let i = 0; i < currentSlotIndex; i++) {
      const prevTime = timeSlots[i];
      const prevAppointments = getAppointmentsForDateTime(date, prevTime);

      for (const apt of prevAppointments) {
        const span = getSlotSpan(apt);
        const aptSlotIndex = timeSlots.indexOf(prevTime);
        // If this appointment spans into the current slot
        if (aptSlotIndex + span > currentSlotIndex) {
          return true;
        }
      }
    }
    return false;
  };
  const toggleBreakSlot = (date: Date, time: string) => {
    const key = `${format(date, 'yyyy-MM-dd')}|${time}`;
    const newBreakSlots = new Set(breakSlots);
    if (newBreakSlots.has(key)) {
      newBreakSlots.delete(key);
    } else {
      newBreakSlots.add(key);
    }
    setBreakSlots(newBreakSlots);
  };
  const isBreakSlot = (date: Date, time: string) => {
    const key = `${format(date, 'yyyy-MM-dd')}|${time}`;
    return breakSlots.has(key);
  };

  // Long press handlers
  const handleLongPressStart = useCallback((appointment: Appointment) => {
    setIsLongPressing(true);
    setLongPressedId(appointment.id);
    longPressTimer.current = setTimeout(() => {
      setSelectedAppointment(appointment);
      setShowAppointmentDetails(true);
      setIsLongPressing(false);
      setLongPressedId(null);
    }, 3800);
  }, []);
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    setLongPressedId(null);
  }, []);
  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setRescheduleDate(selectedAppointment.appointment_date);
    setRescheduleTime(selectedAppointment.appointment_time.slice(0, 5));
    setShowAppointmentDetails(false);
    setShowRescheduleDialog(true);
  };
  const handleConfirmReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    try {
      const {
        error
      } = await (supabase as any).from('appointments').update({
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
        updated_at: new Date().toISOString()
      }).eq('id', selectedAppointment.id);
      if (error) throw error;
      toast({
        title: "Appointment Rescheduled",
        description: `Moved to ${format(new Date(rescheduleDate), 'MMM d')} at ${rescheduleTime}`
      });
      setShowRescheduleDialog(false);
      setSelectedAppointment(null);
      // Refresh data without page reload
      window.dispatchEvent(new Event('appointmentUpdated'));
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive"
      });
    }
  };
  const handleDelete = () => {
    if (!selectedAppointment) return;
    setShowAppointmentDetails(false);
    setShowDeleteDialog(true);
  };
  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return;
    try {
      const {
        error
      } = await (supabase as any).from('appointments').delete().eq('id', selectedAppointment.id);
      if (error) throw error;
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been cancelled successfully."
      });
      setShowDeleteDialog(false);
      setSelectedAppointment(null);
      // Refresh data without page reload
      window.dispatchEvent(new Event('appointmentUpdated'));
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive"
      });
    }
  };
  const getServiceGradient = (service: Service) => {
    const gradientMap: {
      [key: string]: string;
    } = {
      'bg-blue-50': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'bg-emerald-50': 'linear-gradient(135deg, #14b8a6, #0d9488)',
      'bg-purple-50': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'bg-teal-50': 'linear-gradient(135deg, #14b8a6, #0f766e)',
      'bg-pink-50': 'linear-gradient(135deg, #e57373, #dc2626)',
      'bg-red-50': 'linear-gradient(135deg, #ef4444, #dc2626)',
      'bg-orange-50': 'linear-gradient(135deg, #f97316, #ea580c)',
      'bg-yellow-50': 'linear-gradient(135deg, #eab308, #ca8a04)',
      'bg-indigo-50': 'linear-gradient(135deg, #6366f1, #4f46e5)',
      'bg-green-50': 'linear-gradient(135deg, #22c55e, #16a34a)',
      // Legacy support for old color format
      'bg-blue-500': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'bg-purple-500': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'bg-green-500': 'linear-gradient(135deg, #22c55e, #16a34a)',
      'bg-orange-500': 'linear-gradient(135deg, #f97316, #ea580c)',
      'bg-red-500': 'linear-gradient(135deg, #ef4444, #dc2626)',
      'bg-pink-500': 'linear-gradient(135deg, #e57373, #dc2626)',
      'bg-yellow-500': 'linear-gradient(135deg, #eab308, #ca8a04)',
      'bg-cyan-500': 'linear-gradient(135deg, #06b6d4, #0891b2)'
    };
    return gradientMap[service.color] || 'linear-gradient(135deg, #6b7280, #4b5563)';
  };
  const getServiceColors = (service: Service) => {
    const colorMap: {
      [key: string]: {
        bg: string;
        text: string;
        border: string;
      };
    } = {
      'bg-blue-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#e57373]'
      },
      'bg-purple-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#ba68c8]'
      },
      'bg-green-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#81c784]'
      },
      'bg-orange-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#ffb74d]'
      },
      'bg-red-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#e57373]'
      },
      'bg-pink-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#f06292]'
      },
      'bg-yellow-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#fff176]'
      },
      'bg-cyan-500': {
        bg: 'bg-card hover:bg-muted/50',
        text: 'text-foreground',
        border: 'border-l-[#4dd0e1]'
      }
    };
    return colorMap[service.color] || {
      bg: 'bg-card hover:bg-muted/50',
      text: 'text-foreground',
      border: 'border-l-[#e57373]'
    };
  };

  // Handle right click for quick booking
  const handleCompleteAppointment = async () => {
    if (!selectedAppointment) return;
    setIsCompleting(true);
    try {
      const { error } = await (supabase as any)
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment Completed",
        description: "The appointment has been marked as completed."
      });

      setShowAppointmentDetails(false);

      // Show rating dialog if stylist exists
      if (selectedAppointment.stylist?.id) {
        setShowRatingDialog(true);
      } else {
        setSelectedAppointment(null);
        window.dispatchEvent(new Event('appointmentUpdated'));
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedAppointment?.stylist?.id || stylistRating === 0) return;

    try {
      // Save rating to stylist_ratings table
      const { error } = await (supabase as any)
        .from('stylist_ratings')
        .insert({
          stylist_id: selectedAppointment.stylist.id,
          appointment_id: selectedAppointment.id,
          rating: stylistRating,
          comment: ratingComment,
          user_id: user?.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update stylist satisfaction score
      const { data: existingRatings } = await (supabase as any)
        .from('stylist_ratings')
        .select('rating')
        .eq('stylist_id', selectedAppointment.stylist.id);

      if (existingRatings && existingRatings.length > 0) {
        const avgRating = existingRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / existingRatings.length;

        await (supabase as any)
          .from('stylists')
          .update({ satisfaction: avgRating })
          .eq('id', selectedAppointment.stylist.id);
      }

      toast({
        title: "Rating Submitted",
        description: `You rated ${selectedAppointment.stylist.name} ${stylistRating} stars!`
      });

      setShowRatingDialog(false);
      setStylistRating(0);
      setRatingComment('');
      setSelectedAppointment(null);
      window.dispatchEvent(new Event('appointmentUpdated'));
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive"
      });
    }
  };

  // Handle right click on appointment to show context menu
  const handleAppointmentRightClick = (e: React.MouseEvent, appointment: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, appointment });
  };

  // Handle right click for quick booking
  const handleSlotRightClick = (e: React.MouseEvent, date: Date, time: string) => {
    e.preventDefault();
    const appointments = getAppointmentsForDateTime(date, time);
    if (appointments.length === 0 && !isBreakSlot(date, time)) {
      setQuickBookingDate(format(date, 'yyyy-MM-dd'));
      setQuickBookingTime(time);
      setShowQuickBooking(true);
    }
  };

  // Quick booking submission
  const handleQuickBooking = async (data: { customerName: string; serviceId: string }) => {
    try {
      // First create or find customer
      const { data: existingCustomer } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('name', data.customerName)
        .eq('user_id', user?.id)
        .single();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await (supabase as any)
          .from('customers')
          .insert({
            name: data.customerName,
            user_id: user?.id
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create appointment
      const { error: appointmentError } = await (supabase as any)
        .from('appointments')
        .insert({
          customer_id: customerId,
          service_id: data.serviceId,
          appointment_date: quickBookingDate,
          appointment_time: quickBookingTime,
          user_id: user?.id,
          status: 'scheduled'
        });

      if (appointmentError) throw appointmentError;

      toast({
        title: "Appointment Created",
        description: `Quick booking for ${data.customerName} on ${format(new Date(quickBookingDate), 'MMM d')} at ${quickBookingTime}`
      });

      setShowQuickBooking(false);
      quickBookingForm.reset();
      // Refresh data without page reload
      window.dispatchEvent(new Event('appointmentUpdated'));
    } catch (error) {
      console.error('Error creating quick booking:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive"
      });
    }
  };

  // Calculate client stats
  const clientStats = useMemo(() => {
    const customerAppointments = new Map<string, number>();
    let totalRevenue = 0;

    appointments.forEach(apt => {
      const count = customerAppointments.get(apt.customer.id) || 0;
      customerAppointments.set(apt.customer.id, count + 1);
      totalRevenue += apt.price || 0;
    });

    const topCustomer = Array.from(customerAppointments.entries())
      .sort(([, a], [, b]) => b - a)[0];

    const topCustomerData = topCustomer ?
      appointments.find(apt => apt.customer.id === topCustomer[0])?.customer : null;

    return {
      topCustomer: topCustomerData,
      topCustomerCount: topCustomer?.[1] || 0,
      totalRevenue,
      uniqueCustomers: customerAppointments.size
    };
  }, [appointments]);

  // When there are no appointments, hide the mini tabs/time-slot grid entirely.
  if (appointments.length === 0) {
    const defaultDate = format(new Date(), 'yyyy-MM-dd');
    const defaultTime = agendaSettings?.start_hour ?? '09:00';

    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 flex flex-col items-center justify-center text-center min-h-[calc(100vh-140px)]">
          <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            No appointment set on agenda
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Add your first booking to start using the agenda.
          </p>

          <Button
            onClick={() => onDateTimeClick(defaultDate, defaultTime)}
            className="mt-5 bg-[#007AFF] hover:bg-[#0062CC] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book appointment
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header - Only show when not controlled externally */}
      {!isControlledExternally && (
        <div className="border-b border-gray-200 backdrop-blur-sm sticky top-0 z-10 bg-white/90">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: Date and Week */}
          <div>
            <h1 className="text-2xl font-medium text-gray-800 tracking-tight">
              {format(currentWeek, 'EEEE, MMM d')}
            </h1>
            <p className="text-sm text-gray-500">
              Week {format(currentWeek, 'w')}
            </p>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white/60 border-gray-200 focus:border-gray-300 focus:bg-white/80 transition-all rounded-full backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Right: View Toggles & Navigation */}
          <div className="flex items-center gap-3">
            {/* View Mode */}
            <div className="flex items-center bg-white/60 rounded-lg p-1 border border-gray-200 backdrop-blur-sm">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'week'
                  ? 'bg-white text-gray-800 border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'day'
                  ? 'bg-white text-gray-800 border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Day
              </button>
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Navigation */}
            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())} className="h-9 rounded-lg border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80 hover:border-gray-300 backdrop-blur-sm">
              Today
            </Button>
            <div className="flex items-center gap-1 bg-white/60 rounded-lg p-0.5 border border-gray-200 backdrop-blur-sm">
              <Button variant="ghost" size="icon" onClick={handlePreviousWeek} className="h-8 w-8 rounded-md hover:bg-white/80 text-gray-500 hover:text-gray-700">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 rounded-md hover:bg-white/80 text-gray-500 hover:text-gray-700">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Calendar Grid - Conditional Rendering Based on View Mode */}
      {viewMode === 'week' ? (
        /* Week Overview Mode */
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Generate 6 weeks: 2 past, current, 3 future */}
            {Array.from({ length: 6 }, (_, i) => {
              const weekOffset = i - 2; // -2, -1, 0, 1, 2, 3
              const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const isCurrentWeek = weekOffset === 0;
              const isPast = weekOffset < 0;

              const weekAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.appointment_date);
                return aptDate >= weekStart && aptDate <= weekEnd;
              });

              // Calculate stats
              const totalRevenue = weekAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
              const uniqueCustomers = new Set(weekAppointments.map(apt => apt.customer.id)).size;

              // Service breakdown
              const serviceStats = weekAppointments.reduce((acc, apt) => {
                acc[apt.service.name] = (acc[apt.service.name] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const sortedServices = Object.entries(serviceStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3);

              // iOS-style gradient colors for each week
              const weekColors = [
                { gradient: 'from-purple-500 to-pink-500', bg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20', text: 'text-purple-700 dark:text-purple-300' },
                { gradient: 'from-blue-500 to-cyan-500', bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20', text: 'text-blue-700 dark:text-blue-300' },
                { gradient: 'from-green-500 to-emerald-500', bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20', text: 'text-green-700 dark:text-green-300' },
                { gradient: 'from-orange-500 to-red-500', bg: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20', text: 'text-orange-700 dark:text-orange-300' },
                { gradient: 'from-indigo-500 to-purple-500', bg: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20', text: 'text-indigo-700 dark:text-indigo-300' },
                { gradient: 'from-pink-500 to-rose-500', bg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20', text: 'text-pink-700 dark:text-pink-300' },
              ];
              const colorScheme = weekColors[i % weekColors.length];

              return (
                <div
                  key={weekOffset}
                  onClick={() => {
                    setCurrentWeek(weekStart);
                    setViewMode('day');
                  }}
                  className={`cursor-pointer group relative overflow-hidden rounded-2xl bg-white/40 border border-gray-200 transition-all duration-300 hover:bg-white/50 hover:border-gray-300 p-5 ${
                    isCurrentWeek ? 'ring-1 ring-primary/30' : ''
                  }`}
                >
                  {/* Subtle color background based on week color */}
                  <div className={`absolute inset-0 ${colorScheme.text.replace('text-', 'bg-')}/5 pointer-events-none rounded-2xl`} />

                  {/* Light border glow on hover */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-gray-200/20 blur-sm transition-all duration-500 pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                    {/* Header with week number and date range */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-medium text-gray-800">{format(weekStart, 'w')}</div>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Week</div>
                      </div>
                      {isCurrentWeek && (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-gray-500">
                      {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-white/30 rounded-xl p-3 border border-gray-100 hover:bg-white/40 transition-colors">
                        <div className="text-xs text-gray-500 font-medium mb-1">BOOKINGS</div>
                        <div className="text-2xl font-medium text-gray-800">{weekAppointments.length}</div>
                      </div>
                      <div className="bg-white/30 rounded-xl p-3 border border-gray-100 hover:bg-white/40 transition-colors">
                        <div className="text-xs text-gray-500 font-medium mb-1">REVENUE</div>
                        <div className="text-2xl font-medium text-gray-800">${totalRevenue}</div>
                      </div>
                      <div className="bg-white/30 rounded-xl p-3 border border-gray-100 hover:bg-white/40 transition-colors">
                        <div className="text-xs text-gray-500 font-medium mb-1">CLIENTS</div>
                        <div className="text-2xl font-medium text-gray-800">{uniqueCustomers}</div>
                      </div>
                    </div>

                    {/* Top services */}
                    {weekAppointments.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Top Services</div>
                        <div className="space-y-1.5">
                          {sortedServices.slice(0, 2).map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1 pr-2 text-gray-700">{name}</span>
                              <span className="text-xs font-medium text-gray-500 bg-white/40 border border-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Day/Detail View Mode */
        <div className="p-6">
          <div className="bg-white/40 rounded-2xl border border-gray-200 overflow-hidden">
            {/* Grid Container */}
            <div
              className="grid gap-0"
              style={{ gridTemplateColumns: `80px repeat(${Math.max(weekDays.length, 1)}, minmax(0, 1fr))` }}
            >
              {/* Time Column Header */}
              <div className="h-[60px] flex items-center justify-center border-b border-r border-gray-200 bg-white/50">
                <Clock className="h-4 w-4 text-gray-500" />
              </div>

              {/* Day Headers */}
              {weekDays.map(day => <div key={day.toISOString()} className="h-[60px] flex flex-col justify-center items-center border-b border-r border-gray-200 last:border-r-0 bg-white/50">
                <div className="text-[14px] font-medium text-gray-800">
                  {format(day, 'EEE')}
                </div>
                <div className="text-[12px] text-gray-500 mt-0.5">
                  {format(day, 'd')}
                </div>
                {isSameDay(day, new Date()) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1" />}
              </div>)}

              {/* Time Slots Grid */}
              {timeSlots.map((time, index) => (
                <React.Fragment key={`timeslot-${time}-${index}`}>
                  {/* Time Label */}
                  <div key={`time-${time}`} className="h-[80px] flex items-center justify-center border-b border-r border-gray-200 dark:border-[#2C2C2E] bg-white/50 dark:bg-[#1C1C1E]/50 last:border-b-0">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{time}</span>
                  </div>

                  {/* Day Cells */}
                  {weekDays.map(day => {
                    const dayAppointments = getAppointmentsForDateTime(day, time);
                    const hasAppointments = dayAppointments.length > 0;
                    const isBreak = isBreakSlot(day, time);
                    const isCurrentHour = isSameDay(day, new Date()) && parseInt(time.split(':')[0]) === new Date().getHours();
                    const occupied = isSlotOccupied(day, time);

                    // Check if this time slot is in the past
                    const now = new Date();
                    const slotDateTime = new Date(day);
                    const [hours, minutes] = time.split(':').map(Number);
                    slotDateTime.setHours(hours, minutes, 0, 0);
                    const isPastSlot = slotDateTime < now;

                    // Calculate row span for appointments
                    const rowSpan = hasAppointments ? getSlotSpan(dayAppointments[0]) : 1;

                    // Skip rendering if this slot is occupied by a spanning appointment
                    if (occupied) {
                      return null;
                    }

                    // Simple slot design - thin lines, gradients, just + for empty
                    const slotGradient = hasAppointments 
                      ? 'linear-gradient(135deg, #34c759 0%, #30d158 100%)'
                      : isBreak
                        ? 'linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)'
                        : isPastSlot
                          ? 'linear-gradient(135deg, #8e8e93 0%, #636366 100%)'
                          : isCurrentHour
                            ? 'linear-gradient(135deg, #ff2d55 0%, #ff375f 100%)'
                            : 'linear-gradient(135deg, #2eadff 0%, #3d83ff 100%)';

                    return <div
                      key={`${day.toISOString()}-${time}`}
                      className={`h-[80px] border-r border-b-[0.5px] border-gray-200/50 dark:border-[#2C2C2E]/50 last:border-r-0 p-1 group relative transition-all ${isCurrentHour ? 'bg-red-500/5 dark:bg-red-500/10' : ''} ${isBreak ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''} ${isPastSlot ? 'bg-gray-500/5 dark:bg-gray-500/10' : ''}`}
                      style={hasAppointments ? { gridRow: `span ${rowSpan}`, height: `${rowSpan * 80}px` } : {}}
                      onContextMenu={(e) => {
                      e.preventDefault();
                      if (hasAppointments) {
                        handleAppointmentRightClick(e, dayAppointments[0]);
                      } else if (!isBreak) {
                        handleSlotRightClick(e, day, time);
                      } else {
                        toggleBreakSlot(day, time);
                      }
                    }}>
                      {isCurrentHour && <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent z-10" />}

                      {isBreak ? (
                        // Break slot - simple diagonal pattern
                        <div className="w-full h-full rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-l-2 border-orange-500/50 flex items-center justify-center cursor-pointer hover:from-orange-500/15 hover:to-orange-600/10 transition-all">
                          <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 4px,
                              rgba(255, 149, 0, 0.3) 4px,
                              rgba(255, 149, 0, 0.3) 8px
                            )`
                          }} />
                          <Coffee className="h-3 w-3 text-orange-500/70" />
                        </div>
                      ) : hasAppointments ? (
                        // Appointment slot - simple card with gradient border
                        <div
                          className={`w-full h-full rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border-l-2 border-green-500/50 cursor-pointer hover:from-green-500/15 hover:to-green-600/10 transition-all relative overflow-hidden p-2 ${isLongPressing && longPressedId === dayAppointments[0].id ? 'animate-pulse' : ''}`}
                          onClick={() => {
                            setSelectedAppointment(dayAppointments[0]);
                            setShowAppointmentDetails(true);
                          }}
                        >
                          <div className="relative z-10 flex flex-col justify-center h-full">
                            <div className="text-[11px] font-medium text-gray-800 dark:text-gray-200 leading-tight mb-0.5 truncate">
                              {dayAppointments[0].service.name}
                            </div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                              {dayAppointments[0].customer.name}
                            </div>
                            <div className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">
                              {dayAppointments[0].appointment_time.slice(0, 5)}
                              {rowSpan > 1 && (() => {
                                const startTime = dayAppointments[0].appointment_time.slice(0, 5);
                                const [hours, minutes] = startTime.split(':').map(Number);
                                const startDate = new Date();
                                startDate.setHours(hours, minutes, 0, 0);
                                const endDate = addMinutes(startDate, dayAppointments[0].totalDurationMinutes || dayAppointments[0].service.duration);
                                return ` - ${format(endDate, 'HH:mm')}`;
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : isPastSlot ? (
                        // Past slot - disabled
                        <div className="w-full h-full rounded-lg bg-gray-500/5 border-l-2 border-gray-500/30 flex items-center justify-center opacity-50">
                          <Clock className="h-3 w-3 text-gray-500/50" />
                        </div>
                      ) : (
                        // Empty slot - visible + so quick-add is obvious
                        <button 
                          onClick={() => onDateTimeClick(format(day, 'yyyy-MM-dd'), time)} 
                          className="w-full h-full rounded-lg border border-dashed border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-blue-500 dark:hover:text-blue-400"
                          title={`Book at ${time}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Side Sheet */}
      <Sheet open={showAppointmentDetails} onOpenChange={(open) => {
        if (!open) {
          setShowAppointmentDetails(false);
          setSelectedAppointment(null);
        }
      }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Appointment Details</SheetTitle>
            <SheetDescription>
              View and manage appointment information
            </SheetDescription>
          </SheetHeader>
          {selectedAppointment && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-white/60 dark:bg-[#1C1C1E]/60 rounded-lg border border-gray-200 dark:border-[#2C2C2E] backdrop-blur-sm relative overflow-hidden">
                {/* Subtle colored background based on service */}
                <div className="absolute inset-0 opacity-10" style={{
                  background: getServiceGradient(selectedAppointment.service)
                }} />
                <h3 className="font-medium text-lg text-gray-800 dark:text-gray-200 relative z-10">{selectedAppointment.service.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 relative z-10">{selectedAppointment.customer.name}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{format(new Date(selectedAppointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{selectedAppointment.appointment_time}</span>
                </div>
                {selectedAppointment.price && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">${selectedAppointment.price}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-green-200 hover:bg-green-50 hover:border-green-300 text-green-700"
                  onClick={handleCompleteAppointment}
                  disabled={isCompleting || selectedAppointment.status === 'completed'}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {selectedAppointment.status === 'completed' ? 'Completed' : 'Complete'}
                </Button>
                <Button variant="outline" className="flex-1 border-gray-200 hover:bg-white/60 hover:border-gray-300 text-gray-700" onClick={handleReschedule}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
                <Button variant="destructive" className="flex-1 bg-red-500/90 hover:bg-red-500/80 border border-red-300" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-500" />
              Reschedule Appointment
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && <div className="space-y-4 py-4">
            <div className="p-3 bg-white/60 rounded-lg border border-gray-200 backdrop-blur-sm relative overflow-hidden">
              {/* Subtle colored background based on service */}
              <div className="absolute inset-0 opacity-10" style={{
                background: getServiceGradient(selectedAppointment.service)
              }} />
              <p className="font-medium text-sm text-gray-800 relative z-10">{selectedAppointment.service.name}</p>
              <p className="text-xs text-gray-500 relative z-10">{selectedAppointment.customer.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">New Date</label>
                <Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} className="h-10 border-gray-200 focus:border-gray-300 bg-white/60 backdrop-blur-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">New Time</label>
                <Input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} className="h-10 border-gray-200 focus:border-gray-300 bg-white/60 backdrop-blur-sm" />
              </div>
            </div>
          </div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)} className="border-gray-200 hover:bg-white/60 hover:border-gray-300 text-gray-700">
              Cancel
            </Button>
            <Button onClick={handleConfirmReschedule} disabled={!rescheduleDate || !rescheduleTime} className="bg-blue-500 hover:bg-blue-600 border border-blue-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Appointment
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>

            <div className="p-3 bg-white/60 rounded-lg border border-red-200 backdrop-blur-sm relative overflow-hidden">
              {/* Subtle colored background */}
              <div className="absolute inset-0 opacity-5 bg-red-500" />
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
              <p className="font-medium text-sm text-gray-800 relative z-10">{selectedAppointment.service.name}</p>
              <p className="text-xs text-gray-500 relative z-10">{selectedAppointment.customer.name}</p>
              <p className="text-xs text-gray-500 relative z-10">
                {format(new Date(selectedAppointment.appointment_date), 'MMM d, yyyy')} at {selectedAppointment.appointment_time.slice(0, 5)}
              </p>
            </div>
          </div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-gray-200 hover:bg-white/60 hover:border-gray-300 text-gray-700">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="bg-red-500/90 hover:bg-red-500/80 border border-red-300">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Booking Dialog */}
      <Dialog open={showQuickBooking} onOpenChange={setShowQuickBooking}>
        <DialogContent className="sm:max-w-md" aria-describedby="quick-booking-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Quick Booking
            </DialogTitle>
            <p id="quick-booking-description" className="text-sm text-gray-500">
              {quickBookingDate && quickBookingTime &&
                `${format(new Date(quickBookingDate), 'MMM d, yyyy')} at ${quickBookingTime}`
              }
            </p>
          </DialogHeader>

          <Form {...quickBookingForm}>
            <form onSubmit={quickBookingForm.handleSubmit(handleQuickBooking)} className="space-y-4">
              <FormField
                control={quickBookingForm.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} className="border-gray-200 focus:border-gray-300 bg-white/60 backdrop-blur-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={quickBookingForm.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Service</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="border-gray-200 focus:border-gray-300 bg-white/60 backdrop-blur-sm">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ background: getServiceGradient(service) }}
                                />
                                {service.name} ({service.duration}min)
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowQuickBooking(false)} className="border-gray-200 hover:bg-white/60 hover:border-gray-300 text-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600 border border-blue-300">
                  <Plus className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Right-Click Context Menu - Appointment Info */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="fixed z-[101] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 340),
              top: Math.min(contextMenu.y, window.innerHeight - 500),
            }}
          >
            {/* Header with service color */}
            <div className="relative p-4 pb-3" style={{ background: getServiceGradient(contextMenu.appointment.service) }}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-base">{contextMenu.appointment.customer.name}</h3>
                  <p className="text-white/80 text-xs mt-0.5">{contextMenu.appointment.service.name}</p>
                </div>
                <button onClick={() => setContextMenu(null)} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{contextMenu.appointment.status}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{contextMenu.appointment.totalDurationMinutes || contextMenu.appointment.service.duration}m</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Price</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">${contextMenu.appointment.price || 0}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{format(new Date(contextMenu.appointment.appointment_date), 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <span className="text-gray-700">
                    {contextMenu.appointment.appointment_time.slice(0, 5)}
                    {(() => {
                      const [h, m] = contextMenu.appointment.appointment_time.slice(0, 5).split(':').map(Number);
                      const s = new Date(); s.setHours(h, m, 0, 0);
                      const e = addMinutes(s, contextMenu.appointment.totalDurationMinutes || contextMenu.appointment.service.duration);
                      return ` - ${format(e, 'HH:mm')}`;
                    })()}
                  </span>
                </div>
                {contextMenu.appointment.customer.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Send className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <span className="text-gray-700">{contextMenu.appointment.customer.email}</span>
                  </div>
                )}
                {contextMenu.appointment.customer.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <span className="text-gray-700">{contextMenu.appointment.customer.phone}</span>
                  </div>
                )}
                {contextMenu.appointment.notes && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Edit className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span className="text-gray-600 text-xs leading-relaxed">{contextMenu.appointment.notes}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setContextMenu(null);
                    setSelectedAppointment(contextMenu.appointment);
                    handleCompleteAppointment();
                  }}
                  disabled={contextMenu.appointment.status === 'completed'}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  Complete
                </button>
                <button
                  onClick={() => {
                    const apt = contextMenu.appointment;
                    setContextMenu(null);
                    setSelectedAppointment(apt);
                    setRescheduleDate(apt.appointment_date);
                    setRescheduleTime(apt.appointment_time.slice(0, 5));
                    setShowRescheduleDialog(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Reschedule
                </button>
                <button
                  onClick={() => {
                    const apt = contextMenu.appointment;
                    setContextMenu(null);
                    setSelectedAppointment(apt);
                    setShowDeleteDialog(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Rate Your Stylist
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment?.stylist && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-white/60 rounded-lg border border-gray-200 backdrop-blur-sm">
                <p className="font-medium text-sm text-gray-800">{selectedAppointment.stylist.name}</p>
                <p className="text-xs text-gray-500">{selectedAppointment.service.name}</p>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStylistRating(star)}
                    className="p-1 transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= stylistRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Comment (optional)
                </label>
                <Input
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="How was your experience?"
                  className="h-10 border-gray-200 focus:border-gray-300 bg-white/60 backdrop-blur-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRatingDialog(false);
                setStylistRating(0);
                setRatingComment('');
                setSelectedAppointment(null);
                window.dispatchEvent(new Event('appointmentUpdated'));
              }}
              className="border-gray-200 hover:bg-white/60 hover:border-gray-300 text-gray-700"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={stylistRating === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-white border border-yellow-300"
            >
              <Star className="h-4 w-4 mr-2" />
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
