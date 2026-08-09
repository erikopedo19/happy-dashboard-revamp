import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay, addMinutes, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Zap, CheckCircle2, Clock, User, X, Calendar, Mail, Phone, FileText, Ban, Loader2, Palmtree, MoreHorizontal, Thermometer, Lock, Sunset } from "lucide-react";

// Maps a stored day-off reason to a small icon shown on the date chip
const reasonIcon = (reason: string) => {
  const r = (reason || "").toLowerCase();
  if (r.includes("sick")) return Thermometer;
  if (r.includes("closed")) return Lock;
  if (r.includes("personal")) return User;
  if (r.includes("rest of")) return Sunset;
  if (r.includes("vacation") || r.includes("day off") || !r) return Palmtree;
  return Ban;
};
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { TimeOffDrawer } from "@/components/TimeOffDrawer";
import { NotificationBell } from "@/components/NotificationBell";


interface Service {
  id: string;
  name: string;
  duration: number;
  color: string;
  text_color?: string;
  border_color?: string;
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

interface LiquidGlassAgendaProps {
  appointments: Appointment[];
  onDateTimeClick: (date: string, time: string) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  services?: Service[];
  currentWeek: Date;
  onWeekChange: (week: Date) => void;
  viewMode: 'week' | 'day';
  onViewModeChange: (mode: 'week' | 'day') => void;
  // When false, hides the "mini tabs" (Week/Day) at the top.
  showViewModeToggle?: boolean;
}

interface AgendaSettings {
  start_hour: string | null;
  end_hour: string | null;
  service_duration: number | null;
  working_days: number[] | null;
}

const slotListVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const slotItemVariants: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// Parse hex or named color to rgba with opacity
function colorToRgba(color: string, opacity: number): string {
  if (!color) return `rgba(100, 200, 150, ${opacity})`;
  const raw = color.trim().toLowerCase();
  if (raw.startsWith('#')) {
    const hex = raw.replace('#', '');
    let full = hex;
    if (hex.length === 3 || hex.length === 4) {
      // Expand shorthand: #abc -> #aabbcc
      full = hex.split('').map((c) => c + c).join('');
    }
    if (full.length >= 6) {
      const r = parseInt(full.substring(0, 2), 16);
      const g = parseInt(full.substring(2, 4), 16);
      const b = parseInt(full.substring(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }
  }
  // For tailwind bg classes and common names
  if (raw.includes('blue')) return `rgba(59, 130, 246, ${opacity})`;
  if (raw.includes('green')) return `rgba(34, 197, 94, ${opacity})`;
  if (raw.includes('red') || raw.includes('rose')) return `rgba(239, 68, 68, ${opacity})`;
  if (raw.includes('purple')) return `rgba(168, 85, 247, ${opacity})`;
  if (raw.includes('orange') || raw.includes('amber')) return `rgba(245, 158, 11, ${opacity})`;
  if (raw.includes('pink')) return `rgba(236, 72, 153, ${opacity})`;
  if (raw.includes('cyan') || raw.includes('teal')) return `rgba(20, 184, 166, ${opacity})`;
  if (raw.includes('yellow')) return `rgba(234, 179, 8, ${opacity})`;
  if (raw.includes('indigo')) return `rgba(99, 102, 241, ${opacity})`;
  if (raw.includes('black')) return `rgba(120, 120, 120, ${opacity})`;
  return `rgba(100, 200, 150, ${opacity})`;
}

function getGlassGradient(color: string, isDark: boolean): string {
  if (isDark) {
    return `linear-gradient(135deg, ${colorToRgba(color, 0.32)} 0%, ${colorToRgba(color, 0.14)} 100%)`;
  }
  return `linear-gradient(135deg, ${colorToRgba(color, 0.22)} 0%, ${colorToRgba(color, 0.10)} 100%)`;
}

export const LiquidGlassAgenda = ({
  appointments,
  onDateTimeClick,
  onAppointmentClick,
  services = [],
  currentWeek,
  onWeekChange,
  viewMode,
  onViewModeChange,
  showViewModeToggle = true,
}: LiquidGlassAgendaProps) => {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; appointment: Appointment } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pressingSlot, setPressingSlot] = useState<string | null>(null);
  const [pendingBlockSlot, setPendingBlockSlot] = useState<{ hour: string; start: Date; end: Date } | null>(null);
  const blockTimerRef = useRef<number | null>(null);
  const isLongPressBlock = useRef(false);
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [timeOffDate, setTimeOffDate] = useState<Date | undefined>(undefined);
  const dayLongPressTimer = useRef<number | null>(null);
  const dayLongPressFired = useRef(false);
  const [showDaysOffHint, setShowDaysOffHint] = useState(false);
  
  const isMobile = useIsMobile() ?? false;

  // Show the "hold a date" hint only once, the very first time the agenda opens
  useEffect(() => {
    try {
      const KEY = "agenda_daysoff_hint_seen";
      if (localStorage.getItem(KEY) !== "1") {
        localStorage.setItem(KEY, "1");
        setShowDaysOffHint(true);
        const t = window.setTimeout(() => setShowDaysOffHint(false), 4200);
        return () => window.clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);




  const { data: timeOffRows = [] } = useQuery<{ off_date: string; reason: string | null }[]>({
    queryKey: ["time_off", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("time_off")
        .select("off_date, reason")
        .eq("user_id", user.id)
        .order("off_date", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });
  const timeOffSet = useMemo(() => new Set(timeOffRows.map((r) => r.off_date)), [timeOffRows]);
  const timeOffReason = useMemo(() => new Map(timeOffRows.map((r) => [r.off_date, r.reason])), [timeOffRows]);
  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayIsOff = timeOffSet.has(selectedDayKey);
  const selectedDayOffReason = timeOffReason.get(selectedDayKey) || "Day off";


  const openTimeOff = (day: Date) => {
    haptic("heavy");
    setTimeOffDate(day);
    setTimeOffOpen(true);
  };

  const dayPressOrigin = useRef<{ x: number; y: number } | null>(null);

  const clearDayLongPress = () => {
    dayPressOrigin.current = null;
    if (dayLongPressTimer.current) {
      window.clearTimeout(dayLongPressTimer.current);
      dayLongPressTimer.current = null;
    }
  };

  // Cancel the hold if the finger moves (so horizontal scrolling still works)
  const clearDayLongPressOnMove = (e: React.PointerEvent) => {
    const origin = dayPressOrigin.current;
    if (!origin) return;
    if (Math.abs(e.clientX - origin.x) > 8 || Math.abs(e.clientY - origin.y) > 8) {
      clearDayLongPress();
    }
  };

  const startDayLongPress = (day: Date, e?: React.PointerEvent) => {
    clearDayLongPress();
    if (e) dayPressOrigin.current = { x: e.clientX, y: e.clientY };
    dayLongPressFired.current = false;
    dayLongPressTimer.current = window.setTimeout(() => {
      dayLongPressFired.current = true;
      haptic("medium");
      openTimeOff(day);
      dayLongPressTimer.current = null;
    }, 650);
  };



  const isAppointmentPast = (apt: Appointment) => {
    const [hh, mm] = (apt.appointment_time || "00:00").split(":").map(Number);
    const d = new Date(apt.appointment_date);
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d.getTime() < Date.now();
  };

  const cancelAppointment = async (id: string) => {
    const target = appointments.find((a) => a.id === id);
    if (target && isAppointmentPast(target)) {
      haptic("error");
      toast({
        title: "Can't cancel past appointments",
        description: "This booking has already passed.",
        variant: "destructive",
      });
      setContextMenu(null);
      return;
    }
    haptic("warning");
    setCancellingId(id);
    try {
      const { error } = await (supabase as any)
        .from("appointments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      haptic("success");
      toast({ title: "Appointment cancelled", description: "The booking was marked as cancelled." });
      setContextMenu(null);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      window.dispatchEvent(new Event("appointmentUpdated"));
    } catch (e: any) {
      haptic("error");
      toast({ title: "Couldn't cancel", description: e?.message || "Please try again.", variant: "destructive" });

    } finally {
      setCancellingId(null);
    }
  };

  const { data: agendaSettings } = useQuery<AgendaSettings | null>({
    queryKey: ["agenda_settings", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("agenda_settings")
        .select("start_hour, end_hour, service_duration, working_days")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data ?? null;
    },
    enabled: !!user,
  });

  const { data: blockedSlots } = useQuery<
    { id: string; start_time: string; end_time: string; reason: string | null }[]
  >({
    queryKey: ["agenda_blocked_slots", user?.id, format(selectedDay, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("agenda_blocked_slots")
        .select("id, start_time, end_time, reason")
        .eq("user_id", user.id)
        .eq("blocked_date", format(selectedDay, "yyyy-MM-dd"))
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Generate week days
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Scrollable day strip (3 weeks) so users can swipe to more dates
  const scrollDays = Array.from({ length: 56 }, (_, i) => addDays(weekStart, i - 14));

  // Get appointments for selected day, sorted by time
  const dayAppointments = useMemo(() => {
    return appointments
      .filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDay))
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }, [appointments, selectedDay]);

  // Calculate time range from saved settings first, then fall back to appointments
  const timeRange = useMemo(() => {
    const configuredStartHour = agendaSettings?.start_hour
      ? parseInt(agendaSettings.start_hour.split(":")[0], 10)
      : null;
    const configuredEndHour = agendaSettings?.end_hour
      ? parseInt(agendaSettings.end_hour.split(":")[0], 10)
      : null;

    if (
      configuredStartHour !== null &&
      !Number.isNaN(configuredStartHour) &&
      configuredEndHour !== null &&
      !Number.isNaN(configuredEndHour)
    ) {
      return {
        startHour: configuredStartHour,
        endHour: configuredEndHour,
      };
    }

    if (dayAppointments.length === 0) {
      return { startHour: 8, endHour: 18 };
    }

    const times = dayAppointments.map((apt) => {
      const [h] = apt.appointment_time.split(":").map(Number);
      return h;
    });

    return {
      startHour: Math.max(Math.min(...times) - 1, 0),
      endHour: Math.min(Math.max(...times) + 3, 23),
    };
  }, [agendaSettings, dayAppointments]);

  // Generate slot labels from saved interval
  const hours = useMemo(() => {
    const interval = agendaSettings?.service_duration || 60;
    const result: string[] = [];

    for (let hour = timeRange.startHour; hour < timeRange.endHour; hour++) {
      for (let minutes = 0; minutes < 60; minutes += interval) {
        if (hour === timeRange.endHour - 1 && minutes > 0 && hour * 60 + minutes >= timeRange.endHour * 60) break;
        result.push(
          `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
        );
      }
    }

    return result;
  }, [agendaSettings, timeRange]);

  // Auto-scroll to current hour when viewing today
  useEffect(() => {
    if (!isSameDay(selectedDay, new Date())) return;
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const minutesFromStart = (now.getHours() - timeRange.startHour) * 60 + now.getMinutes();
    if (minutesFromStart < 0) return;
    const pixelsPerMinute = 80 / 60;
    const target = Math.max(0, minutesFromStart * pixelsPerMinute - 80);
    // Defer until layout is painted
    const id = window.setTimeout(() => {
      el.scrollTo({ top: target, behavior: 'smooth' });
    }, 150);
    return () => window.clearTimeout(id);
  }, [selectedDay, timeRange.startHour, hours.length]);

  // Format time display (e.g., "3 PM")
  const formatTimeLabel = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
  };

  // Calculate end time
  const getEndTime = (startTime: string, durationMinutes: number) => {
    const [h, m] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = addMinutes(start, durationMinutes);
    return format(end, 'HH:mm');
  };

  const openAppointmentInfo = (appointment: Appointment, x: number, y: number) => {
    setContextMenu({ x, y, appointment });
  };

  const startBlockLongPress = (hour: string) => {
    isLongPressBlock.current = false;
    setPressingSlot(hour);
    const slot = new Date(selectedDay);
    const [h, m] = hour.split(":").map(Number);
    slot.setHours(h, m, 0, 0);
    const start = addMinutes(slot, -45);
    blockTimerRef.current = window.setTimeout(() => {
      isLongPressBlock.current = true;
      setPressingSlot(null);
      haptic("heavy");
      setPendingBlockSlot({ hour, start, end: slot });
      blockTimerRef.current = null;
    }, 1000);

  };

  const cancelBlockLongPress = () => {
    if (blockTimerRef.current) {
      window.clearTimeout(blockTimerRef.current);
      blockTimerRef.current = null;
    }
    setPressingSlot(null);
  };

  const confirmBlockSlot = async () => {
    if (!pendingBlockSlot || !user) return;
    const { hour, start } = pendingBlockSlot;
    const startStr = format(start, "HH:mm");
    try {
      const { error } = await (supabase as any).from("agenda_blocked_slots").insert({
        user_id: user.id,
        blocked_date: format(selectedDay, "yyyy-MM-dd"),
        start_time: `${startStr}:00`,
        end_time: `${hour}:00`,
        reason: "Buffer before slot",
      });
      if (error) throw error;
      toast({ title: "Slot blocked", description: `${startStr} – ${hour} is now blocked.` });
      await queryClient.invalidateQueries({ queryKey: ["agenda_blocked_slots"] });
      window.dispatchEvent(new Event("appointmentUpdated"));
    } catch (e: any) {
      toast({ title: "Couldn’t block slot", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setPendingBlockSlot(null);
      isLongPressBlock.current = false;
    }
  };

  const handleAppointmentContextMenu = (event: React.MouseEvent, appointment: Appointment) => {
    event.preventDefault();
    event.stopPropagation();
    openAppointmentInfo(appointment, event.clientX, event.clientY);
  };

  const handleAppointmentTouchStart = (event: React.TouchEvent, appointment: Appointment) => {
    const touch = event.touches[0];
    if (!touch) return;

    longPressTimerRef.current = window.setTimeout(() => {
      openAppointmentInfo(appointment, touch.clientX, touch.clientY);
      longPressTimerRef.current = null;
    }, 550);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Calculate position and height for appointment block
  const getAppointmentStyle = (apt: Appointment) => {
    const [h, m] = apt.appointment_time.split(":").map(Number);
    const configuredStartMinutes =
      timeRange.startHour * 60 +
      (agendaSettings?.start_hour ? parseInt(agendaSettings.start_hour.split(":")[1] || "0", 10) : 0);
    const startMinutes = h * 60 + m - configuredStartMinutes;
    const duration = apt.totalDurationMinutes || apt.service.duration || 30;
    const pixelsPerMinute = 80 / 60; // 80px per hour
    return {
      top: startMinutes * pixelsPerMinute,
      height: Math.max(duration * pixelsPerMinute, 48),
    };
  };

  // Completion percentage for the day
  const completedCount = dayAppointments.filter(a => a.status === 'completed').length;
  const totalCount = dayAppointments.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const shouldShowViewToggle = showViewModeToggle && appointments.length > 0;

  const weekSummary = useMemo(() => {
    return weekDays.map((day) => {
        const items = appointments
          .filter((apt) => isSameDay(parseISO(apt.appointment_date), day))
          .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

        return {
          day,
          appointments: items,
          revenue: items.reduce((sum, apt) => sum + (apt.price || 0), 0),
        };
      });
  }, [agendaSettings, appointments, weekDays]);

  return (
    <div className={cn(
      "flex flex-col h-full",
      isMobile ? "bg-[#F3F2F0] dark:bg-[#0B0B0C]" : "bg-white dark:bg-[#0a0a0a]",
      "transition-colors duration-300"
    )}>
      {/* Top Bar - Week Day Selector */}
      <div className={cn(
        "px-4 pt-2 pb-3",
        isMobile
          ? "bg-[#F3F2F0]/90 dark:bg-[#0B0B0C]/90 border-b border-black/[0.06] dark:border-white/[0.06]"
          : "bg-white/80 dark:bg-[#1a1a1a]/80 border-b border-gray-200/50 dark:border-white/5",
        "backdrop-blur-2xl",
        "sticky top-0 z-30"
      )}>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          {isMobile ? (
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
              {format(selectedDay, 'd MMM')}
            </span>
          ) : shouldShowViewToggle ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewModeChange('week')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                  viewMode === 'week'
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                Week
              </button>
              <button
                onClick={() => onViewModeChange('day')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                  viewMode === 'day'
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                Day
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-95"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  <span className="animate-gradient-x bg-[linear-gradient(90deg,#3B82F6,#F59E0B,#F43F5E,#EC4899,#3B82F6)] bg-[length:220%_100%] bg-clip-text text-transparent">
                    More
                  </span>
                </button>

              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-[#1C1C1E] dark:border-[#2C2C2E]">
                {isMobile && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('day')}
                      className={cn("cursor-pointer", viewMode === 'day' && "font-semibold")}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Day view
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onViewModeChange('week')}
                      className={cn("cursor-pointer", viewMode === 'week' && "font-semibold")}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Week view
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => { haptic("light"); openTimeOff(selectedDay); }}
                  className="text-rose-500 dark:text-rose-300 focus:bg-rose-500/10 cursor-pointer"
                >
                  <Palmtree className="w-4 h-4 mr-2" />
                  Days off
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!isMobile && (
              <button
                onClick={() => onWeekChange(addDays(currentWeek, 7))}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {isMobile && (
              <div className="scale-[0.8]">
                <NotificationBell />
              </div>
            )}
          </div>
        </div>

        {isMobile && (
          <div className="flex items-center gap-2 mb-2 -mt-0.5">
            <span className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-white leading-none">
              {format(selectedDay, 'MMMM yyyy')}
            </span>
            {selectedDayIsOff && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2 py-1 text-[11px] font-semibold text-rose-500 dark:text-rose-300 ring-1 ring-rose-500/25">
                {(() => { const Icon = reasonIcon(selectedDayOffReason); return <Icon className="w-3 h-3" />; })()}
                {selectedDayOffReason}
              </span>
            )}
          </div>
        )}




        {/* Day Selector Row */}
        <div className="flex items-center gap-0">
          {/* Scrollable day strip — swipe to move through dates */}
          <motion.div
            animate={showDaysOffHint ? { x: [0, -14, 6, -8, 0] } : { x: 0 }}
            transition={showDaysOffHint ? { duration: 1.6, repeat: 2, ease: "easeInOut" } : { duration: 0.2 }}
            className="flex-1 min-w-0 overflow-x-auto overflow-y-visible scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex items-center gap-2 px-0.5 py-1"
          >


            {scrollDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              const hasAppointments = appointments.some(apt => isSameDay(parseISO(apt.appointment_date), day));
              const dayKey = format(day, 'yyyy-MM-dd');
              const isOff = timeOffSet.has(dayKey);
              const offReason = timeOffReason.get(dayKey) || 'Day off';
              const OffIcon = reasonIcon(offReason);

              return (
                <button
                  key={day.toISOString()}
                  ref={(el) => {
                    if (el && isSelected) {
                      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }
                  }}
                  onClick={() => {
                    if (dayLongPressFired.current) { dayLongPressFired.current = false; return; }
                    haptic("selection");
                    setSelectedDay(day);
                  }}
                  onPointerDown={(e) => startDayLongPress(day, e)}
                  onPointerUp={clearDayLongPress}
                  onPointerLeave={clearDayLongPress}
                  onPointerMove={clearDayLongPressOnMove}
                  onPointerCancel={clearDayLongPress}
                  onContextMenu={(e) => { e.preventDefault(); openTimeOff(day); }}
                  className={cn(
                    "relative snap-start shrink-0 flex flex-col items-center select-none touch-manipulation active:scale-95 transition-transform duration-200",
                    isMobile
                      ? "w-[58px] py-2.5 rounded-[18px]"
                      : cn(
                          "py-1.5 px-2 rounded-xl transition-all",
                          isSelected ? "bg-gray-900 dark:bg-white" : "hover:bg-gray-100 dark:hover:bg-white/5"
                        ),
                    isOff && !isSelected && "bg-rose-500/10 ring-1 ring-rose-500/40",
                    isOff && isSelected && !isMobile && "!bg-rose-500"
                  )}
                >
                  {isMobile && isSelected && (
                    <motion.span
                      layoutId="agenda-day-pill"
                      transition={{ type: "spring", stiffness: 480, damping: 38, mass: 0.7 }}
                      className="absolute inset-0 rounded-[18px] border bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                    />
                  )}
                  {isMobile ? (
                    <>
                      <span className={cn(
                        "relative z-10 text-[12px] font-medium leading-none",
                        isOff
                          ? "text-rose-400/90"
                          : isToday
                            ? "text-blue-500/70 dark:text-blue-400/70"
                            : isSelected
                              ? "text-gray-500 dark:text-white/50"
                              : "text-gray-400 dark:text-gray-500"
                      )}>
                        {format(day, 'EEE')}
                      </span>
                      <span className={cn(
                        "relative z-10 mt-1.5 text-[18px] font-semibold leading-none transition-colors duration-200",
                        isOff
                          ? "text-rose-500 dark:text-rose-400"
                          : isToday
                            ? "text-blue-600 dark:text-blue-400"
                            : isSelected
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-400 dark:text-gray-500"
                      )}>
                        {format(day, 'd')}
                      </span>

                      {hasAppointments && !isOff && (
                        <div className={cn(
                          "relative z-10 mt-1 h-1 w-1 rounded-full",
                          isSelected ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-white/25"
                        )} />
                      )}

                    </>
                  ) : (
                    <>
                      <span className={cn(
                        "text-[10px] font-semibold uppercase",
                        isOff && !isSelected
                          ? "text-rose-400"
                          : isSelected
                            ? "text-white dark:text-black"
                            : "text-gray-400 dark:text-gray-500"
                      )}>
                        {format(day, 'EEEEE')}
                      </span>
                      <span className={cn(
                        "text-[15px] font-semibold mt-0.5",
                        isOff && !isSelected
                          ? "text-rose-500 dark:text-rose-400"
                          : isSelected
                            ? "text-white dark:text-black"
                            : isToday
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-800 dark:text-gray-200"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </>
                  )}
                  {isOff ? (
                    <span
                      title={offReason}
                      className={cn("mt-0.5", isSelected && !isMobile ? "text-white" : "text-rose-500 dark:text-rose-400")}
                    >
                      <OffIcon className="w-3.5 h-3.5" />
                    </span>
                  ) : hasAppointments && !isSelected && !isMobile ? (
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                  ) : null}
                </button>
              );
            })}

          </motion.div>



        </div>



        <AnimatePresence>
          {showDaysOffHint && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2 flex justify-center"
            >
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-500 dark:text-rose-300">
                Tip: hold a date to mark it as a day off 🏝️
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 pb-24">
        {viewMode === 'week' ? (
          <div className="space-y-3 pt-4">
            {weekSummary.map(({ day, appointments: items, revenue }) => (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDay(day);
                  onViewModeChange('day');
                }}
                className={cn(
                  "w-full text-left rounded-3xl p-4 border transition-all",
                  isDark ? "border-white/10 bg-white/5" : "border-gray-200/70 bg-white/80"
                )}
                style={{
                  backdropFilter: 'blur(28px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(160%)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                        {format(day, 'EEEE')}
                      </span>
                      <span className={cn("text-xs", isDark ? "text-white/40" : "text-gray-400")}>
                        {format(day, 'MMM d')}
                      </span>
                    </div>
                    <p className={cn("text-xs mt-1", isDark ? "text-white/50" : "text-gray-500")}>
                      {items.length} appointment{items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium", isDark ? "text-white/60" : "text-gray-600")}>
                    ${revenue}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.length > 0 ? items.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: apt.service.color || '#22c55e' }}
                      />
                      <span className={cn("text-xs truncate flex-1", isDark ? "text-white/80" : "text-gray-700")}>
                        {apt.service.name} · {apt.customer.name}
                      </span>
                      <span className={cn("text-[11px]", isDark ? "text-white/40" : "text-gray-400")}>
                        {apt.appointment_time.slice(0, 5)}
                      </span>
                    </div>
                  )) : (
                    <div className={cn("text-xs", isDark ? "text-white/35" : "text-gray-400")}>
                      No appointment set on agenda
                    </div>
                  )}
                  {items.length > 3 && (
                    <div className={cn("text-[11px]", isDark ? "text-white/40" : "text-gray-400")}>
                      +{items.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : dayAppointments.length === 0 ? (
          /* Animated iOS-style Empty State */
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay.toISOString()}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex flex-col items-center justify-center h-full py-24 text-center px-6"
            >
              {/* Floating Clock Icon */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={cn(
                  "w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6",
                  "bg-gradient-to-tr from-blue-500/10 to-indigo-500/5 dark:from-[#007AFF]/15 dark:to-[#5856D6]/5",
                  "border border-blue-500/10 dark:border-[#007AFF]/10 shadow-[0_12px_30px_rgba(0,122,255,0.08)]",
                  "backdrop-blur-xl"
                )}
              >
                <Clock className="w-10 h-10 text-[#007AFF] dark:text-[#0A84FF]" strokeWidth={2.2} />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn("text-base font-semibold leading-tight", isDark ? "text-white" : "text-gray-900")}
              >
                No bookings today
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 max-w-[220px] leading-relaxed"
              >
                {isSameDay(selectedDay, new Date()) ? (
                  "Your agenda is clear for today. Keep resting or add a slot."
                ) : (
                  format(selectedDay, 'EEEE, MMMM d')
                )}
              </motion.p>

              {/* Prevent booking on past days entirely */}
              {(() => {
                const now = new Date();
                const isPastDay = !isSameDay(selectedDay, now) && selectedDay.getTime() < now.getTime();
                
                if (isPastDay) {
                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 text-[11px] font-medium text-gray-400 dark:text-gray-600 bg-gray-100/50 dark:bg-white/5 px-3 py-1.5 rounded-full"
                    >
                      📅 Calendar day has passed
                    </motion.div>
                  );
                }

                return (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 400, damping: 20 }}
                    onClick={() => {
                      let time = '09:00';
                      if (isSameDay(selectedDay, now)) {
                        const nextHour = Math.min(now.getHours() + 1, 23);
                        time = `${nextHour.toString().padStart(2, '0')}:00`;
                      }
                      onDateTimeClick(format(selectedDay, 'yyyy-MM-dd'), time);
                    }}
                    className={cn(
                      "mt-7 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all",
                      "bg-[#007AFF] text-white hover:bg-[#0062CC]",
                      "shadow-[0_8px_24px_rgba(0,122,255,0.25)]"
                    )}
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    New appointment
                  </motion.button>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        ) : (
          /* Timeline with appointments */
          <motion.div
            key={selectedDay.toISOString()}
            className="relative pt-4"
            initial="hidden"
            animate="visible"
            variants={slotListVariants}
          >
            {/* Time markers and appointment cards */}
            {hours.map((hour) => {
              const [slotHour, slotMinute] = hour.split(':').map(Number);
              const slotStartMin = slotHour * 60 + slotMinute;
              const slotInterval = agendaSettings?.service_duration || 60;

              // Find appointments that START exactly in this slot
              const hourAppointments = dayAppointments.filter((apt) => {
                const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
                return aptHour === slotHour && aptMinute === slotMinute;
              });

              // Check if any previous appointment spans into this slot
              const isOccupied = dayAppointments.some((apt) => {
                const [ah, am] = apt.appointment_time.split(':').map(Number);
                const aptStartMin = ah * 60 + am;
                const aptEndMin =
                  aptStartMin + (apt.totalDurationMinutes || apt.service.duration || 30);
                return aptStartMin < slotStartMin && aptEndMin > slotStartMin;
              });

              // Past slot detection: past day, or today + slot start time already passed
              const now = new Date();
              const startOfToday = new Date(now);
              startOfToday.setHours(0, 0, 0, 0);
              const startOfSelected = new Date(selectedDay);
              startOfSelected.setHours(0, 0, 0, 0);
              const isPastDay = startOfSelected.getTime() < startOfToday.getTime();
              const slotDate = new Date(selectedDay);
              slotDate.setHours(slotHour, slotMinute, 0, 0);
              const isPastSlot = isPastDay || (isSameDay(selectedDay, now) && slotDate.getTime() < now.getTime());

              const isBlocked = selectedDayIsOff || (blockedSlots || []).some((b: any) => {
                const [sh, sm] = (b.start_time || "00:00").split(":").map(Number);
                const [eh, em] = (b.end_time || "00:00").split(":").map(Number);
                const startMin = sh * 60 + sm;
                const endMin = eh * 60 + em;
                return slotStartMin >= startMin && slotStartMin < endMin;
              });


              return (
                <div key={hour} className={cn("relative", (isPastSlot || isBlocked) && "opacity-50")}>
                  {/* Time label */}
                  <div className="flex items-start gap-3 mb-1">
                    <div className="w-12 flex-shrink-0 pt-0.5">
                      <span className={cn(
                        "text-[11px] font-medium",
                        isMobile && isSameDay(selectedDay, new Date()) && new Date().getHours() === parseInt(hour.slice(0, 2), 10)
                          ? "inline-flex items-center rounded-full bg-white px-2 py-0.5 text-gray-900 shadow-sm dark:bg-[#1C1C1E] dark:text-white"
                          : "text-gray-400 dark:text-gray-500"
                      )}>
                        {hour.endsWith(':00') ? formatTimeLabel(hour) : hour}
                      </span>
                    </div>

                    {/* Thin separator line */}
                    {!isMobile && <div className="flex-1 h-px bg-gray-100 dark:bg-white/5 mt-2" />}
                  </div>


                  {/* Appointments in this hour */}
                  {hourAppointments.map((apt) => {
                    const duration = apt.totalDurationMinutes || apt.service.duration || 30;
                    const endTime = getEndTime(apt.appointment_time, duration);
                    const slotsSpanned = Math.max(Math.ceil(duration / slotInterval), 1);
                    const minHeight = isMobile
                      ? Math.max(Math.round(duration * 1.15), 64)
                      : Math.max(slotsSpanned * 64, 56);
                    const isCompleted = apt.status === 'completed';
                    const isCancelled = apt.status === 'cancelled';
                    const serviceColor = isCancelled ? '#6b7280' : (apt.service.color || '#22c55e');

                    return (
                      <motion.div
                        variants={slotItemVariants}
                        key={apt.id}
                        className="pl-[60px] pr-0 mb-2"
                      >
                        {/* Liquid Glass Card */}
                        <button
                          onClick={() => onAppointmentClick?.(apt)}
                          onContextMenu={(event) => handleAppointmentContextMenu(event, apt)}
                          onTouchStart={(event) => handleAppointmentTouchStart(event, apt)}
                          onTouchEnd={clearLongPressTimer}
                          onTouchMove={clearLongPressTimer}
                          className={cn(
                            "w-full text-left rounded-2xl p-3.5 relative overflow-hidden transition-all active:scale-[0.98]",
                            "border",
                            isCancelled
                              ? (isDark
                                  ? "border-red-500/25 border-dashed opacity-60 shadow-none"
                                  : "border-red-300/60 border-dashed opacity-70 shadow-none")
                              : isMobile
                                ? (isDark
                                    ? "border-white/[0.07] shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
                                    : "border-black/[0.05] shadow-[0_4px_16px_rgba(0,0,0,0.06)]")
                                : (isDark
                                    ? "border-white/10 shadow-lg shadow-black/20"
                                    : "border-gray-200/60 shadow-sm")
                          )}
                          style={{
                            minHeight: `${minHeight}px`,
                            background: isCancelled
                              ? (isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)")
                              : isMobile
                                ? (isDark ? "#161618" : "#FFFFFF")
                                : getGlassGradient(serviceColor, isDark),
                            backdropFilter: isCancelled || isMobile ? "none" : "blur(40px) saturate(180%)",
                            WebkitBackdropFilter: isCancelled || isMobile ? "none" : "blur(40px) saturate(180%)",
                            borderLeft: isCancelled ? undefined : `4px solid ${colorToRgba(serviceColor, isMobile ? 1 : 0.9)}`,
                          }}
                        >
                          {!isMobile && (
                            <>
                              {/* Glass shine effect */}
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: isDark
                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)'
                                    : 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%, rgba(255,255,255,0.2) 100%)',
                                  borderRadius: 'inherit',
                                }}
                              />

                              {/* Inner glow ring */}
                              <div
                                className="absolute inset-0 rounded-2xl pointer-events-none"
                                style={{
                                  boxShadow: isDark
                                    ? `inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 -1px 0 0 rgba(0,0,0,0.2)`
                                    : `inset 0 1px 0 0 rgba(255,255,255,0.6), inset 0 -1px 0 0 rgba(0,0,0,0.04)`,
                                }}
                              />
                            </>
                          )}

                          {/* Content */}
                          <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className={cn(
                                  "text-[15px] font-semibold leading-tight truncate",
                                  isCancelled && "line-through",
                                  isDark ? "text-white" : "text-gray-900"
                                )}>
                                  {apt.service.name}
                                  {isCancelled && (
                                    <span className={cn(
                                      "ml-2 no-underline inline-block align-middle text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                                      isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-600"
                                    )}>Cancelled</span>
                                  )}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <User className={cn("w-3 h-3", isDark ? "text-white/50" : "text-gray-500")} />
                                  <span className={cn(
                                    "text-[12px] truncate",
                                    isDark ? "text-white/60" : "text-gray-600"
                                  )}>
                                    {apt.customer.name}
                                  </span>
                                </div>
                              </div>

                              {/* Status icon */}
                              <div className="ml-2 flex-shrink-0">
                                {isCompleted ? (
                                  <CheckCircle2 className={cn("w-5 h-5", isDark ? "text-green-400" : "text-green-600")} />
                                ) : (
                                  <Zap className={cn("w-4 h-4", isDark ? "text-white/40" : "text-gray-400")} />
                                )}
                              </div>
                            </div>

                            {/* Bottom: Time range */}
                            <div className="flex items-center justify-between mt-2">
                              <span className={cn(
                                "text-[11px] font-medium",
                                isDark ? "text-white/50" : "text-gray-500"
                              )}>
                                {apt.appointment_time.slice(0, 5)} → {endTime}
                              </span>
                              {apt.price && (
                                <span className={cn(
                                  "text-[11px] font-semibold",
                                  isDark ? "text-white/60" : "text-gray-600"
                                )}>
                                  ${apt.price}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}

                  {/* Empty slot - visible quick-add (disabled if past) */}
                  {hourAppointments.length === 0 && !isOccupied && !isBlocked && (
                    <div className="pl-[60px] mb-1">
                      <button
                        onClick={() => {
                          if (isLongPressBlock.current) {
                            isLongPressBlock.current = false;
                            return;
                          }
                          if (!isPastSlot) onDateTimeClick(format(selectedDay, 'yyyy-MM-dd'), hour);
                        }}
                        onPointerDown={() => { if (!isPastSlot) startBlockLongPress(hour); }}
                        onPointerUp={cancelBlockLongPress}
                        onPointerLeave={cancelBlockLongPress}
                        disabled={isPastSlot}
                        className={cn(
                          "relative w-full h-12 rounded-2xl border border-dashed flex items-center justify-center gap-2 transition-all select-none overflow-hidden",
                          isPastSlot
                            ? "border-gray-200 dark:border-white/5 bg-transparent text-gray-300 dark:text-white/20 cursor-not-allowed"
                            : pressingSlot === hour
                            ? "border-rose-500/60 bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/40"
                            : isDark
                            ? "border-white/15 bg-white/[0.03] hover:bg-white/[0.07] text-white/60 active:scale-[0.98]"
                            : "border-gray-300/70 bg-gray-50/60 hover:bg-blue-50 hover:border-blue-300 text-gray-500 active:scale-[0.98]"
                        )}
                      >
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: pressingSlot === hour ? 1 : 0 }}
                          transition={pressingSlot === hour ? { duration: 0.6, ease: "linear" } : { duration: 0 }}
                          style={{ originX: 0 }}
                          className="absolute inset-0 z-0 bg-rose-500/20"
                        />
                        <Plus className="w-3.5 h-3.5 relative z-10" />
                        <span className="relative z-10 text-[12px] font-medium">
                          {pressingSlot === hour ? "Hold to block…" : isPastSlot ? `Past — ${hour}` : `Tap to book at ${hour}`}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Blocked slot */}
                  {hourAppointments.length === 0 && !isOccupied && isBlocked && (
                    <div className="pl-[60px] mb-1">
                      <div
                        className={cn(
                          "w-full h-12 rounded-2xl border border-dashed flex items-center justify-center gap-2",
                          selectedDayIsOff
                            ? "border-rose-500/30 text-rose-500/80 dark:text-rose-300/80"
                            : isDark
                              ? "border-white/10 text-white/40"
                              : "border-gray-300/60 text-gray-500"
                        )}
                        style={{
                          backgroundImage: selectedDayIsOff
                            ? "repeating-linear-gradient(45deg, transparent, transparent 7px, rgba(244,63,94,0.10) 7px, rgba(244,63,94,0.10) 14px)"
                            : isDark
                              ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.04) 8px, rgba(255,255,255,0.04) 16px)"
                              : "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)",
                        }}
                      >
                        {selectedDayIsOff ? (
                          <>
                            {(() => { const Icon = reasonIcon(selectedDayOffReason); return <Icon className="w-3.5 h-3.5" />; })()}
                            <span className="text-[12px] font-medium">{selectedDayOffReason}</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span className="text-[12px] font-medium">Blocked</span>
                          </>
                        )}
                      </div>
                    </div>

                  )}

                  {/* Spacer between hours */}
                  <div className="h-3" />
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Floating Action Button - hidden on past days */}

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className={cn(
              "fixed z-[101] w-80 rounded-2xl overflow-hidden border shadow-2xl animate-in fade-in zoom-in-95 duration-150",
              isDark ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
            )}
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 340),
              top: Math.min(contextMenu.y, window.innerHeight - 500),
            }}
          >
            <div
              className="relative p-4 pb-3"
              style={{ background: getGlassGradient(contextMenu.appointment.service.color || '#22c55e', false) }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-white font-semibold text-base">{contextMenu.appointment.customer.name}</h3>
                  <p className="text-white/85 text-xs mt-0.5">{contextMenu.appointment.service.name}</p>
                </div>
                <button
                  onClick={() => setContextMenu(null)}
                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className={cn("rounded-xl p-2.5 text-center", isDark ? "bg-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</p>
                  <p className={cn("text-sm font-semibold mt-0.5 capitalize", isDark ? "text-white" : "text-gray-800")}>{contextMenu.appointment.status}</p>
                </div>
                <div className={cn("rounded-xl p-2.5 text-center", isDark ? "bg-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Duration</p>
                  <p className={cn("text-sm font-semibold mt-0.5", isDark ? "text-white" : "text-gray-800")}>
                    {contextMenu.appointment.totalDurationMinutes || contextMenu.appointment.service.duration}m
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5 text-center", isDark ? "bg-white/5" : "bg-gray-50")}>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Price</p>
                  <p className={cn("text-sm font-semibold mt-0.5", isDark ? "text-white" : "text-gray-800")}>
                    ${contextMenu.appointment.price || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isDark ? "bg-blue-500/20" : "bg-blue-50")}>
                    <Calendar className={cn("h-3.5 w-3.5", isDark ? "text-blue-300" : "text-blue-600")} />
                  </div>
                  <span className={cn(isDark ? "text-white/80" : "text-gray-700")}>
                    {format(new Date(contextMenu.appointment.appointment_date), 'EEEE, MMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isDark ? "bg-green-500/20" : "bg-green-50")}>
                    <Clock className={cn("h-3.5 w-3.5", isDark ? "text-green-300" : "text-green-600")} />
                  </div>
                  <span className={cn(isDark ? "text-white/80" : "text-gray-700")}>
                    {contextMenu.appointment.appointment_time.slice(0, 5)}
                  </span>
                </div>

                {contextMenu.appointment.customer.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isDark ? "bg-purple-500/20" : "bg-purple-50")}>
                      <Mail className={cn("h-3.5 w-3.5", isDark ? "text-purple-300" : "text-purple-600")} />
                    </div>
                    <span className={cn("truncate", isDark ? "text-white/80" : "text-gray-700")}>{contextMenu.appointment.customer.email}</span>
                  </div>
                )}

                {contextMenu.appointment.customer.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isDark ? "bg-orange-500/20" : "bg-orange-50")}>
                      <Phone className={cn("h-3.5 w-3.5", isDark ? "text-orange-300" : "text-orange-600")} />
                    </div>
                    <span className={cn(isDark ? "text-white/80" : "text-gray-700")}>{contextMenu.appointment.customer.phone}</span>
                  </div>
                )}

                {contextMenu.appointment.notes && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", isDark ? "bg-white/10" : "bg-gray-100")}>
                      <FileText className={cn("h-3.5 w-3.5", isDark ? "text-white/70" : "text-gray-600")} />
                    </div>
                    <span className={cn("text-xs leading-relaxed", isDark ? "text-white/70" : "text-gray-600")}>
                      {contextMenu.appointment.notes}
                    </span>
                  </div>
                )}
              </div>

              {contextMenu.appointment.status !== "cancelled" && !isAppointmentPast(contextMenu.appointment) && (
                <button
                  onClick={() => {
                    if (cancellingId) return;
                    if (window.confirm("Cancel this appointment? The client's slot will be freed up.")) {
                      cancelAppointment(contextMenu.appointment.id);
                    }
                  }}
                  disabled={cancellingId === contextMenu.appointment.id}
                  className={cn(
                    "mt-3 w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors disabled:opacity-60",
                    isDark
                      ? "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20"
                      : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-100"
                  )}
                >
                  {cancellingId === contextMenu.appointment.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling…</>
                  ) : (
                    <><Ban className="h-4 w-4" /> Cancel appointment</>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <TimeOffDrawer open={timeOffOpen} onOpenChange={setTimeOffOpen} initialDate={timeOffDate} />


      <Dialog open={!!pendingBlockSlot} onOpenChange={(open) => { if (!open) { setPendingBlockSlot(null); isLongPressBlock.current = false; } }}>
        <DialogContent className={cn("rounded-2xl", isDark ? "bg-[#111] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900")}>
          <DialogHeader>
            <DialogTitle>Block this 45 min buffer?</DialogTitle>
            <DialogDescription className={cn(isDark ? "text-white/60" : "text-gray-600")}>
              {pendingBlockSlot && `${format(pendingBlockSlot.start, "HH:mm")} – ${pendingBlockSlot.hour}`} will be marked as blocked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setPendingBlockSlot(null); isLongPressBlock.current = false; }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={confirmBlockSlot}
            >
              Block slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiquidGlassAgenda;
