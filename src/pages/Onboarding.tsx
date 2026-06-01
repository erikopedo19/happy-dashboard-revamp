import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Scissors, User as UserIcon, Users, Building2, Briefcase,
  MapPin, Calendar, ArrowRight, ArrowLeft, Check, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ONBOARDING_STORAGE_KEY = "cutzio_onboarding_v1";

export type OnboardingDraft = {
  role: "barber" | "client" | null;
  workType: "solo" | "team" | null;
  businessName: string;
  yearsExperience: string;
  address: string;
  city: string;
  description: string;
  services: string[];
  workingDays: number[];
  startHour: string;
  endHour: string;
  // Barber extras
  goal: "grow" | "organize" | "fill_slots" | "solo" | null;
  heardFrom: "instagram" | "tiktok" | "friend" | "search" | "other" | null;
  acceptsWaitlist: boolean;
  // Client extras
  clientLookingFor: string[];
  clientBudget: "low" | "mid" | "premium" | null;
  clientRadiusKm: number;
  clientFullName: string;
};

const DEFAULT_DRAFT: OnboardingDraft = {
  role: null,
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
  goal: null,
  heardFrom: null,
  acceptsWaitlist: true,
  clientLookingFor: [],
  clientBudget: null,
  clientRadiusKm: 10,
  clientFullName: "",
};

const DAYS = [
  { n: 1, l: "Mon" }, { n: 2, l: "Tue" }, { n: 3, l: "Wed" },
  { n: 4, l: "Thu" }, { n: 5, l: "Fri" }, { n: 6, l: "Sat" }, { n: 0, l: "Sun" },
];

const PRESET_SERVICES = [
  "Haircut", "Beard Trim", "Fade", "Shave",
  "Hair Color", "Kids Cut", "Styling", "Wash",
];

