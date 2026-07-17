import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { X, ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Check, ArrowRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from "date-fns";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatTzLabel } from "@/lib/tz";
import { motion, AnimatePresence } from "framer-motion";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
  color?: string;
  text_color?: string;
  border_color?: string;
}

interface AgendaBookingFormProps {
  form: UseFormReturn<any>;
  services: Service[];
  stylists?: { id: string; name: string; avatar_url?: string | null; title?: string | null }[];
  stylistServices?: { stylist_id: string; service_id: string }[];
  existingAppointments?: { id?: string; appointment_date?: string; appointment_time: string; service?: Service | null; service_duration?: number | null; stylist_id?: string | null }[];
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  timeSlots: string[];
  isTimeSlotAvailable: (time: string, serviceIds?: string[]) => boolean;
  getAvailableStylistsForTime?: (time: string) => any[];
  onSubmit: (values: any) => Promise<boolean | { success: boolean; error?: string } | void>;
  isLoading: boolean;
  businessProfile: {
    full_name: string;
    brand_color?: string;
    address?: string;
    phone?: string;
    avatar_url?: string;
    banner_url?: string;
    rating?: number | null;
    rating_count?: number | null;
    total_bookings?: number | null;
    services_count?: number | null;
    stylists_count?: number | null;
  } | null;
  workingDays?: number[];
  timezone?: string;
  rescheduleAppointment?: any;
}

