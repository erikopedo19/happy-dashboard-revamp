import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  Clock3,
  Crown,
  Heart,
  Languages,
  Link2,
  Loader2,
  Scissors,
  Sparkles,
  Star,
  Tag,
  UserRound,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingVisibility } from "@/contexts/OnboardingContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

const STEPS = [
  { title: "Choose your language", subtitle: "This sets the app and public booking language.", icon: Languages },
  { title: "Create your booking link", subtitle: "Keep it short. This is the link you will share with clients.", icon: Link2 },
  { title: "Add your stylist", subtitle: "Add the first person clients can book. You can add more later.", icon: UserRound },
  { title: "Create your first service", subtitle: "Set the name, duration, price, icon and color.", icon: Scissors },
  { title: "Set your working hours", subtitle: "Choose the days and times clients can book.", icon: Clock3 },
  { title: "Turn on smart features", subtitle: "Small automations that protect your time and reward regulars.", icon: Sparkles },
];

const SERVICE_ICONS = [
  { name: "Scissors", Icon: Scissors },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Crown", Icon: Crown },
  { name: "Star", Icon: Star },
  { name: "Heart", Icon: Heart },
  { name: "Tag", Icon: Tag },
  { name: "Clock3", Icon: Clock3 },
];

const SERVICE_COLORS = [
  "#FF2D55",
  "#34C759",
  "#5856D6",
  "#FF9500",
  "#AF52DE",
  "#0A84FF",
  "#FF3B30",
  "#FFCC00",
];

const CURRENCY_BY_LOCALE: Record<string, string> = {
  en: "GBP",
  el: "EUR",
  es: "EUR",
  pl: "PLN",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  PLN: "zł",
  RON: "lei",
  GBP: "£",
};

const cleanSlug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

