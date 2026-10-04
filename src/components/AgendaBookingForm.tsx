import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Check, Star, MapPin, Phone, Globe, CreditCard } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { getBookingDateLocale, type BookingLocale } from '@/lib/bookingLocales';
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatTzLabel, dateStrInTz, minutesInTz, timeStrToMinutes, getBrowserTimezone } from "@/lib/tz";
import { motion, AnimatePresence } from "framer-motion";
import { getIconByName } from "@/components/IconPicker";
import PulseButton, { type ButtonColor } from "@/components/PulseButton";
import { SlotRail } from "@/components/SlotRail";
import { fireBookingConfetti } from "@/lib/confetti";


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
  paymentsEnabled?: boolean;

  disabledDates?: string[];

  timezone?: string;
  rescheduleAppointment?: any;
  locale?: BookingLocale;
  askPhone?: boolean;
  askNotes?: boolean;
  submitLabel?: string;
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
  const [railOnOpenSlot, setRailOnOpenSlot] = useState(true);
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
    (bookingTheme !== "default" && themeColors[bookingTheme]) || businessProfile?.brand_color || "#FF2D46";
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
          "w-full h-[54px] rounded-[16px] font-semibold text-[16px] text-white border-0",
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
    de: {
      service: "Dienst auswählen", dateTime: "Datum und Uhrzeit wählen", details: "Deine Angaben",
      continue: "Weiter", back: "Zurück", selectedService: "Ausgewählte Dienstleistung", selectedServices: "Ausgewählte Dienstleistungen",
      total: "Gesamt", book: "Termin buchen", bookAnother: "Weiteren Termin buchen", booked: "Termin bestätigt",
      confirmation: "Die Bestätigung wurde an deine E-Mail-Adresse gesendet.",
      tabService: "Dienstleistung", tabTime: "Uhrzeit", tabDetails: "Angaben",
      dateTimeShort: "Datum und Uhrzeit", selectDate: "Datum auswählen", noTimes: "Keine freien Zeiten",
      selectDateForTimes: "Wähle ein Datum, um freie Zeiten zu sehen", timesIn: "Freie Zeiten in",
      selectStylist: "Stylist auswählen", stylist: "Stylist", noStylists: "Zu dieser Zeit sind keine Stylisten verfügbar",
      pickAnotherTime: "Andere Uhrzeit wählen", name: "Name", namePh: "Dein Name", email: "E-Mail",
      phone: "Telefon", notes: "Notizen", notesPh: "Gibt es etwas, das wir wissen sollten?",
      processing: "Wird verarbeitet…", confirmChange: "Änderung bestätigen",
      updated: "Termin aktualisiert", rescheduled: "Dein Termin wurde erfolgreich verschoben.",
      pickServiceHint: "Wähle eine Dienstleistung aus, um zu beginnen.", inPerson: "Vor Ort", mins: "Min.",
    },
    fr: {
      service: "Choisissez une prestation", dateTime: "Choisissez une date et une heure", details: "Vos informations",
      continue: "Continuer", back: "Retour", selectedService: "Prestation choisie", selectedServices: "Prestations choisies",
      total: "Total", book: "Réserver", bookAnother: "Faire une autre réservation", booked: "Réservation confirmée",
      confirmation: "La confirmation a été envoyée à votre adresse e-mail.",
      tabService: "Prestation", tabTime: "Heure", tabDetails: "Informations",
      dateTimeShort: "Date et heure", selectDate: "Choisissez une date", noTimes: "Aucun créneau disponible",
      selectDateForTimes: "Choisissez une date pour voir les horaires", timesIn: "Créneaux à",
      selectStylist: "Choisissez un coiffeur", stylist: "Coiffeur", noStylists: "Aucun coiffeur disponible à cette heure",
      pickAnotherTime: "Choisir une autre heure", name: "Nom", namePh: "Votre nom", email: "E-mail",
      phone: "Téléphone", notes: "Notes", notesPh: "Une information à nous communiquer ?",
      processing: "Traitement…", confirmChange: "Confirmer la modification",
      updated: "Réservation mise à jour", rescheduled: "Votre rendez-vous a été déplacé.",
      pickServiceHint: "Choisissez une prestation pour commencer.", inPerson: "Sur place", mins: "min",
    },
    it: {
      service: "Seleziona un servizio", dateTime: "Scegli data e ora", details: "I tuoi dati",
      continue: "Continua", back: "Indietro", selectedService: "Servizio selezionato", selectedServices: "Servizi selezionati",
      total: "Totale", book: "Prenota appuntamento", bookAnother: "Prenota un altro appuntamento", booked: "Prenotazione confermata",
      confirmation: "La conferma è stata inviata alla tua e-mail.",
      tabService: "Servizio", tabTime: "Orario", tabDetails: "Dati",
      dateTimeShort: "Data e ora", selectDate: "Seleziona una data", noTimes: "Nessun orario disponibile",
      selectDateForTimes: "Seleziona una data per vedere gli orari", timesIn: "Orari a",
      selectStylist: "Seleziona un professionista", stylist: "Professionista", noStylists: "Nessun professionista disponibile a quest’ora",
      pickAnotherTime: "Scegli un altro orario", name: "Nome", namePh: "Il tuo nome", email: "E-mail",
      phone: "Telefono", notes: "Note", notesPh: "C’è qualcosa che dovremmo sapere?",
      processing: "Elaborazione…", confirmChange: "Conferma modifica",
      updated: "Prenotazione aggiornata", rescheduled: "L’appuntamento è stato riprogrammato.",
      pickServiceHint: "Seleziona un servizio per iniziare.", inPerson: "In sede", mins: "min",
    },
    bg: {
      service: "Изберете услуга", dateTime: "Изберете дата и час", details: "Вашите данни",
      continue: "Продължи", back: "Назад", selectedService: "Избрана услуга", selectedServices: "Избрани услуги",
      total: "Общо", book: "Запази час", bookAnother: "Запази още един час", booked: "Резервацията е потвърдена",
      confirmation: "Потвърждението е изпратено на вашия имейл.",
      tabService: "Услуга", tabTime: "Час", tabDetails: "Данни",
      dateTimeShort: "Дата и час", selectDate: "Изберете дата", noTimes: "Няма свободни часове",
      selectDateForTimes: "Изберете дата, за да видите свободните часове", timesIn: "Свободни часове в",
      selectStylist: "Изберете стилист", stylist: "Стилист", noStylists: "Няма свободни стилисти за този час",
      pickAnotherTime: "Изберете друг час", name: "Име", namePh: "Вашето име", email: "Имейл",
      phone: "Телефон", notes: "Бележки", notesPh: "Има ли нещо, което трябва да знаем?",
      processing: "Обработване…", confirmChange: "Потвърдете промяната",
      updated: "Резервацията е актуализирана", rescheduled: "Часът ви беше успешно променен.",
      pickServiceHint: "Изберете услуга, за да започнете.", inPerson: "На място", mins: "мин",
    },
    ro: {
      service: "Alege un serviciu", dateTime: "Alege data și ora", details: "Datele tale",
      continue: "Continuă", back: "Înapoi", selectedService: "Serviciu selectat", selectedServices: "Servicii selectate",
      total: "Total", book: "Programează-te", bookAnother: "Programează o altă vizită", booked: "Programare confirmată",
      confirmation: "Confirmarea a fost trimisă la adresa ta de e-mail.",
      tabService: "Serviciu", tabTime: "Ora", tabDetails: "Date",
      dateTimeShort: "Data și ora", selectDate: "Alege o dată", noTimes: "Nu există ore disponibile",
      selectDateForTimes: "Alege o dată pentru a vedea orele disponibile", timesIn: "Ore disponibile în",
      selectStylist: "Alege un stilist", stylist: "Stilist", noStylists: "Nu există stiliști disponibili la această oră",
      pickAnotherTime: "Alege altă oră", name: "Nume", namePh: "Numele tău", email: "E-mail",
      phone: "Telefon", notes: "Note", notesPh: "Este ceva ce ar trebui să știm?",
      processing: "Se procesează…", confirmChange: "Confirmă modificarea",
      updated: "Programare actualizată", rescheduled: "Programarea ta a fost reprogramată.",
      pickServiceHint: "Alege un serviciu pentru a începe.", inPerson: "La locație", mins: "min",
    },
    sq: {
      service: "Zgjidhni një shërbim", dateTime: "Zgjidhni datën dhe orën", details: "Të dhënat tuaja",
      continue: "Vazhdoni", back: "Mbrapa", selectedService: "Shërbimi i zgjedhur", selectedServices: "Shërbimet e zgjedhura",
      total: "Totali", book: "Rezervo takimin", bookAnother: "Rezervo një takim tjetër", booked: "Rezervimi u konfirmua",
      confirmation: "Konfirmimi u dërgua në adresën tuaj të email-it.",
      tabService: "Shërbimi", tabTime: "Ora", tabDetails: "Të dhënat",
      dateTimeShort: "Data dhe ora", selectDate: "Zgjidhni një datë", noTimes: "Nuk ka orare të lira",
      selectDateForTimes: "Zgjidhni një datë për të parë oraret e lira", timesIn: "Orari në",
      selectStylist: "Zgjidhni stilistin", stylist: "Stilisti", noStylists: "Nuk ka stilistë të lirë në këtë orar",
      pickAnotherTime: "Zgjidhni një orar tjetër", name: "Emri", namePh: "Emri juaj", email: "Email",
      phone: "Telefoni", notes: "Shënime", notesPh: "A ka diçka që duhet të dimë?",
      processing: "Duke u përpunuar…", confirmChange: "Konfirmo ndryshimin",
      updated: "Rezervimi u përditësua", rescheduled: "Takimi juaj u ricaktua me sukses.",
      pickServiceHint: "Zgjidhni një shërbim për të filluar.", inPerson: "Në sallon", mins: "min",
    },
  } as const;
  const copy = COPY[locale] ?? COPY.en;
  const dateLocale = getBookingDateLocale(locale);
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

  const selectedStylist = stylists.find((s) => s.id === selectedStylistId);

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

  // All generated slots annotated with availability for the swipe rail.
  const railSlots = useMemo(() => {
    const open = new Set(availableTimeSlots);
    return timeSlots.map((time) => ({ time, available: open.has(time) }));
  }, [timeSlots, availableTimeSlots]);

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
        fireBookingConfetti();
      } else if (result.error) {
        setSubmitError(result.error);
      }
    } else {
      setStep("success");
      fireBookingConfetti();
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
      <div className="relative min-h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#0A0A0C] flex items-center justify-center p-4 md:p-8">
        <div
          className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: accentColor }}
        />
        <div className="relative w-full max-w-md text-center">
          <div className="relative mx-auto mb-7 h-24 w-24">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: accentColor }}
              initial={{ scale: 0.6, opacity: 0.45 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full"
              style={{ backgroundColor: accentColor, boxShadow: `0 18px 44px -12px ${accentColor}` }}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18, type: "spring", stiffness: 420, damping: 22 }}
              >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.span>
            </motion.div>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-[28px] font-semibold tracking-tight text-gray-900 dark:text-white mb-2"
          >
            {rescheduleAppointment ? copy.updated : copy.booked}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="text-gray-500 dark:text-[#8E8E93] mb-7"
          >
            {rescheduleAppointment ? copy.rescheduled : copy.confirmation}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 28 }}
            className="rounded-[28px] bg-white dark:bg-[#121215] border border-black/[0.05] dark:border-white/[0.06] p-5 text-left mb-6"
          >
            {selectedServices.map((service, index) => (
              <div key={service.id} className={cn("flex items-center gap-3.5", index > 0 && "pt-4 border-t border-black/[0.05] dark:border-white/[0.06] mt-4")}>
                <img src={avatarUrl} alt={displayName} className="w-11 h-11 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white font-semibold truncate">{service.name}</p>
                  <p className="text-gray-500 dark:text-[#8E8E93] text-[13px]">{service.duration} {copy.mins} · {formatCurrency(service.price)}</p>
                </div>
              </div>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-[13px]">
              <div className="flex items-center gap-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2.5 text-gray-700 dark:text-white/80">
                <CalendarIcon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span className="truncate">{selectedDate && fmt(selectedDate, 'EEE, MMM d')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2.5 text-gray-700 dark:text-white/80">
                <Clock className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span className="tabular-nums">{selectedTime}</span>
              </div>
            </div>
          </motion.div>
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


  const MobileSummary = () => (
    <div className="lg:hidden mb-4">
      <div className="rounded-[26px] bg-white dark:bg-[#121215] border border-black/[0.05] dark:border-white/[0.06] overflow-hidden">
        <div className="h-24 w-full relative">
          {bannerUrl ? (
            <img src={bannerUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}08 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#121215] via-transparent to-transparent" />
        </div>
        <div className="px-4 pb-4 -mt-7 relative">
          <div className="flex items-end gap-3 mb-3.5">
            <div className="w-14 h-14 rounded-[18px] overflow-hidden ring-4 ring-white dark:ring-[#121215] bg-gray-100 dark:bg-[#2C2C2E]">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white truncate">{displayName}</h1>
              {businessProfile?.rating != null && (
                <div className="flex items-center gap-1 text-sm text-[#FFCC00]">
                  <Star className="w-3.5 h-3.5 fill-[#FFCC00]" />
                  <span className="font-medium text-gray-900 dark:text-white">{Number(businessProfile.rating).toFixed(1)}</span>
                  <span className="text-gray-500 dark:text-[#8E8E93]">({businessProfile.rating_count ?? 0})</span>
                </div>
              )}
            </div>
          </div>

          {selectedService && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] bg-black/[0.03] dark:bg-white/[0.04] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8E8E93] font-semibold mb-0.5">
                    {selectedServices.length > 1 ? copy.selectedServices : copy.selectedService}
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium truncate">
                    {selectedServices.length > 1 ? `${selectedServices.length} services` : selectedService.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-900 dark:text-white font-bold">{formatCurrency(totalPrice)}</p>
                  <p className="text-[11px] text-gray-500 dark:text-[#8E8E93]">{totalDuration} min</p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500 dark:text-[#8E8E93]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{businessProfile?.address || copy.inPerson}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{formatTzLabel(timezone)}</span>
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F5F5F7] dark:bg-[#0A0A0C] text-gray-900 dark:text-white px-3 pt-3 pb-8 md:p-8 lg:p-12 relative">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[34rem] max-w-full -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: accentColor }}
      />
      <div className="w-full max-w-5xl mx-auto relative z-10">
        <MobileSummary />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={spring}
            className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 md:gap-5 lg:gap-6 items-start"
          >
            {/* Left panel — brand + booking info */}
            <div className="hidden lg:block lg:sticky lg:top-8 space-y-4">
              <div className="bg-white dark:bg-[#121215] border border-black/[0.05] dark:border-white/[0.06] overflow-hidden rounded-[28px]">
                <div className="h-40 w-full relative">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: `linear-gradient(135deg, ${accentColor}40 0%, #E5E5EA 100%)` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#121215] via-transparent to-transparent" />
                </div>
                <div className="px-5 pb-5 -mt-10 relative">
                  <div className="flex items-end gap-4 mb-4">
                    <div className="w-20 h-20 rounded-[22px] overflow-hidden ring-4 ring-white dark:ring-[#121215] bg-gray-100 dark:bg-[#2C2C2E]">
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    </div>
                    <div className="pb-1">
                      {businessProfile?.rating != null && (
                        <div className="flex items-center gap-1 text-sm text-[#FFCC00]">
                          <Star className="w-3.5 h-3.5 fill-[#FFCC00]" />
                          <span className="font-medium text-gray-900 dark:text-white">{Number(businessProfile.rating).toFixed(1)}</span>
                          <span className="text-gray-500 dark:text-[#8E8E93]">({businessProfile.rating_count ?? 0})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-1">{displayName}</h1>

                  {selectedService ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-[#8E8E93] font-semibold mb-1">
                          {selectedServices.length > 1 ? copy.selectedServices : copy.selectedService}
                        </p>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedServices.length > 1 ? `${selectedServices.length} services` : selectedService.name}
                        </h2>
                        {selectedService.description && selectedServices.length === 1 && (
                          <p className="text-sm text-gray-500 dark:text-[#8E8E93] mt-1 line-clamp-3">{selectedService.description}</p>
                        )}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-gray-500 dark:text-[#8E8E93]">
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

                      <div className="pt-4 border-t border-gray-200 dark:border-white/[0.08]">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-[#8E8E93]">{copy.total}</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-[#8E8E93] text-sm mt-3">{copy.pickServiceHint}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel — booking flow */}
            <div className="bg-white dark:bg-[#121215] border border-black/[0.05] dark:border-white/[0.06] p-4 md:p-7 min-h-[480px] rounded-[28px]">
              {/* Step tabs with an animated progress line */}
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.05]">
                  {stepTabs.map((tab) => {
                    const active = tab.key === activeTabKey;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => tab.enabled && setStep(tab.key as any)}
                        disabled={!tab.enabled}
                        className={cn(
                          "relative h-9 rounded-full text-[13px] font-medium transition-colors",
                          active ? "text-gray-900 dark:text-white" : tab.enabled ? "text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-white" : "text-gray-400 dark:text-[#48484A] cursor-not-allowed"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="booking-tab"
                            transition={{ type: "spring", stiffness: 480, damping: 38 }}
                            className="absolute inset-0 rounded-full bg-white dark:bg-white/[0.1] shadow-sm"
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 h-[3px] rounded-full bg-black/[0.05] dark:bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: accentColor }}
                    initial={false}
                    animate={{ width: `${((stepTabs.findIndex((t) => t.key === activeTabKey) + 1) / stepTabs.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 220, damping: 30 }}
                  />
                </div>
              </div>

              {step === "service" && (
                <div className="h-full flex flex-col pb-28 sm:pb-0">
                  <div className="mb-4">
                    <h2 className="text-[24px] font-semibold tracking-tight text-gray-900 dark:text-white">{copy.service}</h2>
                  </div>
                  <div className="grid gap-2.5">
                    {services.map((service, idx) => {
                      const active = selectedServiceIds.includes(service.id);
                      const swatch = service.color || accentColor;
                      const ServiceIcon = service.icon ? getIconByName(service.icon) : null;
                      return (
                        <motion.button
                          key={service.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 34, delay: Math.min(idx * 0.035, 0.25) }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => handleServiceToggle(service.id)}
                          className={cn(
                            "w-full p-4 rounded-[22px] border text-left transition-colors bg-black/[0.02] dark:bg-white/[0.03]",
                            !active && "border-black/[0.05] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                          )}
                          style={active ? { borderColor: swatch, backgroundColor: `${swatch}12` } : {}}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className="h-11 w-11 rounded-[14px] shrink-0 flex items-center justify-center text-white"
                              style={{ backgroundColor: swatch }}
                            >
                              {ServiceIcon ? (
                                <ServiceIcon className="w-6 h-6" />
                              ) : (
                                <span className="w-3 h-3 rounded-full bg-white/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-gray-900 dark:text-white text-[16px] truncate">{service.name}</p>
                                <p className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums shrink-0">{formatCurrency(service.price)}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500 dark:text-[#8E8E93] text-[13px] mt-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="tabular-nums">{service.duration} min</span>
                              </div>
                            </div>
                            <motion.div
                              initial={false}
                              animate={{ scale: active ? 1 : 0.4, opacity: active ? 1 : 0 }}
                              transition={{ type: "spring", stiffness: 520, damping: 26 }}
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: accentColor }}
                            >
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </motion.div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  {selectedServiceIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/85 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 dark:from-[#0A0A0C] dark:via-[#0A0A0C]/85 sm:pointer-events-auto sm:static sm:bg-none sm:px-0 sm:pb-0 sm:pt-4"
                    >
                      <div
                        className="pointer-events-auto mx-auto max-w-md"
                        style={{ filter: `drop-shadow(0 10px 24px ${accentColor}40)` }}
                      >
                        <BookingButton
                          text={copy.continue}
                          onClick={handleServiceContinue}
                          className="!h-12 !rounded-full"
                        />
                      </div>
                    </motion.div>
                  )}

                </div>
              )}


              {step === "datetime" && selectedService && (
                <div className="h-full flex flex-col pb-24 sm:pb-0">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[26px] font-semibold tracking-tight text-gray-900 dark:text-white">
                      {copy.dateTimeShort}
                    </h2>
                    <button
                      onClick={handleBack}
                      className="text-sm text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {copy.back}
                    </button>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 md:gap-8">
                    {/* Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {fmt(currentMonth, 'MMMM')} <span className="text-gray-500 dark:text-[#8E8E93]">{format(currentMonth, 'yyyy')}</span>
                        </h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            aria-label="Previous month"
                            className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-600 dark:text-[#C7C7CC] active:scale-90 transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            aria-label="Next month"
                            className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-600 dark:text-[#C7C7CC] active:scale-90 transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                        {weekDays.map(day => (
                          <div key={day} className="text-center text-[10px] font-semibold tracking-wider text-gray-400 dark:text-[#636366] py-1.5">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {calendarDays.map((day) => {
                          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isToday = isSameDay(day, new Date());
                          const isDisabled = day < new Date(new Date().setHours(0, 0, 0, 0)) || !workingDays.includes(getDay(day)) || disabledDates.includes(format(day, 'yyyy-MM-dd'));
                          return (
                            <motion.button
                              key={day.toISOString()}
                              onClick={() => !isDisabled && handleDateSelect(day)}
                              disabled={isDisabled}
                              whileTap={isDisabled ? undefined : { scale: 0.88 }}
                              animate={{ scale: isSelected ? 1.04 : 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 28 }}
                              className={cn(
                                "relative aspect-square flex items-center justify-center text-[14px] font-medium rounded-full min-h-[42px]",
                                isSelected
                                  ? "text-white font-semibold"
                                  : isDisabled || !isCurrentMonth
                                  ? "text-gray-300 dark:text-[#48484A] cursor-not-allowed"
                                  : "text-gray-900 dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                              )}
                              style={isSelected ? { backgroundColor: accentColor, boxShadow: `0 8px 20px -8px ${accentColor}` } : {}}
                            >
                              {format(day, 'd')}
                              {isToday && !isSelected && (
                                <span className="absolute bottom-1.5 h-1 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                      {selectedDate && (
                        <p className="text-sm text-gray-500 dark:text-[#8E8E93] mt-4">
                          {fmt(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Time slots */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedDate ? fmt(selectedDate, 'EEE dd') : copy.selectDate}
                        </h4>
                        <div className="flex gap-0.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full p-0.5">
                          <button
                            onClick={() => setTimeFormat("12h")}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                              timeFormat === "12h" ? "bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            12h
                          </button>
                          <button
                            onClick={() => setTimeFormat("24h")}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                              timeFormat === "24h" ? "bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-white"
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
                      <div className="flex-1">
                        {selectedDate ? (
                          railSlots.some((slot) => slot.available) ? (
                            <SlotRail
                              slots={railSlots}
                              value={selectedTime}
                              onSelect={setSelectedTime}
                              accentColor={accentColor}
                              onAvailabilityChange={setRailOnOpenSlot}
                            />
                          ) : (
                            <div className="text-center text-gray-500 dark:text-[#8E8E93] py-8 text-sm">
                              {copy.noTimes}
                            </div>
                          )
                        ) : (
                          <div className="text-center text-[#8E8E93] py-8 text-sm">
                            {copy.selectDateForTimes}
                          </div>
                        )}
                        {selectedDate && selectedTime && totalDuration > 30 && (
                          <p className="mt-2 text-[12px] text-[#8E8E93] tabular-nums">
                            {formatTime(selectedTime)} → {formatTime(getEndTime(selectedTime, totalDuration))}
                          </p>
                        )}
                      </div>
                      {selectedDate && railSlots.some((slot) => slot.available) && selectedTime && railOnOpenSlot && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/85 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 dark:from-[#0A0A0C] dark:via-[#0A0A0C]/85 sm:pointer-events-auto sm:static sm:bg-none sm:px-0 sm:pb-0 sm:pt-4"
                        >
                          <div
                            className="pointer-events-auto mx-auto max-w-md"
                            style={{ filter: `drop-shadow(0 10px 24px ${accentColor}40)` }}
                          >
                            <BookingButton
                              text={copy.continue}
                              onClick={handleContinue}
                              disabled={!selectedTime}
                              className="!h-12 !rounded-full"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === "stylist" && selectedService && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.selectStylist}</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-white transition flex items-center gap-1"
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
                          <motion.button
                            key={stylist.id}
                            onClick={() => handleStylistSelect(stylist.id)}
                            whileTap={{ scale: 0.985 }}
                            className={cn(
                              "w-full p-4 rounded-[22px] border text-left transition-colors bg-black/[0.02] dark:bg-white/[0.03] flex items-center gap-3.5",
                              !active && "border-black/[0.05] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                            )}
                            style={active ? { borderColor: accentColor, backgroundColor: `${accentColor}12` } : {}}
                          >
                            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#2C2C2E] overflow-hidden flex items-center justify-center text-lg font-semibold text-gray-900 dark:text-white shrink-0">
                              {stylist.avatar_url ? (
                                <img src={stylist.avatar_url} alt={stylist.name} className="h-full w-full object-cover" />
                              ) : (
                                stylist.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 dark:text-white font-semibold truncate">{stylist.name}</p>
                              <p className="text-gray-500 dark:text-[#8E8E93] text-sm truncate">{stylist.title || copy.stylist}</p>
                            </div>
                            {active && (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: accentColor }}
                              >
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </motion.button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-[#8E8E93] mb-4">{copy.noStylists}</p>
                        <Button
                          onClick={handleBack}
                          variant="outline"
                          className="rounded-full border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2E]"
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
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{copy.details}</h2>
                    </div>
                    <button
                      onClick={handleBack}
                      className="text-sm text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-white transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {copy.back}
                    </button>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-24 sm:pb-0">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[20px] bg-white dark:bg-[#121215] border border-black/[0.05] dark:border-white/[0.06] p-4"
                      >
                        <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:text-[#8E8E93] font-semibold mb-3">
                          {selectedServices.length > 1 ? copy.selectedServices : copy.selectedService}
                        </p>

                        <div className="space-y-1.5">
                          {selectedServices.map((service) => (
                            <div key={service.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-900 dark:text-white font-medium truncate">{service.name}</span>
                              <span className="text-gray-500 dark:text-[#8E8E93] tabular-nums shrink-0">
                                {service.duration} {copy.mins} · {formatCurrency(service.price)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 space-y-1.5 border-t border-black/[0.05] dark:border-white/[0.06] pt-3 text-[13px] text-gray-500 dark:text-[#8E8E93]">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                            <span>{selectedDate ? fmt(selectedDate, "EEEE, MMMM d, yyyy") : "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                            <span className="tabular-nums">
                              {selectedTime
                                ? `${formatTime(selectedTime)} → ${formatTime(getEndTime(selectedTime, totalDuration))} · ${totalDuration} ${copy.mins}`
                                : "—"}
                            </span>
                          </div>
                          {selectedStylist && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                              <span className="truncate">
                                {selectedStylist.name}
                                {selectedStylist.title ? ` · ${selectedStylist.title}` : ""}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                            <span className="truncate">{businessProfile?.address || copy.inPerson}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                            <span>{formatTzLabel(timezone)}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] dark:border-white/[0.06] pt-3">
                          <span className="text-sm text-gray-500 dark:text-[#8E8E93]">{copy.total}</span>
                          <span className="text-gray-900 dark:text-white font-bold tabular-nums">{formatCurrency(totalPrice)}</span>
                        </div>
                      </motion.div>

                      {submitError && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl bg-red-50 dark:bg-[#FF2D46]/10 border border-red-200 dark:border-[#FF2D46]/20 p-3.5 text-sm text-red-600 dark:text-[#FF5A6E]"
                        >
                          {submitError}
                        </motion.div>
                      )}
                      <FormField
                        control={form.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-500 dark:text-[#8E8E93] text-sm">{copy.name}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-[#8E8E93]" />
                                <Input
                                  {...field}
                                  className="w-full pl-10 pr-3 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#636366] focus:border-black/20 dark:focus:border-white/25 focus:bg-white dark:focus:bg-white/[0.06] focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
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
                            <FormLabel className="text-gray-500 dark:text-[#8E8E93] text-sm">{copy.email}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="w-full px-4 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#636366] focus:border-black/20 dark:focus:border-white/25 focus:bg-white dark:focus:bg-white/[0.06] focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
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
                              <FormLabel className="text-gray-500 dark:text-[#8E8E93] text-sm">{copy.phone}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full px-4 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#636366] focus:border-black/20 dark:focus:border-white/25 focus:bg-white dark:focus:bg-white/[0.06] focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
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
                              <FormLabel className="text-gray-500 dark:text-[#8E8E93] text-sm">{copy.notes}</FormLabel>
                              <FormControl>
                                <textarea
                                  {...field}
                                  rows={3}
                                  className="w-full px-4 py-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#636366] focus:outline-none focus:border-black/20 dark:focus:border-white/25 focus:bg-white dark:focus:bg-white/[0.06] resize-none transition-colors"
                                  placeholder={copy.notesPh}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {paymentsEnabled && !rescheduleAppointment && (
                        <div className="space-y-2">
                          <p className="text-gray-500 dark:text-[#8E8E93] text-sm">Payment</p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: "shop" as const, label: "Pay at shop", icon: MapPin },
                              { key: "card" as const, label: "Pay now by card", icon: CreditCard },
                            ]).map(({ key, label, icon: Icon }) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setPayMethod(key)}
                                className={cn(
                                  "flex items-center gap-2 h-12 px-3.5 rounded-2xl border text-sm font-medium transition active:scale-[0.97]",
                                  payMethod === key
                                    ? "text-white border-transparent"
                                    : "border-transparent bg-black/[0.03] dark:bg-white/[0.04] text-gray-900 dark:text-white",
                                )}
                                style={payMethod === key ? { backgroundColor: accentColor } : undefined}
                              >
                                <Icon className="w-4 h-4" />
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/85 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 dark:from-[#0A0A0C] dark:via-[#0A0A0C]/85 sm:pointer-events-auto sm:static sm:bg-none sm:px-0 sm:pb-0 sm:pt-4"
                      >
                        <div
                          className="pointer-events-auto mx-auto max-w-md"
                          style={{ filter: `drop-shadow(0 10px 24px ${accentColor}40)` }}
                        >
                          <BookingButton
                            type="button"
                            text={isLoading ? copy.processing : rescheduleAppointment ? copy.confirmChange : submitLabel || copy.book}
                            disabled={isLoading}
                            onClick={() => { form.handleSubmit(handleSubmit)(); }}
                            className="!h-12 !rounded-full"
                          />
                        </div>
                      </motion.div>
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