const AgendaBookingForm = ({
  form,
  services,
  stylists = [],
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  timeSlots,
  isTimeSlotAvailable,
  getAvailableStylistsForTime,
  onSubmit,
  isLoading,
  businessProfile,
  workingDays = [0, 1, 2, 3, 4, 5, 6],
  timezone = "UTC",
  rescheduleAppointment,
}: AgendaBookingFormProps) => {
  const [step, setStep] = useState<"service" | "schedule" | "details" | "success">("service");
  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const accentColor = businessProfile?.brand_color || "#3B82F6";
  const displayName = businessProfile?.full_name || "Book an Appointment";
  const avatarUrl = businessProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

  // Drop deleted services and reset if none remain.
  useEffect(() => {
    if (services.length === 0) return;
    const validIds = selectedServiceIds.filter((id) => services.some((s) => s.id === id));
    if (validIds.length !== selectedServiceIds.length) {
      setSelectedServiceIds(validIds);
      if (validIds.length === 0) {
        setSelectedDate(undefined);
        setSelectedTime("");
        setSelectedStylistId("");
        setStep("service");
      }
    }
  }, [services]);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const selectedService = selectedServices[0];
  const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration, 0), [selectedServices]);
  const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);

  const availableTimeSlots = selectedDate ? timeSlots.filter((time) => isTimeSlotAvailable(time)) : [];

  const availableStylistsForTime = selectedTime && getAvailableStylistsForTime
    ? getAvailableStylistsForTime(selectedTime)
    : stylists;

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const formatTime = (time: string) => {
    if (timeFormat === "24h") return time;
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getEndTime = (startTime: string, durationMins: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMins;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(serviceId)) return prev.filter((id) => id !== serviceId);
      return [...prev, serviceId];
    });
  };

  const handleServiceContinue = () => {
    if (selectedServiceIds.length === 0) return;
    form.setValue("service_ids", selectedServiceIds, { shouldValidate: false });
    setStep("schedule");
  };

  const handleContinueToDetails = () => {
    if (!selectedDate || !selectedTime) return;
    if (stylists.length > 0 && !selectedStylistId) {
      // still allow — user chose no stylist
    }
    form.setValue("stylist_id", selectedStylistId || "");
    setStep("details");
  };

  const handleSubmit = async (values: any) => {
    setSubmitError(null);
    values.service_ids = selectedServiceIds;
    values.stylist_id = selectedStylistId || "";
    const result = await onSubmit(values);
    if (!result) return;
    if (typeof result === "object" && "success" in result) {
      if (result.success) setStep("success");
      else if (result.error) setSubmitError(result.error);
    } else {
      setStep("success");
    }
  };

  const closeAndReset = () => {
    setStep("service");
    setSelectedServiceIds([]);
    setSelectedDate(undefined);
    setSelectedTime("");
    setSelectedStylistId("");
  };

  // ============ Success view ============
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 md:p-8">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: accentColor }}>
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {rescheduleAppointment ? "Appointment updated" : "You're booked"}
          </h2>
          <p className="text-[#8E8E93] mb-6">
            {rescheduleAppointment ? "Your appointment has been rescheduled successfully." : "Confirmation just landed in your inbox."}
          </p>
          <div className="rounded-3xl bg-[#1C1C1E] border border-white/[0.08] p-6 text-left mb-6">
            {selectedServices.map((service, index) => (
              <div key={service.id} className={cn("flex items-center gap-4", index > 0 && "pt-4 border-t border-white/10 mt-4")}>
                <img src={avatarUrl} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{service.name}</p>
                  <p className="text-[#8E8E93] text-sm">{service.duration} mins · €{service.price}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-white/10 pt-4 mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <CalendarIcon className="w-4 h-4" />
                <span>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <Clock className="w-4 h-4" />
                <span>{selectedTime}</span>
              </div>
            </div>
          </div>
          <Button onClick={() => window.location.reload()} className="h-12 px-8 rounded-[14px] font-semibold text-white" style={{ backgroundColor: accentColor }}>
            Book another
          </Button>
        </motion.div>
      </div>
    );
  }

  // ============ Service selection (initial screen) ============
  if (step === "service") {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="rounded-3xl bg-[#15151A] border border-white/[0.08] p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
              <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold">Booking with</p>
                <h1 className="text-lg font-semibold text-white truncate">{displayName}</h1>
              </div>
            </div>

            <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-3">Select a service</p>
            <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {services.map((service) => {
                const active = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceToggle(service.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left transition-all bg-[#1C1C1E]",
                      active ? "border-transparent" : "border-white/[0.06] hover:border-white/[0.12]"
                    )}
                    style={active ? { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}12` } : {}}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-base">{service.name}</p>
                        {service.description && <p className="text-sm text-[#8E8E93] mt-1 line-clamp-2">{service.description}</p>}
                        <div className="flex items-center gap-2 text-[#8E8E93] text-sm mt-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{service.duration} mins</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {active && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <p className="text-lg font-bold text-white">€{service.price}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedServiceIds.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-[#8E8E93]">Total</p>
                    <p className="text-xl font-bold text-white">€{totalPrice} · {totalDuration} mins</p>
                  </div>
                </div>
                <Button
                  onClick={handleServiceContinue}
                  className="w-full h-12 rounded-[14px] font-semibold text-white border-0"
                  style={{ backgroundColor: accentColor }}
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ Schedule (3-column: service | calendar+stylist | times) ============
  if (step === "schedule") {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white p-3 md:p-6 lg:p-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-6xl grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-[300px_1fr_320px]"
        >
          {/* LEFT — service card */}
          <div className="rounded-3xl bg-[#15151A] border border-white/[0.08] p-6 relative flex flex-col">
            <button
              onClick={closeAndReset}
              aria-label="Close"
              className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mt-8 flex flex-col items-center text-center">
              <img src={avatarUrl} alt={displayName} className="w-16 h-16 rounded-full object-cover mb-2" />
              <p className="text-sm text-white font-medium truncate max-w-full">{displayName}</p>
            </div>
            <div className="mt-6 flex-1">
              <h2 className="text-lg font-semibold text-white leading-tight">
                {selectedServices.length > 1 ? `${selectedServices.length} services` : `[${selectedService?.duration}-min] ${selectedService?.name}`}
              </h2>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#8E8E93]">
                <Clock className="w-4 h-4" />
                <span>{totalDuration} min</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.08]">
              <p className="text-2xl font-bold text-white">€{totalPrice}</p>
            </div>
          </div>

          {/* CENTER — stylist + calendar */}
          <div className="rounded-3xl bg-[#15151A] border border-white/[0.08] p-6 lg:p-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white transition"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white transition"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {stylists.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-[#8E8E93] mb-3">Select Stylist <span className="text-[#8E8E93]/70">(optional)</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {stylists.map((stylist) => {
                    const active = selectedStylistId === stylist.id;
                    return (
                      <button
                        key={stylist.id}
                        onClick={() => setSelectedStylistId(active ? "" : stylist.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all bg-[#1C1C1E]",
                          active ? "border-transparent" : "border-white/[0.06] hover:border-white/[0.12]"
                        )}
                        style={active ? { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}12` } : {}}
                      >
                        <div className="h-9 w-9 rounded-full bg-[#2C2C2E] overflow-hidden flex items-center justify-center text-sm font-semibold text-white shrink-0">
                          {stylist.avatar_url ? (
                            <img src={stylist.avatar_url} alt={stylist.name} className="h-full w-full object-cover" />
                          ) : (
                            stylist.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{stylist.name}</p>
                          <p className="text-xs text-[#8E8E93] truncate">{stylist.title || "Stylist"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSelectedStylistId("")}
                  className={cn(
                    "mt-2 w-full text-xs font-medium py-2 rounded-xl transition",
                    selectedStylistId === ""
                      ? "bg-white/[0.08] text-white"
                      : "text-[#8E8E93] hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  Any available stylist
                </button>
              </div>
            )}

            {/* Calendar */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-[10px] font-semibold tracking-wider text-[#8E8E93] py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const isDisabled = day < new Date(new Date().setHours(0, 0, 0, 0)) || !workingDays.includes(getDay(day));
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      if (isDisabled) return;
                      setSelectedDate(day);
                      setSelectedTime("");
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center text-sm font-medium rounded-xl transition-all",
                      isSelected
                        ? "text-white bg-white"
                        : isDisabled
                        ? "text-[#3a3a3d] cursor-not-allowed"
                        : !isCurrentMonth
                        ? "text-[#3a3a3d]"
                        : "text-white hover:bg-white/[0.06]"
                    )}
                    style={isSelected ? { color: "#000" } : {}}
                  >
                    <span>{format(day, "d")}</span>
                    {!isDisabled && isCurrentMonth && !isSelected && (
                      <span className="mt-0.5 w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — time slots */}
          <div className="rounded-3xl bg-[#15151A] border border-white/[0.08] p-5 flex flex-col relative">
            <button
              onClick={closeAndReset}
              aria-label="Close"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 lg:flex hidden"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">
                {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select a date"}
              </h4>
              <div className="flex gap-1 bg-[#1C1C1E] rounded-full p-0.5 border border-white/[0.06]">
                <button
                  onClick={() => setTimeFormat("12h")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    timeFormat === "12h" ? "bg-white text-black" : "text-[#8E8E93] hover:text-white"
                  )}
                >
                  12h
                </button>
                <button
                  onClick={() => setTimeFormat("24h")}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    timeFormat === "24h" ? "bg-white text-black" : "text-[#8E8E93] hover:text-white"
                  )}
                >
                  24h
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#8E8E93] mb-3">Times in {formatTzLabel(timezone)}</p>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
              {selectedDate ? (
                availableTimeSlots.length > 0 ? (
                  availableTimeSlots.map((time) => {
                    const active = selectedTime === time;
                    const stylistOkForTime =
                      !selectedStylistId ||
                      availableStylistsForTime.some((s) => s.id === selectedStylistId);
                    const disabled = !stylistOkForTime;
                    return (
                      <button
                        key={time}
                        onClick={() => !disabled && setSelectedTime(time)}
                        disabled={disabled}
                        className={cn(
                          "w-full rounded-2xl font-semibold text-center py-3 px-4 transition-all",
                          active
                            ? "text-white shadow-lg"
                            : disabled
                            ? "bg-[#1C1C1E] text-[#3a3a3d] cursor-not-allowed"
                            : "bg-[#1C1C1E] text-white hover:bg-[#242429] border border-white/[0.04]"
                        )}
                        style={active ? { backgroundColor: accentColor } : {}}
                      >
                        {formatTime(time)}
                        {totalDuration > 30 && (
                          <span className="text-xs ml-1 opacity-70">→ {formatTime(getEndTime(time, totalDuration))}</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center text-[#8E8E93] py-8 text-sm">No available times</div>
                )
              ) : (
                <div className="text-center text-[#8E8E93] py-8 text-sm">Select a date to see times</div>
              )}
            </div>

            <Button
              onClick={handleContinueToDetails}
              disabled={!selectedDate || !selectedTime}
              className="w-full h-12 mt-4 rounded-2xl font-semibold text-white border-0 disabled:opacity-40"
              style={selectedDate && selectedTime ? { backgroundColor: accentColor } : {}}
            >
              Continue
            </Button>

            {stylists.length > 0 && !selectedStylistId && selectedTime && (
              <p className="mt-2 text-[11px] text-center text-[#8E8E93]">
                Continuing without a specific stylist — we'll assign anyone available.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ Details ============
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key="details"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl bg-[#15151A] border border-white/[0.08] p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">Final step</p>
                <h2 className="text-2xl font-semibold text-white">Your details</h2>
              </div>
              <button
                onClick={() => setStep("schedule")}
                className="text-sm text-[#8E8E93] hover:text-white transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-[#1C1C1E] border border-white/[0.06] p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white">
                <CalendarIcon className="w-4 h-4 text-[#8E8E93]" />
                <span>{selectedDate && format(selectedDate, "EEE, MMM d")} · {selectedTime && formatTime(selectedTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <Clock className="w-4 h-4" />
                <span>{totalDuration} mins · €{totalPrice}</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {submitError && (
                  <div className="rounded-xl bg-[#FF375F]/10 border border-[#FF375F]/20 p-3 text-sm text-[#FF375F]">
                    {submitError}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#8E8E93] text-sm">Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                          <Input
                            {...field}
                            className="w-full pl-10 pr-3 h-12 bg-[#1C1C1E] border-white/[0.08] rounded-xl text-white placeholder:text-[#636366] focus:border-white/20 focus:ring-0"
                            placeholder="Your name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#8E8E93] text-sm">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full px-3 h-12 bg-[#1C1C1E] border-white/[0.08] rounded-xl text-white placeholder:text-[#636366] focus:border-white/20 focus:ring-0"
                          placeholder="email@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#8E8E93] text-sm">Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full px-3 h-12 bg-[#1C1C1E] border-white/[0.08] rounded-xl text-white placeholder:text-[#636366] focus:border-white/20 focus:ring-0"
                          placeholder="+1 555 123 4567"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl font-semibold text-white border-0 flex items-center justify-center gap-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>{rescheduleAppointment ? "Confirm Change" : "Book Appointment"}</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AgendaBookingForm;
