import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Check, Star, MapPin, Phone, Globe, ArrowRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
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
  locale?: "en" | "el" | "pl";
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
  locale = "en",
}: AgendaBookingFormProps) => {
  const [step, setStep] = useState<"service" | "datetime" | "stylist" | "details" | "success">("service");
  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const accentColor = businessProfile?.brand_color || "#e11d48";
  const displayName = businessProfile?.full_name || "Book an Appointment";
  const avatarUrl = businessProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
  const bannerUrl = businessProfile?.banner_url;
  const copy = locale === "el"
    ? {
        service: "Επιλέξτε υπηρεσία",
        dateTime: "Επιλέξτε ημερομηνία και ώρα",
        details: "Τα στοιχεία σας",
        continue: "Συνέχεια",
        back: "Πίσω",
        selectedService: "Επιλεγμένη υπηρεσία",
        selectedServices: "Επιλεγμένες υπηρεσίες",
        total: "Σύνολο",
        bookAnother: "Νέα κράτηση",
        booked: "Η κράτησή σας ολοκληρώθηκε",
        confirmation: "Η επιβεβαίωση στάλθηκε στο email σας.",
      }
    : locale === "pl"
    ? {
        service: "Wybierz usługę",
        dateTime: "Wybierz datę i godzinę",
        details: "Twoje dane",
        continue: "Kontynuuj",
        back: "Wstecz",
        selectedService: "Wybrana usługa",
        selectedServices: "Wybrane usługi",
        total: "Razem",
        bookAnother: "Nowa rezerwacja",
        booked: "Rezerwacja potwierdzona",
        confirmation: "Potwierdzenie zostało wysłane na Twój email.",
      }
    : {
        service: "Select a service",
        dateTime: "Choose date and time",
        details: "Your details",
        continue: "Continue",
        back: "Back",
        selectedService: "Selected service",
        selectedServices: "Selected services",
        total: "Total",
        bookAnother: "Book another",
        booked: "You’re booked",
        confirmation: "Confirmation just landed in your inbox.",
      };

  // Drop selected services that have been deleted and reset the flow if none remain.
  useEffect(() => {
    if (services.length === 0) return;
    const validIds = selectedServiceIds.filter(id => services.some(s => s.id === id));
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

  const selectedServices = useMemo(() =>
    services.filter(s => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const selectedService = selectedServices[0];
  const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + s.duration, 0), [selectedServices]);
  const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + s.price, 0), [selectedServices]);

  const availableTimeSlots = selectedDate
    ? timeSlots.filter(time => isTimeSlotAvailable(time))
    : [];

  const availableStylistsForTime = selectedTime && getAvailableStylistsForTime
    ? getAvailableStylistsForTime(selectedTime)
    : stylists;

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const formatTime = (time: string) => {
    if (timeFormat === "24h") return time;
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getEndTime = (startTime: string, durationMins: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMins;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) return prev.filter(id => id !== serviceId);
      return [...prev, serviceId];
    });
  };

  const handleServiceContinue = () => {
    if (selectedServiceIds.length === 0) return;
    form.setValue("service_ids", selectedServiceIds, { shouldValidate: false });
    setStep("datetime");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime("");
    setSelectedStylistId("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setSelectedStylistId("");
  };

  const handleStylistSelect = (stylistId: string) => {
    setSelectedStylistId(stylistId);
    form.setValue("stylist_id", stylistId);
    setStep("details");
  };

  const handleContinue = () => {
    if (!selectedTime) return;
    if (stylists.length > 0) {
      setStep("stylist");
    } else {
      setStep("details");
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    if (step === "details") setStep(stylists.length > 0 ? "stylist" : "datetime");
    else if (step === "stylist") setStep("datetime");
    else if (step === "datetime") {
      setSelectedDate(undefined);
      setSelectedTime("");
      setSelectedStylistId("");
      setStep("service");
    }
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (values: any) => {
    setSubmitError(null);
    values.service_ids = selectedServiceIds;
    if (selectedStylistId) values.stylist_id = selectedStylistId;
    const result = await onSubmit(values);
    if (!result) return;
    if (typeof result === 'object' && 'success' in result) {
      if (result.success) {
        setStep("success");
      } else if (result.error) {
        setSubmitError(result.error);
      }
    } else {
      setStep("success");
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {rescheduleAppointment ? (locale === "el" ? "Η κράτηση ενημερώθηκε" : locale === "pl" ? "Rezerwacja zaktualizowana" : "Appointment updated") : copy.booked}
          </h2>
          <p className="text-[#8E8E93] mb-6">
            {rescheduleAppointment
              ? (locale === "el" ? "Η κράτησή σας προγραμματίστηκε ξανά." : locale === "pl" ? "Twoja rezerwacja została zmieniona." : "Your appointment has been rescheduled successfully.")
              : copy.confirmation}
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
                <span>{selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <Clock className="w-4 h-4" />
                <span>{selectedTime}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="h-12 px-8 rounded-full font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {copy.bookAnother}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] p-3 md:p-8 lg:p-12 flex items-center justify-center">
      <div className="w-full max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-10 items-start"
          >
            {/* Left panel — brand + booking info */}
            <div className="lg:sticky lg:top-8 space-y-4">
              <div className="bg-white border border-[#D1D1D6] overflow-hidden">
                <div className="h-44 w-full relative">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: `linear-gradient(135deg, ${accentColor}40 0%, #E5E5EA 100%)` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                </div>
                <div className="px-5 pb-5 -mt-10 relative">
                  <div className="flex items-end gap-4 mb-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white bg-[#E5E5EA]">
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    </div>
                    <div className="pb-1">
                      {businessProfile?.rating != null && (
                        <div className="flex items-center gap-1 text-sm text-[#FFCC00]">
                          <Star className="w-3.5 h-3.5 fill-[#FFCC00]" />
                          <span className="font-medium text-[#1C1C1E]">{Number(businessProfile.rating).toFixed(1)}</span>
                          <span className="text-[#8E8E93]">({businessProfile.rating_count ?? 0})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-[#1C1C1E] mb-1">{displayName}</h1>

                  {selectedService ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">
                          {selectedServices.length > 1 ? copy.selectedServices : copy.selectedService}
                        </p>
                        <h2 className="text-lg font-semibold text-[#1C1C1E]">
                          {selectedServices.length > 1 ? `${selectedServices.length} services` : selectedService.name}
                        </h2>
                        {selectedService.description && selectedServices.length === 1 && (
                          <p className="text-sm text-[#8E8E93] mt-1 line-clamp-3">{selectedService.description}</p>
                        )}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-[#8E8E93]">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>{totalDuration} mins</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#8E8E93]">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{businessProfile?.address || "In-person"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#8E8E93]">
                          <Globe className="w-4 h-4 shrink-0" />
                          <span>{formatTzLabel(timezone)}</span>
                        </div>
                        {businessProfile?.phone && (
                          <div className="flex items-center gap-3 text-[#8E8E93]">
                            <Phone className="w-4 h-4 shrink-0" />
                            <span>{businessProfile.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#D1D1D6]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#8E8E93]">{copy.total}</span>
                          <span className="text-xl font-bold text-[#1C1C1E]">€{totalPrice}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#8E8E93] text-sm mt-3">{locale === "el" ? "Επιλέξτε μια υπηρεσία δεξιά για να ξεκινήσετε." : "Select a service on the right to get started."}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel — booking flow */}
            <div className="bg-white border border-[#D1D1D6] p-4 md:p-8 min-h-[520px]">
              {step === "service" && (
                <div className="h-full flex flex-col">
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">{locale === "el" ? "Βήμα 1 από 3" : "Step 1 of 3"}</p>
                    <h2 className="text-2xl font-semibold text-[#1C1C1E]">{copy.service}</h2>
                  </div>
                  <div className="grid gap-3">
                    {services.map((service) => {
                      const active = selectedServiceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => handleServiceToggle(service.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl border text-left transition-all bg-[#1C1C1E]",
                            active
                              ? "border-transparent"
                              : "border-white/[0.06] hover:border-white/[0.12]"
                          )}
                          style={active ? { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}12` } : {}}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-base">{service.name}</p>
                              {service.description && (
                                <p className="text-sm text-[#8E8E93] mt-1 line-clamp-2">{service.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-[#8E8E93] text-sm mt-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{service.duration} mins</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {active && (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                                  style={{ backgroundColor: accentColor }}
                                >
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
                      <Button
                        onClick={handleServiceContinue}
                        className="w-full h-12 rounded-full font-semibold text-white border-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {step === "datetime" && selectedService && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">Step 2 of 3</p>
                      <h2 className="text-2xl font-semibold text-white">Select date & time</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#8E8E93] hover:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8">
                    {/* Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                          {format(currentMonth, 'MMMM')} <span className="text-[#8E8E93]">{format(currentMonth, 'yyyy')}</span>
                        </h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2 mb-3">
                        {weekDays.map(day => (
                          <div key={day} className="text-center text-xs font-medium text-[#8E8E93] py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day) => {
                          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isToday = isSameDay(day, new Date());
                          const isDisabled = day < new Date(new Date().setHours(0, 0, 0, 0)) || !workingDays.includes(getDay(day));
                          return (
                            <button
                              key={day.toISOString()}
                              onClick={() => !isDisabled && handleDateSelect(day)}
                              disabled={isDisabled}
                              className={cn(
                                "aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all min-h-[44px]",
                                isSelected
                                  ? "text-white"
                                  : isDisabled
                                  ? "text-[#636366] cursor-not-allowed"
                                  : !isCurrentMonth
                                  ? "text-[#636366]"
                                  : isToday
                                  ? "text-white border border-white/[0.12]"
                                  : "text-white hover:bg-[#2C2C2E] bg-[#1C1C1E]"
                              )}
                              style={isSelected ? { backgroundColor: accentColor } : {}}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>
                      {selectedDate && (
                        <p className="text-sm text-[#8E8E93] mt-4">
                          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Time slots */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white">
                          {selectedDate ? format(selectedDate, 'EEE dd') : 'Select a date'}
                        </h4>
                        <div className="flex gap-1 bg-[#1C1C1E] rounded-lg p-1">
                          <button
                            onClick={() => setTimeFormat("12h")}
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium transition-colors",
                              timeFormat === "12h" ? "bg-[#2C2C2E] text-white" : "text-[#8E8E93] hover:text-white"
                            )}
                          >
                            12h
                          </button>
                          <button
                            onClick={() => setTimeFormat("24h")}
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium transition-colors",
                              timeFormat === "24h" ? "bg-[#2C2C2E] text-white" : "text-[#8E8E93] hover:text-white"
                            )}
                          >
                            24h
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-[#8E8E93]">
                        <Globe className="w-3 h-3" />
                        <span>Times in {formatTzLabel(timezone)}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1">
                        {selectedDate ? (
                          availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map((time) => {
                              const active = selectedTime === time;
                              const showRange = totalDuration > 30;
                              return (
                                <button
                                  key={time}
                                  onClick={() => handleTimeSelect(time)}
                                  className={cn(
                                    "w-full rounded-xl border font-medium text-center py-3 px-4 transition-all",
                                    active
                                      ? "border-transparent text-white"
                                      : "border-white/[0.06] bg-[#1C1C1E] text-white hover:border-white/[0.12]"
                                  )}
                                  style={active ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                                >
                                  <span>{formatTime(time)}</span>
                                  {showRange && (
                                    <span className="text-xs ml-1 opacity-80">
                                      → {formatTime(getEndTime(time, totalDuration))}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-center text-[#8E8E93] py-8 text-sm">
                              No available times
                            </div>
                          )
                        ) : (
                          <div className="text-center text-[#8E8E93] py-8 text-sm">
                            Select a date to see times
                          </div>
                        )}
                      </div>
                      {selectedDate && availableTimeSlots.length > 0 && (
                        <Button
                          onClick={handleContinue}
                          disabled={!selectedTime}
                          className="w-full h-12 mt-4 rounded-full font-semibold text-white border-0 disabled:opacity-40"
                          style={selectedTime ? { backgroundColor: accentColor } : {}}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === "stylist" && selectedService && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">Step 2 of 3</p>
                      <h2 className="text-2xl font-semibold text-white">Select stylist</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#8E8E93] hover:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {availableStylistsForTime.length > 0 ? (
                      availableStylistsForTime.map((stylist) => {
                        const active = selectedStylistId === stylist.id;
                        return (
                          <button
                            key={stylist.id}
                            onClick={() => handleStylistSelect(stylist.id)}
                            className={cn(
                              "w-full p-4 rounded-2xl border text-left transition-all bg-[#1C1C1E] flex items-center gap-4",
                              active ? "border-transparent" : "border-white/[0.06] hover:border-white/[0.12]"
                            )}
                            style={active ? { borderColor: `${accentColor}60`, backgroundColor: `${accentColor}12` } : {}}
                          >
                            <div className="h-12 w-12 rounded-full bg-[#2C2C2E] overflow-hidden flex items-center justify-center text-lg font-semibold text-white shrink-0">
                              {stylist.avatar_url ? (
                                <img src={stylist.avatar_url} alt={stylist.name} className="h-full w-full object-cover" />
                              ) : (
                                stylist.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold truncate">{stylist.name}</p>
                              <p className="text-[#8E8E93] text-sm truncate">{stylist.title || "Stylist"}</p>
                            </div>
                            {active && (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: accentColor }}
                              >
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-[#8E8E93] mb-4">No stylists available for this time</p>
                        <Button
                          onClick={handleBack}
                          variant="outline"
                          className="rounded-full border-[#D1D1D6] text-[#1C1C1E] hover:bg-[#F2F2F7]"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1.5" />
                          Pick another time
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "details" && selectedService && (
                <div className="h-full flex flex-col max-w-md mx-auto lg:max-w-none">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">Step 3 of 3</p>
                      <h2 className="text-2xl font-semibold text-white">Your details</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#8E8E93] hover:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
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

                      <div className="pt-4">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-12 rounded-full font-semibold text-white border-0 flex items-center justify-center gap-2"
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
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgendaBookingForm;
