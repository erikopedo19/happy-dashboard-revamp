import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2, MapPin, Users, User as UserIcon, Briefcase,
  Calendar, ArrowRight, ArrowLeft, Sparkles, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WorkType = "solo" | "team";

interface OnboardingData {
  workType: WorkType | null;
  businessName: string;
  yearsExperience: string;
  address: string;
  city: string;
  description: string;
  services: string[];
  workingDays: number[];
  startHour: string;
  endHour: string;
}

const DAYS = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" },
  { n: 4, label: "Thu" }, { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 0, label: "Sun" },
];

const PRESET_SERVICES = [
  "Haircut", "Beard Trim", "Fade", "Shave",
  "Hair Color", "Kids Cut", "Styling", "Wash",
];

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    workType: null,
    businessName: "",
    yearsExperience: "",
    address: "",
    city: "",
    description: "",
    services: [],
    workingDays: [1, 2, 3, 4, 5],
    startHour: "09:00",
    endHour: "18:00",
  });

  const totalSteps = 4;

  useEffect(() => {
    if (!user) return;
    const role = user.user_metadata?.role;
    if (!role) {
      navigate("/choose-role", { replace: true });
      return;
    }
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_completed) navigate("/admin", { replace: true });
      });
  }, [user, navigate]);

  const update = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) =>
    setData((p) => ({ ...p, [k]: v }));

  const toggleService = (s: string) =>
    update("services", data.services.includes(s) ? data.services.filter((x) => x !== s) : [...data.services, s]);

  const toggleDay = (n: number) =>
    update("workingDays", data.workingDays.includes(n) ? data.workingDays.filter((x) => x !== n) : [...data.workingDays, n].sort());

  const canNext = () => {
    if (step === 0) return data.workType !== null;
    if (step === 1) return data.businessName.trim().length > 1;
    if (step === 2) return true; // location optional
    if (step === 3) return data.workingDays.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) {
      toast.error("Please complete this step");
      return;
    }
    if (step < totalSteps - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const fullAddress = [data.address, data.city].filter(Boolean).join(", ");
      const years = parseInt(data.yearsExperience) || null;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.businessName,
          business_name: data.businessName,
          address: fullAddress || null,
          description: data.description || null,
          years_experience: years,
          is_public: true,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
      if (profileError) throw profileError;

      // Services
      if (data.services.length > 0) {
        await supabase.from("services").insert(
          data.services.map((name) => ({
            user_id: user.id, name, duration: 30, price: 25,
          }))
        );
      }

      // Business hours — replace existing
      try {
        await supabase.from("business_hours").delete().eq("user_id", user.id);
        const hoursRows = DAYS.map((d) => ({
          user_id: user.id,
          day_of_week: d.n,
          open_time: data.startHour,
          close_time: data.endHour,
          is_closed: !data.workingDays.includes(d.n),
        }));
        await supabase.from("business_hours").insert(hoursRows);
      } catch (e) { console.warn("business_hours save skipped", e); }

      // Agenda defaults
      try {
        await supabase.from("agenda_settings").delete().eq("user_id", user.id);
        await supabase.from("agenda_settings").insert({
          user_id: user.id,
          start_hour: data.startHour,
          end_hour: data.endHour,
          working_days: data.workingDays,
        } as any);
      } catch (e) { console.warn("agenda_settings save skipped", e); }

      toast.success("Welcome to Cutzio!", { description: "Your profile is ready." });
      navigate("/admin", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error("Could not save profile", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-brand text-foreground">
      {/* Ambient rose blurs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-rose shadow-rose">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Setup</p>
            <h1 className="text-base font-semibold">Welcome to Cutzio</h1>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
            <motion.div
              className="h-full rounded-full bg-gradient-rose"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {step === 0 && (
                <>
                  <Header title="How do you work?" subtitle="We'll tailor your setup based on this." />
                  <div className="grid gap-3">
                    <ChoiceCard
                      active={data.workType === "solo"}
                      onClick={() => update("workType", "solo")}
                      icon={<UserIcon className="h-5 w-5" />}
                      title="Solo Barber"
                      desc="Just me — independent chair."
                    />
                    <ChoiceCard
                      active={data.workType === "team"}
                      onClick={() => update("workType", "team")}
                      icon={<Users className="h-5 w-5" />}
                      title="Team / Barbershop"
                      desc="I run or work with a team."
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <Header
                    title={data.workType === "team" ? "Your barbershop" : "Your barber identity"}
                    subtitle="A little about who you are."
                  />
                  <Field label={data.workType === "team" ? "Barbershop name" : "Your name / brand"} icon={<Building2 className="h-4 w-4" />}>
                    <Input
                      value={data.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                      placeholder={data.workType === "team" ? "e.g. Elite Cuts" : "e.g. Marco Rossi"}
                    />
                  </Field>
                  <Field label="Years of experience" icon={<Briefcase className="h-4 w-4" />}>
                    <Input
                      type="number" min={0} max={70}
                      value={data.yearsExperience}
                      onChange={(e) => update("yearsExperience", e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </Field>
                  <Field label="Short bio (optional)">
                    <Textarea
                      value={data.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="What makes your work special?"
                      rows={3}
                      maxLength={400}
                    />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Header title="Where are you located?" subtitle="Helps clients find you on the map." />
                  <Field label="Address" icon={<MapPin className="h-4 w-4" />}>
                    <Input
                      value={data.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={data.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="New York"
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    You can fine-tune your location on the map later from Settings.
                  </p>
                </>
              )}

              {step === 3 && (
                <>
                  <Header title="Services & hours" subtitle="Pick what you offer and when you work." />
                  <div className="space-y-3">
                    <Label className="text-sm">Services</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_SERVICES.map((s) => {
                        const active = data.services.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleService(s)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95",
                              active
                                ? "border-transparent bg-gradient-rose text-white shadow-rose"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Working days
                    </Label>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS.map((d) => {
                        const active = data.workingDays.includes(d.n);
                        return (
                          <button
                            key={d.n}
                            type="button"
                            onClick={() => toggleDay(d.n)}
                            className={cn(
                              "h-10 rounded-xl text-xs font-semibold transition-all active:scale-95",
                              active
                                ? "bg-gradient-rose text-white shadow-rose"
                                : "bg-card text-muted-foreground border border-border"
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Opens">
                      <Input type="time" value={data.startHour} onChange={(e) => update("startHour", e.target.value)} />
                    </Field>
                    <Field label="Closes">
                      <Input type="time" value={data.endHour} onChange={(e) => update("endHour", e.target.value)} />
                    </Field>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center gap-3 pt-4">
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={submitting}
              className="flex-shrink-0"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canNext() || submitting}
            className="ml-auto flex-1 bg-gradient-rose text-white shadow-rose hover:opacity-95 h-12 rounded-2xl text-sm font-semibold"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === totalSteps - 1 ? (
              <>Finish <Check className="ml-1 h-4 w-4" /></>
            ) : (
              <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="space-y-1.5">
    <h2 className="text-2xl font-semibold tracking-tight animate-fade-in-up">{title}</h2>
    <p className="text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "60ms" }}>{subtitle}</p>
  </div>
);

const Field = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      {icon}{label}
    </Label>
    {children}
  </div>
);

const ChoiceCard = ({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group relative flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99]",
      active
        ? "border-primary bg-primary/10 shadow-rose"
        : "border-border bg-card hover:border-primary/40"
    )}
  >
    <div className={cn(
      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
      active ? "bg-gradient-rose text-white shadow-rose" : "bg-secondary text-muted-foreground"
    )}>
      {icon}
    </div>
    <div className="flex-1 pt-0.5">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
    {active && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-rose text-white"
      >
        <Check className="h-3.5 w-3.5" />
      </motion.div>
    )}
  </button>
);

export default CompleteProfile;
