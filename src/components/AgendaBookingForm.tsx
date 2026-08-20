import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Check, Star, MapPin, Phone, Globe, Share2, Heart } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { el as elLocale, es as esLocale, nl as nlLocale, pl as plLocale } from 'date-fns/locale';
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatTzLabel, dateStrInTz, minutesInTz, timeStrToMinutes, getBrowserTimezone } from "@/lib/tz";
import { motion, AnimatePresence } from "framer-motion";
import PulseButton, { type ButtonColor } from "@/components/PulseButton";


interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
  color?: string;
  icon?: string;
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
    brand_color?: string | null;
    booking_theme?: string | null;
    address?: string;
    phone?: string;
    avatar_url?: string;
    banner_url?: string;
    rating?: number | null;
    rating_count?: number | null;
    total_bookings?: number | null;
    services_count?: number | null;
    stylists_count?: number | null;
    currency?: string | null;
  } | null;
  workingDays?: number[];
  disabledDates?: string[];

  timezone?: string;
  rescheduleAppointment?: any;
  locale?: "en" | "el" | "es" | "pl" | "nl";
  askPhone?: boolean;
  askNotes?: boolean;
  submitLabel?: string;
  paymentsEnabled?: boolean;
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
  disabledDates = [],

  timezone = "UTC",
  rescheduleAppointment,
  locale = "en",
  askPhone = true,
  askNotes = true,
  submitLabel,
  paymentsEnabled = false,
}: AgendaBookingFormProps) => {
  const [step, setStep] = useState<"service" | "datetime" | "stylist" | "details" | "success">("service");
  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState<"shop" | "card">("shop");

  const bookingTheme = businessProfile?.booking_theme || "default";
  const themeColors: Record<string, string> = {
    pink: "#ff2281",
    blue: "#0070f3",
    orange: "#f2994a",
    yellow: "#f2c94c",
    green: "#27ae60",
    purple: "#8e44ad",
  };
  const accentColor =
    (bookingTheme !== "default" && themeColors[bookingTheme]) || businessProfile?.brand_color || "#e11d48";
  const currency = businessProfile?.currency || "EUR";
  const currencySymbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "PLN" ? "zł" : currency === "RON" ? "lei" : "€";
  const formatCurrency = (amount: number) =>
    currency === "PLN" ? `${amount} zł` : currency === "RON" ? `${amount} lei` : `${currencySymbol}${amount}`;
  // iOS-style buttons — themed via the barber's premium button theme.
  const themedButton = bookingTheme !== "default" && !!themeColors[bookingTheme];
  const BookingButton = ({
    text,
    onClick,
    disabled,
    type = "button",
    className,
  }: {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
    className?: string;
  }) => {
    if (themedButton) {
      return (
        <PulseButton
          text={text}
          onClick={onClick}
          disabled={disabled}
          type={type}
          size="md"
          color={bookingTheme as ButtonColor}
          className={cn("w-full !h-[54px] !rounded-[16px]", className)}
        />
      );
    }
    return (
      <motion.button
        type={type}
        onClick={onClick}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.975 }}
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
        className={cn(
          "w-full h-[54px] rounded-[16px] font-semibold text-[16px] text-black dark:text-white border-0",
          "flex items-center justify-center gap-2 select-none relative overflow-hidden",
          "transition-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
          className
        )}
        style={{
          backgroundImage: `linear-gradient(180deg, ${accentColor}, ${accentColor}dd)`,
        }}
      >
        {text}
      </motion.button>
    );
  };


  const displayName = useMemo(() => {
    if (businessProfile?.full_name && businessProfile.full_name.trim()) return businessProfile.full_name.trim();
    if (typeof window === "undefined") return "Book an Appointment";
    const parts = window.location.pathname.split("/").filter(Boolean);
    const raw = parts.length >= 2 && parts[0] === "book" ? parts[1] : parts[0] || "";
    return decodeURIComponent(raw).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Book an Appointment";
  }, [businessProfile?.full_name]);
  const avatarUrl = businessProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
  const bannerUrl = businessProfile?.banner_url;
  const COPY = {
    en: {
      service: "Select a service", dateTime: "Choose date and time", details: "Your details",
      continue: "Continue", back: "Back", selectedService: "Selected service", selectedServices: "Selected services",
      total: "Total", book: "Book Appointment", bookAnother: "Book another", booked: "You’re booked",
      confirmation: "Confirmation just landed in your inbox.",
      tabService: "Service", tabTime: "Time", tabDetails: "Details",
      dateTimeShort: "Date & time", selectDate: "Select a date", noTimes: "No available times",
      selectDateForTimes: "Select a date to see times", timesIn: "Times in",
      selectStylist: "Select stylist", stylist: "Stylist", noStylists: "No stylists available for this time",
      pickAnotherTime: "Pick another time", name: "Name", namePh: "Your name", email: "Email",
      phone: "Phone", notes: "Notes", notesPh: "Anything we should know?",
      processing: "Processing...", confirmChange: "Confirm Change",
      updated: "Appointment updated", rescheduled: "Your appointment has been rescheduled successfully.",
      pickServiceHint: "Select a service on the right to get started.", inPerson: "In-person", mins: "min",
    },
    el: {
      service: "Επιλέξτε υπηρεσία", dateTime: "Επιλέξτε ημερομηνία και ώρα", details: "Τα στοιχεία σας",
      continue: "Συνέχεια", back: "Πίσω", selectedService: "Επιλεγμένη υπηρεσία", selectedServices: "Επιλεγμένες υπηρεσίες",
      total: "Σύνολο", book: "Κλείστε Ραντεβού", bookAnother: "Νέα κράτηση", booked: "Η κράτησή σας ολοκληρώθηκε",
      confirmation: "Η επιβεβαίωση στάλθηκε στο email σας.",
      tabService: "Υπηρεσία", tabTime: "Ώρα", tabDetails: "Στοιχεία",
      dateTimeShort: "Ημερομηνία & ώρα", selectDate: "Επιλέξτε ημερομηνία", noTimes: "Δεν υπάρχουν διαθέσιμες ώρες",
      selectDateForTimes: "Επιλέξτε ημερομηνία για να δείτε ώρες", timesIn: "Ώρες σε",
      selectStylist: "Επιλέξτε κομμωτή", stylist: "Κομμωτής", noStylists: "Δεν υπάρχουν διαθέσιμοι για αυτή την ώρα",
      pickAnotherTime: "Επιλέξτε άλλη ώρα", name: "Όνομα", namePh: "Το όνομά σας", email: "Email",
      phone: "Τηλέφωνο", notes: "Σημειώσεις", notesPh: "Κάτι που πρέπει να ξέρουμε;",
      processing: "Επεξεργασία...", confirmChange: "Επιβεβαίωση αλλαγής",
      updated: "Η κράτηση ενημερώθηκε", rescheduled: "Η κράτησή σας προγραμματίστηκε ξανά.",
      pickServiceHint: "Επιλέξτε μια υπηρεσία για να ξεκινήσετε.", inPerson: "Με φυσική παρουσία", mins: "λεπτά",
    },
    es: {
      service: "Selecciona un servicio", dateTime: "Elige fecha y hora", details: "Tus datos",
      continue: "Continuar", back: "Atrás", selectedService: "Servicio seleccionado", selectedServices: "Servicios seleccionados",
      total: "Total", book: "Reservar cita", bookAnother: "Nueva reserva", booked: "Reserva confirmada",
      confirmation: "Se ha enviado la confirmación a tu correo.",
      tabService: "Servicio", tabTime: "Hora", tabDetails: "Datos",
      dateTimeShort: "Fecha y hora", selectDate: "Elige una fecha", noTimes: "No hay horas disponibles",
      selectDateForTimes: "Elige una fecha para ver las horas", timesIn: "Horas en",
      selectStylist: "Elige estilista", stylist: "Estilista", noStylists: "No hay estilistas para esta hora",
      pickAnotherTime: "Elegir otra hora", name: "Nombre", namePh: "Tu nombre", email: "Correo",
      phone: "Teléfono", notes: "Notas", notesPh: "¿Algo que debamos saber?",
      processing: "Procesando...", confirmChange: "Confirmar cambio",
      updated: "Reserva actualizada", rescheduled: "Tu reserva se ha modificado.",
      pickServiceHint: "Selecciona un servicio para empezar.", inPerson: "Presencial", mins: "min",
    },
    nl: {
      service: "Kies een dienst", dateTime: "Kies datum en tijd", details: "Jouw gegevens",
      continue: "Doorgaan", back: "Terug", selectedService: "Gekozen dienst", selectedServices: "Gekozen diensten",
      total: "Totaal", book: "Afspraak boeken", bookAnother: "Nieuwe afspraak", booked: "Je afspraak staat",
      confirmation: "De bevestiging is naar je e-mail gestuurd.",
      tabService: "Dienst", tabTime: "Tijd", tabDetails: "Gegevens",
      dateTimeShort: "Datum & tijd", selectDate: "Kies een datum", noTimes: "Geen beschikbare tijden",
      selectDateForTimes: "Kies een datum om tijden te zien", timesIn: "Tijden in",
      selectStylist: "Kies stylist", stylist: "Stylist", noStylists: "Geen stylisten beschikbaar voor deze tijd",
      pickAnotherTime: "Kies een andere tijd", name: "Naam", namePh: "Je naam", email: "E-mail",
      phone: "Telefoon", notes: "Opmerkingen", notesPh: "Iets wat we moeten weten?",
      processing: "Bezig...", confirmChange: "Wijziging bevestigen",
      updated: "Afspraak bijgewerkt", rescheduled: "Je afspraak is verzet.",
      pickServiceHint: "Kies een dienst om te beginnen.", inPerson: "Op locatie", mins: "min",
    },
    pl: {
      service: "Wybierz usługę", dateTime: "Wybierz datę i godzinę", details: "Twoje dane",
      continue: "Dalej", back: "Wstecz", selectedService: "Wybrana usługa", selectedServices: "Wybrane usługi",
      total: "Razem", book: "Zarezerwuj", bookAnother: "Nowa rezerwacja", booked: "Rezerwacja potwierdzona",
      confirmation: "Potwierdzenie zostało wysłane na Twój e-mail.",
      tabService: "Usługa", tabTime: "Godzina", tabDetails: "Dane",
      dateTimeShort: "Data i godzina", selectDate: "Wybierz datę", noTimes: "Brak dostępnych godzin",
      selectDateForTimes: "Wybierz datę, aby zobaczyć godziny", timesIn: "Godziny w",
      selectStylist: "Wybierz stylistę", stylist: "Stylista", noStylists: "Brak dostępnych stylistów o tej porze",
      pickAnotherTime: "Wybierz inną godzinę", name: "Imię", namePh: "Twoje imię", email: "E-mail",
      phone: "Telefon", notes: "Uwagi", notesPh: "Coś, co powinniśmy wiedzieć?",
      processing: "Przetwarzanie...", confirmChange: "Potwierdź zmianę",
      updated: "Rezerwacja zaktualizowana", rescheduled: "Twoja rezerwacja została przełożona.",
      pickServiceHint: "Wybierz usługę, aby zacząć.", inPerson: "Na miejscu", mins: "min",
    },
  } as const;
  const copy = COPY[locale] ?? COPY.en;
  const dateLocale = locale === "el" ? elLocale : locale === "es" ? esLocale : locale === "nl" ? nlLocale : locale === "pl" ? plLocale : undefined;
  const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: dateLocale });


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

  // Hard guard: never offer a time that has already passed today (business timezone).
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const tz = timezone || getBrowserTimezone();
    const dayKey = format(selectedDate, "yyyy-MM-dd");
    const isToday = dayKey === dateStrInTz(new Date(), tz);
    const nowMin = minutesInTz(new Date(), tz);
    return timeSlots.filter((time) => {
      if (isToday && timeStrToMinutes(time.slice(0, 5)) <= nowMin) return false;
      return isTimeSlotAvailable(time);
    });
  }, [selectedDate, timeSlots, isTimeSlotAvailable, timezone]);


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
    if (stylists.length > 0) {
      setStep("stylist");
    } else {
      setStep("details");
    }
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
    values.pay_method = paymentsEnabled ? payMethod : "shop";
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

  const handleBookAnother = () => {
    form.reset();
    setSelectedDate(undefined);
    setSelectedTime("");
    setSelectedStylistId("");
    setSubmitError(null);
    setStep("service");
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0a0a0c] flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-black dark:text-white mb-2">
            {rescheduleAppointment ? copy.updated : copy.booked}
          </h2>
          <p className="text-[#8E8E93] mb-6">
            {rescheduleAppointment ? copy.rescheduled : copy.confirmation}
          </p>
          <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.07] dark:border-white/[0.08] p-6 text-left mb-6">
            {selectedServices.map((service, index) => (
              <div key={service.id} className={cn("flex items-center gap-4", index > 0 && "pt-4 border-t border-black/10 dark:border-white/10 mt-4")}>
                <img src={avatarUrl} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-black dark:text-white font-medium truncate">{service.name}</p>
                  <p className="text-[#8E8E93] text-sm">{service.duration} {copy.mins} · {formatCurrency(service.price)}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-black/10 dark:border-white/10 pt-4 mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <CalendarIcon className="w-4 h-4" />
                <span>{selectedDate && fmt(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8E8E93]">
                <Clock className="w-4 h-4" />
                <span>{selectedTime}</span>
              </div>
            </div>
          </div>
          <BookingButton
            text={copy.bookAnother}
            onClick={handleBookAnother}
            className="w-auto px-8"
          />
        </div>
      </div>
    );
  }

  const spring = { type: "spring" as const, stiffness: 380, damping: 34 };

  const activeTabKey = step === "stylist" ? "datetime" : step;
  const stepTabs = [
    { key: "service", label: copy.tabService, enabled: true },
    {
      key: "datetime",
      label: copy.tabTime,
      enabled: selectedServiceIds.length > 0,
    },
    {
      key: "details",
      label: copy.tabDetails,
      enabled: selectedServiceIds.length > 0 && !!selectedTime,
    },
  ];


  const [liked, setLiked] = useState(false);
  const likeKey = `cutzioo_fav_${typeof window !== "undefined" ? window.location.pathname : ""}`;
  useEffect(() => {
    try { setLiked(localStorage.getItem(likeKey) === "1"); } catch { /* ignore */ }
  }, [likeKey]);
  const toggleLike = () => {
    setLiked((v) => {
      const next = !v;
      try { localStorage.setItem(likeKey, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };
  const shareVenue = async () => {
    try {
      if (navigator.share) await navigator.share({ title: displayName, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* dismissed */ }
  };

  const MobileSummary = () => (
    <div className="lg:hidden mb-4 px-1 pt-1">
      <div className="rounded-[24px] bg-white dark:bg-[#141416] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)]">
        <div className="h-24 w-full relative">
          {bannerUrl ? (
            <img src={bannerUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}08 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
            <button
              type="button"
              aria-label="Share"
              onClick={shareVenue}
              className="w-9 h-9 rounded-full bg-white/85 dark:bg-black/55 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition"
            >
              <Share2 className="w-4 h-4 text-black dark:text-white" />
            </button>
            <button
              type="button"
              aria-label={liked ? "Unsave" : "Save"}
              onClick={toggleLike}
              className="w-9 h-9 rounded-full bg-white/85 dark:bg-black/55 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition"
            >
              <Heart className={cn("w-4 h-4", liked ? "fill-[#FF2D6F] text-[#FF2D6F]" : "text-black dark:text-white")} />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 rounded-[14px] overflow-hidden bg-black/[0.05] dark:bg-[#2C2C2E]">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-semibold tracking-tight text-black dark:text-white truncate">{displayName}</h1>
              {businessProfile?.rating != null && (
                <div className="flex items-center gap-1 text-[13px]">
                  <Star className="w-3.5 h-3.5 fill-[#FFCC00] text-[#FFCC00]" />
                  <span className="font-medium text-black dark:text-white">{Number(businessProfile.rating).toFixed(1)}</span>
                  <span className="text-[#8E8E93]">({businessProfile.rating_count ?? 0})</span>
                </div>
              )}
            </div>
          </div>


          {selectedService && (
            <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-[#8E8E93] font-semibold mb-0.5">
                    {selectedServices.length > 1 ? copy.selectedServices : copy.selectedService}
                  </p>
                  <p className="text-black dark:text-white font-medium truncate">
                    {selectedServices.length > 1 ? `${selectedServices.length} services` : selectedService.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-black dark:text-white font-bold">{formatCurrency(totalPrice)}</p>
                  <p className="text-[11px] text-[#8E8E93]">{totalDuration} min</p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-[#8E8E93]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{businessProfile?.address || copy.inPerson}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{formatTzLabel(timezone)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                <span className="text-sm font-medium text-black dark:text-white">{copy.total}</span>
                <span className="text-lg font-bold text-black dark:text-white">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F2F2F7] dark:bg-[#0a0a0c] text-black dark:text-white p-3 md:p-8 lg:p-12 relative">
      <div className="w-full max-w-6xl mx-auto bg-transparent lg:bg-white lg:dark:bg-[#111114] lg:border lg:border-black/[0.06] lg:dark:border-white/[0.06] rounded-[28px] lg:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] overflow-hidden p-0 lg:p-8 relative z-10">
        <MobileSummary />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
            className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 md:gap-6 lg:gap-8 items-start"
          >
            {/* Left panel — brand + booking info */}
            <div className="hidden lg:block lg:sticky lg:top-8 space-y-4">
              <div className="bg-white dark:bg-[#1a1a1a] border border-black/[0.07] dark:border-[#2a2a2a] overflow-hidden rounded-2xl shadow-2xl">
                <div className="h-44 w-full relative">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: `linear-gradient(135deg, ${accentColor}40 0%, #E5E5EA 100%)` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent" />
                </div>
                <div className="px-5 pb-5 -mt-10 relative">
                  <div className="flex items-end gap-4 mb-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-[#1C1C1E] bg-black/[0.05] dark:bg-[#2C2C2E]">
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    </div>
                    <div className="pb-1">
                      {businessProfile?.rating != null && (
                        <div className="flex items-center gap-1 text-sm text-[#FFCC00]">
                          <Star className="w-3.5 h-3.5 fill-[#FFCC00]" />
                          <span className="font-medium text-black dark:text-white">{Number(businessProfile.rating).toFixed(1)}</span>
                          <span className="text-[#8E8E93]">({businessProfile.rating_count ?? 0})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-black dark:text-white mb-1">{displayName}</h1>

                  {selectedService ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#8E8E93] font-semibold mb-1">
                          {selectedServices.length > 1 ? copy.selectedServices : copy.selectedService}
                        </p>
                        <h2 className="text-lg font-semibold text-black dark:text-white">
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
                          <span className="truncate">{businessProfile?.address || copy.inPerson}</span>
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

                      <div className="pt-4 border-t border-black/[0.07] dark:border-white/[0.08]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#8E8E93]">{copy.total}</span>
                          <span className="text-xl font-bold text-black dark:text-white">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#8E8E93] text-sm mt-3">{copy.pickServiceHint}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel — booking flow */}
            <div className="bg-transparent lg:bg-white lg:dark:bg-[#15151A] lg:border lg:border-black/[0.06] lg:dark:border-white/[0.06] p-4 md:p-6 lg:p-8 min-h-[520px] rounded-[24px]">
              {/* Equal-width segmented step tabs (cal.com inspired) */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-[16px] bg-black/[0.05] dark:bg-[#1C1C1E] mb-6">
                {stepTabs.map((tab) => {
                  const active = tab.key === activeTabKey;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => tab.enabled && setStep(tab.key as any)}
                      disabled={!tab.enabled}
                      className={cn(
                        "relative h-9 rounded-[12px] text-[13px] font-medium transition-colors",
                        active ? "text-black dark:text-white" : tab.enabled ? "text-[#8E8E93] hover:text-black dark:hover:text-white" : "text-[#48484A] cursor-not-allowed"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="booking-tab"
                          transition={{ type: "spring", stiffness: 480, damping: 38 }}
                          className="absolute inset-0 rounded-[12px] bg-white shadow-sm dark:bg-[#2C2C2E] dark:shadow-none"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {step === "service" && (
                <div className="h-full flex flex-col pb-28 sm:pb-0">
                  <div className="mb-6">
                    <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight text-black dark:text-white">
                      {copy.service}
                    </h2>
                  </div>
                  <div className="grid gap-3">
                    {services.map((service, idx) => {
                      const active = selectedServiceIds.includes(service.id);
                      const swatch = service.color || accentColor;
                      return (
                        <motion.button
                          key={service.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 34, delay: Math.min(idx * 0.035, 0.25) }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleServiceToggle(service.id)}
                          className={cn(
                            "w-full p-5 rounded-[20px] border text-left transition-all bg-white dark:bg-[#15151A]",
                            active
                              ? "border-transparent shadow-[0_10px_30px_-16px_rgba(0,0,0,0.45)]"
                              : "border-black/[0.06] dark:border-white/[0.07] hover:border-black/15 dark:hover:border-white/15"
                          )}
                          style={active ? { borderColor: swatch, boxShadow: `0 0 0 1.5px ${swatch}` } : {}}
                        >
                          <p className="text-[18px] font-semibold tracking-tight text-black dark:text-white">
                            {service.name}
                          </p>
                          <p className="mt-1 text-[15px] text-black/45 dark:text-white/45 tabular-nums">
                            {service.duration} {copy.mins}
                          </p>
                          {service.description && (
                            <p className="mt-2.5 text-[15px] leading-[1.5] text-black/55 dark:text-white/55 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="mt-4 flex items-center justify-between gap-4">
                            <span className="text-[17px] font-semibold text-black dark:text-white tabular-nums">
                              {formatCurrency(service.price)}
                            </span>
                            <span
                              className={cn(
                                "w-11 h-11 rounded-full flex items-center justify-center border transition-all shrink-0",
                                active
                                  ? "border-transparent text-white"
                                  : "border-black/10 dark:border-white/15 text-black dark:text-white"
                              )}
                              style={active ? { backgroundColor: swatch } : {}}
                            >
                              {active ? <Check className="w-5 h-5" /> : <span className="text-[22px] leading-none -mt-0.5">+</span>}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  {selectedServiceIds.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border-t border-black/[0.07] dark:border-white/[0.08] z-50 sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:z-auto sm:mt-6 sm:pt-4 sm:border-t sm:border-black/[0.06] dark:sm:border-white/[0.06]">
                      <BookingButton
                        text={copy.continue}
                        onClick={handleServiceContinue}
                      />
                    </div>
                  )}

                </div>
              )}




              {step === "datetime" && selectedService && (
                <div className="h-full flex flex-col pb-24 sm:pb-0">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[30px] leading-[1.1] font-bold tracking-tight text-black dark:text-white">
                      {copy.dateTimeShort}
                    </h2>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {copy.back}
                    </button>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8">
                    {/* Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-black dark:text-white">
                          {fmt(currentMonth, 'MMMM')} <span className="text-[#8E8E93]">{format(currentMonth, 'yyyy')}</span>
                        </h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white transition"
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
                          const isDisabled = day < new Date(new Date().setHours(0, 0, 0, 0)) || !workingDays.includes(getDay(day)) || disabledDates.includes(format(day, 'yyyy-MM-dd'));
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
                                  ? "text-black/25 dark:text-[#636366] cursor-not-allowed"
                                  : !isCurrentMonth
                                  ? "text-black/25 dark:text-[#636366]"
                                  : isToday
                                  ? "text-black dark:text-white border border-black/15 dark:border-[#3a3a3a]"
                                  : "text-black dark:text-white bg-black/[0.03] dark:bg-[#2a2a2a]/40 hover:bg-black/[0.06] dark:hover:bg-[#2a2a2a]"
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
                          {fmt(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Time slots */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-black dark:text-white">
                          {selectedDate ? fmt(selectedDate, 'EEE dd') : copy.selectDate}
                        </h4>
                        <div className="flex gap-1 bg-white dark:bg-[#1C1C1E] rounded-lg p-1">
                          <button
                            onClick={() => setTimeFormat("12h")}
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium transition-colors",
                              timeFormat === "12h" ? "bg-black/[0.05] dark:bg-[#2C2C2E] text-black dark:text-white" : "text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white"
                            )}
                          >
                            12h
                          </button>
                          <button
                            onClick={() => setTimeFormat("24h")}
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium transition-colors",
                              timeFormat === "24h" ? "bg-black/[0.05] dark:bg-[#2C2C2E] text-black dark:text-white" : "text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white"
                            )}
                          >
                            24h
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-[#8E8E93]">
                        <Globe className="w-3 h-3" />
                        <span>{copy.timesIn} {formatTzLabel(timezone)}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 max-h-[480px] pr-1 auto-rows-[52px]">
                        {selectedDate ? (
                          availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map((time, idx) => {
                              const active = selectedTime === time;
                              const showRange = totalDuration > 30;
                              return (
                                <motion.button
                                  key={time}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ ...spring, delay: Math.min(idx * 0.015, 0.3) }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => handleTimeSelect(time)}
                                  className={cn(
                                    "w-full h-[52px] rounded-xl border font-medium text-[15px] flex flex-col items-center justify-center tabular-nums transition-colors",
                                    active
                                      ? "border-transparent text-white"
                                      : "border-black/[0.07] dark:border-[#2a2a2a] bg-transparent text-black dark:text-white hover:bg-black/[0.04] dark:hover:bg-[#2a2a2a]"
                                  )}
                                  style={active ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                                >
                                  <span className="leading-none">{formatTime(time)}</span>
                                  {showRange && (
                                    <span className="text-[11px] mt-1 leading-none opacity-70">
                                      → {formatTime(getEndTime(time, totalDuration))}
                                    </span>
                                  )}
                                </motion.button>
                              );
                            })

                          ) : (

                            <div className="col-span-2 text-center text-[#8E8E93] py-8 text-sm">
                              {copy.noTimes}
                            </div>
                          )
                        ) : (
                          <div className="col-span-2 text-center text-[#8E8E93] py-8 text-sm">
                            {copy.selectDateForTimes}
                          </div>
                        )}
                      </div>
                      {selectedDate && availableTimeSlots.length > 0 && (
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-white/95 dark:bg-[#141416]/95 backdrop-blur border-t border-black/[0.07] dark:border-white/[0.08] z-50 sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:z-auto sm:pt-4">
                          <BookingButton
                            text={copy.continue}
                            onClick={handleContinue}
                            disabled={!selectedTime}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === "stylist" && selectedService && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[30px] leading-[1.1] font-bold tracking-tight text-black dark:text-white">{copy.selectStylist}</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {copy.back}
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
                              "w-full p-4 rounded-[20px] border text-left transition-all bg-white dark:bg-[#15151A] flex items-center gap-4",
                              active ? "ring-2 ring-white/30" : "border-black/[0.06] dark:border-white/[0.06] hover:border-white/[0.12]"
                            )}
                            style={active ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                          >
                            <div className="h-12 w-12 rounded-full bg-black/[0.05] dark:bg-[#2C2C2E] overflow-hidden flex items-center justify-center text-lg font-semibold text-black dark:text-white shrink-0">
                              {stylist.avatar_url ? (
                                <img src={stylist.avatar_url} alt={stylist.name} className="h-full w-full object-cover" />
                              ) : (
                                stylist.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-black dark:text-white font-semibold truncate">{stylist.name}</p>
                              <p className="text-[#8E8E93] text-sm truncate">{stylist.title || copy.stylist}</p>
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
                        <p className="text-[#8E8E93] mb-4">{copy.noStylists}</p>
                        <Button
                          onClick={handleBack}
                          variant="outline"
                          className="rounded-full border-black/[0.07] dark:border-white/[0.08] text-black dark:text-white hover:bg-black/[0.05] dark:bg-[#2C2C2E]"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1.5" />
                          {copy.pickAnotherTime}
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
                      <h2 className="text-[30px] leading-[1.1] font-bold tracking-tight text-black dark:text-white">{copy.details}</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-[#8E8E93] hover:text-black dark:hover:text-black dark:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {copy.back}
                    </button>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-24 sm:pb-0">
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
                            <FormLabel className="text-[#8E8E93] text-sm">{copy.name}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                                <Input
                                  {...field}
                                  className="w-full pl-10 pr-3 h-[52px] bg-white dark:bg-[#15151A] border-black/[0.07] dark:border-white/[0.08] rounded-[16px] text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-[#636366] focus:border-black/25 dark:focus:border-white/20 focus:ring-0"
                                  placeholder={copy.namePh}
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
                            <FormLabel className="text-[#8E8E93] text-sm">{copy.email}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="w-full px-3 h-[52px] bg-white dark:bg-[#15151A] border-black/[0.07] dark:border-white/[0.08] rounded-[16px] text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-[#636366] focus:border-black/25 dark:focus:border-white/20 focus:ring-0"
                                placeholder="email@example.com"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {askPhone && (
                        <FormField
                          control={form.control}
                          name="customer_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#8E8E93] text-sm">{copy.phone}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full px-3 h-[52px] bg-white dark:bg-[#15151A] border-black/[0.07] dark:border-white/[0.08] rounded-[16px] text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-[#636366] focus:border-black/25 dark:focus:border-white/20 focus:ring-0"
                                  placeholder="+1 555 123 4567"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {askNotes && (
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#8E8E93] text-sm">{copy.notes}</FormLabel>
                              <FormControl>
                                <textarea
                                  {...field}
                                  rows={3}
                                  className="w-full px-3 py-2.5 bg-white dark:bg-[#15151A] border border-black/[0.07] dark:border-white/[0.08] rounded-[16px] text-black dark:text-white placeholder:text-black/35 dark:placeholder:text-[#636366] focus:border-black/25 dark:focus:border-white/20 focus:ring-0 resize-none"
                                  placeholder={copy.notesPh}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {totalPrice > 0 && (
                        <div>
                          <p className="text-[#8E8E93] text-sm mb-2">Payment</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: "shop", label: "Pay at the shop", enabled: true },
                              { key: "card", label: "Pay with card", enabled: !!paymentsEnabled },
                            ] as const).map((opt) => {
                              const active = payMethod === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  disabled={!opt.enabled}
                                  onClick={() => {
                                    setPayMethod(opt.key);
                                  }}
                                  className={cn(
                                    "h-[52px] rounded-xl border text-[15px] font-medium transition-all px-3",
                                    !opt.enabled
                                      ? "border-black/[0.06] dark:border-white/[0.06] text-black/25 dark:text-white/25 cursor-not-allowed"
                                      : active
                                      ? "border-transparent text-white"
                                      : "border-black/[0.08] dark:border-white/[0.12] text-black dark:text-white"
                                  )}
                                  style={active && opt.enabled ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          {!paymentsEnabled && (
                            <p className="mt-2 text-[12.5px] text-[#8E8E93]">This business hasn’t enabled card payments yet.</p>
                          )}
                        </div>
                      )}

                      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0A0A0C]/95 backdrop-blur border-t border-black/[0.07] dark:border-white/[0.08] z-50 sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:z-auto">
                        <BookingButton
                          type="button"
                          text={isLoading ? copy.processing : rescheduleAppointment ? copy.confirmChange : submitLabel || copy.book}
                          disabled={isLoading}
                          onClick={() => { form.handleSubmit(handleSubmit)(); }}
                        />
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