const CLIENT_LOOKING = ["Haircut", "Beard Trim", "Fade", "Shave", "Hair Color", "Styling"];
const GOALS: { k: OnboardingDraft["goal"]; label: string; desc: string }[] = [
  { k: "grow", label: "Grow my clientele", desc: "Get discovered by new clients." },
  { k: "organize", label: "Organize my agenda", desc: "Stop juggling DMs and missed bookings." },
  { k: "fill_slots", label: "Fill empty slots", desc: "Use the waitlist when someone cancels." },
  { k: "solo", label: "Just go solo", desc: "Simple booking for my regulars." },
];
const HEARD: { k: OnboardingDraft["heardFrom"]; label: string }[] = [
  { k: "instagram", label: "Instagram" }, { k: "tiktok", label: "TikTok" },
  { k: "friend", label: "A friend" }, { k: "search", label: "Google" }, { k: "other", label: "Other" },
];
const BUDGETS: { k: OnboardingDraft["clientBudget"]; label: string; desc: string }[] = [
  { k: "low", label: "$", desc: "Best value" },
  { k: "mid", label: "$$", desc: "Mid-range" },
  { k: "premium", label: "$$$", desc: "Premium" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetRole = params.get("role") as "barber" | "client" | null;

  const [data, setData] = useState<OnboardingDraft>(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const base = raw ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) } : DEFAULT_DRAFT;
      return presetRole ? { ...base, role: presetRole } : base;
    } catch {
      return presetRole ? { ...DEFAULT_DRAFT, role: presetRole } : DEFAULT_DRAFT;
    }
  });

  // If role is preset via URL, skip the role-selection step
  const [step, setStep] = useState(presetRole ? 1 : 0);

  useEffect(() => {
    try { localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  const update = <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) =>
    setData((p) => ({ ...p, [k]: v }));

  const isClient = data.role === "client";
  const steps = isClient ? 4 : 7;

  const canNext = () => {
    if (step === 0) return data.role !== null;
    if (isClient) {
      if (step === 1) return data.clientLookingFor.length > 0;
      if (step === 2) return data.clientBudget !== null;
      if (step === 3) return true; // name optional
      return true;
    }
    if (step === 1) return data.workType !== null;
    if (step === 2) return data.businessName.trim().length > 1;
    if (step === 3) return true;
    if (step === 4) return data.workingDays.length > 0;
    if (step === 5) return data.goal !== null;
    if (step === 6) return true;
    return true;
  };

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data)); } catch {}
    navigate("/auth?mode=signup", { replace: true });
  };

  const handleNext = () => {
    if (!canNext()) return;
    const last = steps - 1;
    if (step < last) setStep(step + 1);
    else finish();
  };


  const progress = ((step + 1) / steps) * 100;

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-gradient-to-br from-[#0a0203] via-[#1a0509] to-[#0a0a1f] text-white">
      {/* Apple-style ambient blurs (rose + blue) */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-rose-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-col px-4 pt-4 pb-[env(safe-area-inset-bottom)] sm:px-5 sm:pt-6">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-lg shadow-rose-900/40">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Welcome</p>
              <h1 className="text-base font-semibold tracking-tight">Cutzio</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-xs font-medium text-white/60 hover:text-white transition"
          >
            Sign in
          </button>
        </div>

        {/* Progress */}
        <div className="mb-3 sm:mb-5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/50">
            <span>Step {step + 1} of {steps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-blue-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* Steps (internal scroll only if needed) */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step + (isClient ? "-c" : "-b")}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4 sm:space-y-6 pb-2"
            >
              {step === 0 && (
                <>
                  <Header
                    title="Let's get you set up"
                    subtitle="A few quick questions — no account needed yet."
                  />
                  <div className="grid gap-3">
                    <RoleCard
                      active={data.role === "barber"}
                      onClick={() => update("role", "barber")}
                      icon={<Scissors className="h-5 w-5" />}
                      title="I'm a Barber"
                      desc="I want to manage bookings and grow my chair."
                    />
                    <RoleCard
                      active={data.role === "client"}
                      onClick={() => update("role", "client")}
                      icon={<UserIcon className="h-5 w-5" />}
                      title="I'm a Client"
                      desc="I want to find and book a barber nearby."
                    />
                  </div>
                </>
              )}

              {!isClient && step === 1 && (
                <>
                  <Header title="How do you work?" subtitle="We'll tailor your setup." />
                  <div className="grid gap-3">
                    <RoleCard
                      active={data.workType === "solo"}
                      onClick={() => update("workType", "solo")}
                      icon={<UserIcon className="h-5 w-5" />}
                      title="Solo Barber"
                      desc="Independent chair, just me."
                    />
                    <RoleCard
                      active={data.workType === "team"}
                      onClick={() => update("workType", "team")}
                      icon={<Users className="h-5 w-5" />}
                      title="Team / Barbershop"
                      desc="I run or work with a team."
                    />
                  </div>
                </>
              )}

              {!isClient && step === 2 && (
                <>
                  <Header
                    title={data.workType === "team" ? "Your barbershop" : "Your barber identity"}
                    subtitle="A little about who you are."
                  />
                  <Field label={data.workType === "team" ? "Barbershop name" : "Your name / brand"} icon={<Building2 className="h-4 w-4" />}>
                    <DarkInput
                      value={data.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                      placeholder={data.workType === "team" ? "e.g. Elite Cuts" : "e.g. Marco Rossi"}
                    />
                  </Field>
                  <Field label="Years of experience" icon={<Briefcase className="h-4 w-4" />}>
                    <DarkInput
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
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-rose-500/40"
                    />
                  </Field>
                </>
              )}

              {!isClient && step === 3 && (
                <>
                  <Header title="Where are you located?" subtitle="Helps clients find you. You can change this later." />
                  <Field label="Address" icon={<MapPin className="h-4 w-4" />}>
                    <DarkInput
                      value={data.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </Field>
                  <Field label="City">
                    <DarkInput
                      value={data.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="New York"
                    />
                  </Field>
                </>
              )}

              {!isClient && step === 4 && (
                <>
                  <Header title="Services & hours" subtitle="Pick what you offer and when you work." />
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-white/50">Services</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_SERVICES.map((s) => {
                        const active = data.services.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              update("services", active ? data.services.filter((x) => x !== s) : [...data.services, s])
                            }
                            className={cn(
                              "rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95",
                              active
                                ? "border-transparent bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-900/30"
                                : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                            )}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-xs uppercase tracking-wider text-white/50 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Working days
                    </Label>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS.map((d) => {
                        const active = data.workingDays.includes(d.n);
                        return (
                          <button
                            key={d.n}
                            type="button"
                            onClick={() =>
                              update(
                                "workingDays",
                                active ? data.workingDays.filter((x) => x !== d.n) : [...data.workingDays, d.n].sort()
                              )
                            }
                            className={cn(
                              "h-10 rounded-xl text-[11px] font-semibold transition-all active:scale-95",
                              active
                                ? "bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-900/30"
                                : "bg-white/5 text-white/50 border border-white/10"
                            )}
                          >
                            {d.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Opens">
                      <DarkInput type="time" value={data.startHour} onChange={(e) => update("startHour", e.target.value)} />
                    </Field>
                    <Field label="Closes">
                      <DarkInput type="time" value={data.endHour} onChange={(e) => update("endHour", e.target.value)} />
                    </Field>
                  </div>
                </>
              )}

              {!isClient && step === 5 && (
                <>
                  <Header title="What's your main goal?" subtitle="We'll highlight the right features for you." />
                  <div className="grid gap-3">
                    {GOALS.map((g) => (
                      <RoleCard
                        key={g.k!}
                        active={data.goal === g.k}
                        onClick={() => update("goal", g.k)}
                        icon={<Sparkles className="h-5 w-5" />}
                        title={g.label}
                        desc={g.desc}
                      />
                    ))}
                  </div>
                </>
              )}

              {!isClient && step === 6 && (
                <>
                  <Header title="One last thing" subtitle="How did you find us?" />
                  <div className="flex flex-wrap gap-2">
                    {HEARD.map((h) => {
                      const active = data.heardFrom === h.k;
                      return (
                        <button
                          key={h.k!}
                          type="button"
                          onClick={() => update("heardFrom", h.k)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95",
                            active
                              ? "border-transparent bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-900/30"
                              : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                          )}
                        >
                          {h.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:border-white/20 transition">
                    <input
                      type="checkbox"
                      checked={data.acceptsWaitlist}
                      onChange={(e) => update("acceptsWaitlist", e.target.checked)}
                      className="mt-1 h-4 w-4 accent-rose-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">Enable cancellation waitlist</div>
                      <div className="text-xs text-white/55 mt-0.5">
                        When a booking cancels, the next client in line gets emailed automatically. Fills empty slots fast.
                      </div>
                    </div>
                  </label>
                </>
              )}

              {isClient && step === 1 && (
                <>
                  <Header title="What are you looking for?" subtitle="Pick anything you might book." />
                  <div className="flex flex-wrap gap-2">
                    {CLIENT_LOOKING.map((s) => {
                      const active = data.clientLookingFor.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            update("clientLookingFor", active
                              ? data.clientLookingFor.filter((x) => x !== s)
                              : [...data.clientLookingFor, s])
                          }
                          className={cn(
                            "rounded-full border px-4 py-2 text-xs font-medium transition-all active:scale-95",
                            active
                              ? "border-transparent bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-900/30"
                              : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {isClient && step === 2 && (
                <>
                  <Header title="Your style" subtitle="Helps us surface the right barbers." />
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase tracking-wider text-white/50">Budget</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {BUDGETS.map((b) => {
                        const active = data.clientBudget === b.k;
                        return (
                          <button
                            key={b.k!}
                            type="button"
                            onClick={() => update("clientBudget", b.k)}
                            className={cn(
                              "rounded-2xl border p-4 text-center transition-all active:scale-95",
                              active
                                ? "border-rose-400/60 bg-rose-500/10"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            )}
                          >
                            <div className="text-lg font-semibold text-white">{b.label}</div>
                            <div className="text-[11px] text-white/55 mt-0.5">{b.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] uppercase tracking-wider text-white/50">Travel radius</Label>
                      <span className="text-xs text-white/70 font-medium">{data.clientRadiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={data.clientRadiusKm}
                      onChange={(e) => update("clientRadiusKm", parseInt(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </>
              )}

              {isClient && step === 3 && (
                <>
                  <Header title="What should we call you?" subtitle="Optional — we use this on your bookings." />
                  <Field label="Full name" icon={<UserIcon className="h-4 w-4" />}>
                    <DarkInput
                      value={data.clientFullName}
                      onChange={(e) => update("clientFullName", e.target.value)}
                      placeholder="e.g. Alex Johnson"
                    />
                  </Field>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer (sticky inside flex column) */}
        <div className="mt-3 flex items-center gap-2 pt-2 pb-3 sm:mt-4">
          {step > (presetRole ? 1 : 0) && (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              className="text-white/70 hover:text-white hover:bg-white/10 h-11"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canNext()}
            className="ml-auto flex-1 h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-sm font-semibold shadow-lg shadow-rose-900/40"
          >
            {step === steps - 1 ? (
              <>Create account <Check className="ml-1 h-4 w-4" /></>
            ) : (
              <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="space-y-1">
    <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">{title}</h2>
    <p className="text-[13px] sm:text-sm text-white/55">{subtitle}</p>
  </div>
);

const Field = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-[11px] uppercase tracking-wider text-white/50 flex items-center gap-1.5">
      {icon}{label}
    </Label>
    {children}
  </div>
);

const DarkInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <Input
    {...props}
    className={cn(
      "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-rose-500/40 h-11 rounded-xl",
      props.className
    )}
  />
);

const RoleCard = ({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group relative flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all active:scale-[0.99]",
      active
        ? "border-rose-400/60 bg-rose-500/10 shadow-lg shadow-rose-900/20"
        : "border-white/10 bg-white/5 hover:border-white/20"
    )}
  >
    <div className={cn(
      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
      active ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white" : "bg-white/10 text-white/70"
    )}>
      {icon}
    </div>
    <div className="flex-1 pt-0.5">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/55">{desc}</p>
    </div>
    {active && (
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-white"
      >
        <Check className="h-3.5 w-3.5" />
      </motion.div>
    )}
  </button>
);
