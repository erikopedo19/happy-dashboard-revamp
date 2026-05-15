import { useState, useMemo, useRef, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, addMinutes, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Zap, CheckCircle2, Clock, User, X, Calendar, Mail, Phone, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// Parse hex or named color to rgba with opacity
function colorToRgba(color: string, opacity: number): string {
  if (!color) return `rgba(100, 200, 150, ${opacity})`;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // For tailwind bg classes, map to some colors
  if (color.includes('blue')) return `rgba(59, 130, 246, ${opacity})`;
  if (color.includes('green')) return `rgba(34, 197, 94, ${opacity})`;
  if (color.includes('red') || color.includes('rose')) return `rgba(239, 68, 68, ${opacity})`;
  if (color.includes('purple')) return `rgba(168, 85, 247, ${opacity})`;
  if (color.includes('orange') || color.includes('amber')) return `rgba(245, 158, 11, ${opacity})`;
  if (color.includes('pink')) return `rgba(236, 72, 153, ${opacity})`;
  if (color.includes('cyan') || color.includes('teal')) return `rgba(20, 184, 166, ${opacity})`;
  if (color.includes('yellow')) return `rgba(234, 179, 8, ${opacity})`;
  if (color.includes('indigo')) return `rgba(99, 102, 241, ${opacity})`;
  return `rgba(100, 200, 150, ${opacity})`;
}

function getGlassGradient(color: string, isDark: boolean): string {
  if (isDark) {
    return `linear-gradient(135deg, ${colorToRgba(color, 0.25)} 0%, ${colorToRgba(color, 0.12)} 100%)`;
  }
  return `linear-gradient(135deg, ${colorToRgba(color, 0.18)} 0%, ${colorToRgba(color, 0.08)} 100%)`;
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
    return weekDays
      .filter((day) => {
        const workingDays = agendaSettings?.working_days;
        if (!workingDays || workingDays.length === 0) return true;
        return workingDays.includes(day.getDay());
      })
      .map((day) => {
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
      "bg-white dark:bg-[#0a0a0a]",
      "transition-colors duration-300"
    )}>
      {/* Top Bar - Week Day Selector */}
      <div className={cn(
        "px-4 pt-2 pb-3",
        "bg-white/80 dark:bg-[#1a1a1a]/80",
        "backdrop-blur-2xl",
        "border-b border-gray-200/50 dark:border-white/5",
        "sticky top-0 z-30"
      )}>
        <div className="flex items-center justify-between gap-3 mb-3">
          {shouldShowViewToggle && (
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
          )}

          <button
            onClick={() => onWeekChange(addDays(currentWeek, 7))}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Selector Row */}
        <div className="flex items-center gap-1">
          {/* Menu / back button area */}
          <button
            onClick={() => onWeekChange(addDays(currentWeek, -7))}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Week days */}
          <div className="flex-1 flex justify-around">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              const hasAppointments = appointments.some(apt => isSameDay(parseISO(apt.appointment_date), day));

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex flex-col items-center py-1.5 px-2 rounded-xl transition-all",
                    isSelected
                      ? "bg-gray-900 dark:bg-white"
                      : "hover:bg-gray-100 dark:hover:bg-white/5"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-semibold uppercase",
                    isSelected
                      ? "text-white dark:text-black"
                      : "text-gray-400 dark:text-gray-500"
                  )}>
                    {format(day, 'EEEEE')}
                  </span>
                  <span className={cn(
                    "text-[15px] font-semibold mt-0.5",
                    isSelected
                      ? "text-white dark:text-black"
                      : isToday
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-800 dark:text-gray-200"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasAppointments && !isSelected && (
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Completion ring */}
          <div className="w-9 h-9 flex items-center justify-center relative">
            <svg viewBox="0 0 36 36" className="w-8 h-8">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-gray-200 dark:text-gray-700"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={`${completionPct}, 100`}
                strokeLinecap="round"
                className="text-green-500 dark:text-green-400"
              />
            </svg>
            <span className="absolute text-[8px] font-bold text-gray-700 dark:text-gray-200">
              {completionPct}
            </span>
          </div>
        </div>
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
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center mb-4",
              "bg-gray-100/80 dark:bg-white/5",
              "backdrop-blur-xl"
            )}>
              <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No appointment set on agenda</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
              {format(selectedDay, 'EEEE, MMMM d')}
            </p>
            <button
              onClick={() => onDateTimeClick(format(selectedDay, 'yyyy-MM-dd'), '09:00')}
              className={cn(
                "mt-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all",
                "bg-gray-900 dark:bg-white text-white dark:text-black",
                "active:scale-95"
              )}
            >
              <Plus className="w-4 h-4" />
              Book appointment
            </button>
          </div>
        ) : (
          /* Timeline with appointments */
          <div className="relative pt-4">
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

              // Past slot detection: same day + slot start time already passed
              const now = new Date();
              const slotDate = new Date(selectedDay);
              slotDate.setHours(slotHour, slotMinute, 0, 0);
              const isPastSlot = isSameDay(selectedDay, now) && slotDate.getTime() < now.getTime();

              return (
                <div key={hour} className={cn("relative", isPastSlot && "opacity-50")}>
                  {/* Time label */}
                  <div className="flex items-start gap-3 mb-1">
                    <div className="w-12 flex-shrink-0 pt-0.5">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        {hour.endsWith(':00') ? formatTimeLabel(hour) : hour}
                      </span>
                    </div>

                    {/* Thin separator line */}
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5 mt-2" />
                  </div>

                  {/* Appointments in this hour */}
                  {hourAppointments.map((apt) => {
                    const duration = apt.totalDurationMinutes || apt.service.duration || 30;
                    const endTime = getEndTime(apt.appointment_time, duration);
                    const slotsSpanned = Math.max(Math.ceil(duration / slotInterval), 1);
                    const minHeight = Math.max(slotsSpanned * 64, 56);
                    const isCompleted = apt.status === 'completed';
                    const serviceColor = apt.service.color || '#22c55e';

                    return (
                      <div key={apt.id} className="pl-[60px] pr-0 mb-2">
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
                            isDark
                              ? "border-white/10 shadow-lg shadow-black/20"
                              : "border-gray-200/60 shadow-sm"
                          )}
                          style={{
                            minHeight: `${minHeight}px`,
                            background: getGlassGradient(serviceColor, isDark),
                            backdropFilter: 'blur(40px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                          }}
                        >
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

                          {/* Content */}
                          <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className={cn(
                                  "text-[15px] font-semibold leading-tight truncate",
                                  isDark ? "text-white" : "text-gray-900"
                                )}>
                                  {apt.service.name}
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
                      </div>
                    );
                  })}

                  {/* Empty slot - visible quick-add */}
                  {hourAppointments.length === 0 && !isOccupied && (
                    <div className="pl-[60px] mb-1">
                      <button
                        onClick={() => onDateTimeClick(format(selectedDay, 'yyyy-MM-dd'), hour)}
                        className={cn(
                          "w-full h-12 rounded-2xl border border-dashed flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                          isDark
                            ? "border-white/15 bg-white/[0.03] hover:bg-white/[0.07] text-white/60"
                            : "border-gray-300/70 bg-gray-50/60 hover:bg-blue-50 hover:border-blue-300 text-gray-500"
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[12px] font-medium">
                          Tap to book at {hour}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Spacer between hours */}
                  <div className="h-3" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button - Liquid Glass */}
      <div className="absolute bottom-6 right-6 z-40">
        <button
          onClick={() => onDateTimeClick(format(selectedDay, 'yyyy-MM-dd'), '09:00')}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90",
            "shadow-lg",
            isDark
              ? "bg-white/15 border border-white/20 shadow-black/30"
              : "bg-gray-900/90 border border-gray-800 shadow-gray-900/20"
          )}
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <Plus className={cn("w-6 h-6", isDark ? "text-white" : "text-white")} />
        </button>
      </div>

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
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiquidGlassAgenda;