export function FirstLoginOnboarding({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState<"en" | "el" | "es" | "pl">("en");
  const currency = useMemo(() => CURRENCY_BY_LOCALE[language] || "EUR", [language]);
  const currencySymbol = CURRENCY_SYMBOLS[currency] || "€";
  const [bookingLink, setBookingLink] = useState(() => cleanSlug(user?.email?.split("@")[0] || "my-chair"));
  const [stylistName, setStylistName] = useState("");
  const [serviceName, setServiceName] = useState("Haircut");
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState(25);
  const [serviceIcon, setServiceIcon] = useState("Scissors");
  const [serviceColor, setServiceColor] = useState("#FF2D55");
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("18:00");
  const [cancellationAlerts, setCancellationAlerts] = useState(true);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(true);
  const { setIsOpen } = useOnboardingVisibility();

  useEffect(() => {
    setIsOpen(true);
    return () => setIsOpen(false);
  }, [setIsOpen]);

  useLayoutEffect(() => {
    if (!stageRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-onboarding-item]",
        { opacity: 0, y: 18, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.055, ease: "power3.out" },
      );
    }, stageRef);
    return () => context.revert();
  }, [step]);

  const canContinue = useMemo(() => {
    if (step === 1) return bookingLink.length >= 2;
    if (step === 3) return serviceName.trim().length >= 2 && serviceDuration >= 5 && servicePrice >= 0;
    if (step === 4) return workingDays.length > 0 && startHour < endHour;
    return true;
  }, [step, bookingLink, serviceName, serviceDuration, servicePrice, workingDays, startHour, endHour]);

  const toggleDay = (day: number) => {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    );
  };

  const finish = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      let finalSlug = cleanSlug(bookingLink);
      for (let index = 0; index < 10; index += 1) {
        const { data: taken } = await (supabase as any)
          .from("profiles")
          .select("id")
          .eq("booking_link", finalSlug)
          .neq("id", user.id)
          .maybeSingle();
        if (!taken) break;
        finalSlug = `${cleanSlug(bookingLink)}-${index + 2}`;
      }

      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          booking_locale: language,
          currency,
          booking_link: finalSlug,
          notify_cancellation_alerts: cancellationAlerts,
          loyalty_discount_enabled: loyaltyDiscount,
          loyalty_discount_percent: 20,
          onboarding_completed: true,
          is_public: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { data: existingServices } = await (supabase as any)
        .from("services")
        .select("id, name")
        .eq("user_id", user.id)
        .is("deleted_at", null);
      if (!(existingServices || []).some((service: any) => service.name.toLowerCase() === serviceName.trim().toLowerCase())) {
        const { error } = await (supabase as any).from("services").insert({
          user_id: user.id,
          name: serviceName.trim(),
          duration: serviceDuration,
          price: servicePrice,
          icon: serviceIcon,
          color: serviceColor,
          border_color: serviceColor,
          text_color: "#FFFFFF",
        });
        if (error) throw error;
      }

      if (stylistName.trim()) {
        const { data: existingStylist } = await (supabase as any)
          .from("stylists")
          .select("id")
          .eq("user_id", user.id)
          .ilike("name", stylistName.trim())
          .maybeSingle();
        if (!existingStylist) {
          const { error } = await (supabase as any).from("stylists").insert({
            user_id: user.id,
            name: stylistName.trim(),
            title: "Stylist",
            is_public: true,
          });
          if (error) throw error;
        }
      }

      const { error: agendaError } = await (supabase as any).from("agenda_settings").upsert(
        {
          user_id: user.id,
          start_hour: startHour,
          end_hour: endHour,
          working_days: workingDays,
          service_duration: serviceDuration,
        },
        { onConflict: "user_id" },
      );
      if (agendaError) throw agendaError;

      await (supabase as any).from("business_hours").delete().eq("user_id", user.id);
      const { error: hoursError } = await (supabase as any).from("business_hours").insert(
        DAYS.map((day) => ({
          user_id: user.id,
          day_of_week: day.value,
          open_time: startHour,
          close_time: endHour,
          is_closed: !workingDays.includes(day.value),
        })),
      );
      if (hoursError) throw hoursError;

      localStorage.setItem("cutzio_app_language", language);
      document.documentElement.lang = language;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["agenda-settings", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["settings-page-data", user.id] }),
      ]);
      toast({ title: "Your workspace is ready", description: `Booking link: /book/${finalSlug}` });
      onComplete();
    } catch (error: any) {
      toast({ title: "Setup could not be saved", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canContinue) return;
    if (step === STEPS.length - 1) finish();
    else setStep((current) => current + 1);
  };

  const Icon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col overflow-hidden bg-[#09090B] text-white">
      <header className="mx-auto w-full max-w-lg px-5 pb-3 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#FF375F]">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {step + 1} of {STEPS.length}
          </span>
        </div>
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((item, index) => (
            <div key={item.title} className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-[#FF375F]" : "bg-white/10")} />
          ))}
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-5 pb-5 pt-5">
        <div ref={stageRef}>
          <div data-onboarding-item>
            <h1 className="max-w-sm text-[32px] font-bold leading-[1.04] tracking-[-0.04em]">{STEPS[step].title}</h1>
            <p className="mt-2 max-w-sm text-[13px] leading-5 text-white/45">{STEPS[step].subtitle}</p>
          </div>

          <div data-onboarding-item className="mt-7">
            {step === 0 && (
              <div className="grid gap-3">
                <Choice active={language === "en"} title="English" detail="App and booking pages in English" onClick={() => setLanguage("en")} />
                <Choice active={language === "el"} title="Ελληνικά" detail="Η εφαρμογή και οι κρατήσεις στα Ελληνικά" onClick={() => setLanguage("el")} />
                <Choice active={language === "es"} title="Español" detail="La aplicación y las reservas en español" onClick={() => setLanguage("es")} />
                <Choice active={language === "pl"} title="Polski" detail="Aplikacja i rezerwacje po polsku" onClick={() => setLanguage("pl")} />
              </div>
            )}

            {step === 1 && (
              <div className="rounded-[28px] bg-[#1C1C1E] p-4">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">Your public URL</label>
                <div className="mt-3 flex h-14 items-center rounded-[18px] bg-[#2C2C2E] px-4">
                  <span className="text-[13px] text-white/35">cutzioo.com/book/</span>
                  <input value={bookingLink} onChange={(event) => setBookingLink(cleanSlug(event.target.value))} className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none" />
                </div>
                <p className="mt-3 text-[11px] text-white/35">Only letters, numbers and dashes. We add a number if the link is taken.</p>
              </div>
            )}

            {step === 2 && (
              <div className="rounded-[28px] bg-[#1C1C1E] p-4">
                <FieldLabel>Stylist name</FieldLabel>
                <DarkInput value={stylistName} onChange={setStylistName} placeholder="e.g. Alex" />
                <p className="mt-3 text-[11px] text-white/35">Leave empty if it is only you. You can add the whole team from Stylists later.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 rounded-[28px] bg-[#1C1C1E] p-4">
                <div><FieldLabel>Service</FieldLabel><DarkInput value={serviceName} onChange={setServiceName} placeholder="Haircut" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>Minutes</FieldLabel><DarkInput type="number" value={serviceDuration.toString()} onChange={(value) => setServiceDuration(Number(value))} /></div>
                  <div><FieldLabel>Price {currencySymbol}</FieldLabel><DarkInput type="number" value={servicePrice.toString()} onChange={(value) => setServicePrice(Number(value))} /></div>
                </div>
                <div>
                  <FieldLabel>Icon</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_ICONS.map(({ name, Icon }) => {
                      const selected = serviceIcon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setServiceIcon(name)}
                          className={cn(
                            "h-11 w-11 rounded-xl border transition-all",
                            selected
                              ? "border-white/40 bg-white/10 text-white"
                              : "border-transparent bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <Icon className="mx-auto h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <FieldLabel>Color</FieldLabel>
                  <div className="flex flex-wrap gap-3">
                    {SERVICE_COLORS.map((color) => {
                      const selected = serviceColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setServiceColor(color)}
                          className={cn(
                            "h-10 w-10 rounded-full border-2 transition-transform",
                            selected ? "border-white scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 rounded-[28px] bg-[#1C1C1E] p-4">
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS.map((day, index) => (
                    <button key={`${day.value}-${index}`} type="button" onClick={() => toggleDay(day.value)} className={cn("aspect-square rounded-full text-[12px] font-bold", workingDays.includes(day.value) ? "bg-[#FF375F] text-white" : "bg-[#2C2C2E] text-white/35")}>{day.label}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>Opens</FieldLabel><DarkInput type="time" value={startHour} onChange={setStartHour} /></div>
                  <div><FieldLabel>Closes</FieldLabel><DarkInput type="time" value={endHour} onChange={setEndHour} /></div>
                </div>
                {startHour >= endHour && <p className="text-[11px] text-[#FF6B84]">Closing time must be later than opening time.</p>}
              </div>
            )}

            {step === 5 && (
              <div className="grid gap-3">
                <FeatureCard icon={BellRing} title="Cancellation alerts" detail="Get an instant notification when a client cancels, so you can refill the slot fast." checked={cancellationAlerts} onChange={setCancellationAlerts} />
                <FeatureCard icon={Tag} title="Loyal regular discount" detail="Clients with more than one booking in seven days automatically receive 20% off their next booking." checked={loyaltyDiscount} onChange={setLoyaltyDiscount} />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-lg gap-3 border-t border-white/[0.06] bg-[#09090B] px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
        {step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#1C1C1E] text-white"><ArrowLeft className="h-5 w-5" /></button>}
        <button type="button" onClick={next} disabled={!canContinue || saving} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[20px] bg-[#FF375F] text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-40">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : step === STEPS.length - 1 ? <><Check className="h-5 w-5" /> Finish setup</> : <>Continue <ArrowRight className="h-5 w-5" /></>}
        </button>
      </footer>
    </div>
  );
}

function Choice({ active, title, detail, onClick }: { active: boolean; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex min-h-20 items-center gap-4 rounded-[24px] p-4 text-left", active ? "bg-[#FF375F]" : "bg-[#1C1C1E]")}><div className={cn("flex h-7 w-7 items-center justify-center rounded-full", active ? "bg-white text-[#FF375F]" : "bg-[#2C2C2E] text-transparent")}><Check className="h-4 w-4" /></div><div><p className="text-[16px] font-bold">{title}</p><p className={cn("mt-0.5 text-[11px]", active ? "text-white/75" : "text-white/40")}>{detail}</p></div></button>;
}

function FeatureCard({ icon: Icon, title, detail, checked, onChange }: { icon: typeof BellRing; title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={cn("rounded-[26px] p-4 text-left", checked ? "bg-[#24141A] ring-1 ring-[#FF375F]/40" : "bg-[#1C1C1E]")}><div className="flex items-start gap-3"><div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px]", checked ? "bg-[#FF375F]" : "bg-[#2C2C2E]")}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-[15px] font-bold">{title}</p><div className={cn("h-7 w-12 rounded-full p-1", checked ? "bg-[#FF375F]" : "bg-[#3A3A3C]")}><div className={cn("h-5 w-5 rounded-full bg-white transition-transform", checked && "translate-x-5")} /></div></div><p className="mt-1 text-[11px] leading-4 text-white/40">{detail}</p></div></div></button>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">{children}</label>;
}

function DarkInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-14 w-full rounded-[18px] border-0 bg-[#2C2C2E] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/25 focus:ring-2 focus:ring-[#FF375F] [color-scheme:dark]" />;
}
