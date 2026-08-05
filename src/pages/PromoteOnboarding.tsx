import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarCheck, Check, Clock, Sparkles, Star, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const PROMOTE_STORAGE_KEY = "cutzioo_promote_client";

type BusinessProfile = {
  id: string;
  full_name: string;
  booking_link?: string | null;
  avatar_url?: string | null;
  address?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  total_bookings?: number | null;
  services_count?: number | null;
};

type LeadData = {
  name: string;
  email: string;
  phone: string;
  goal: string;
};

const goals = ["Book a fresh cut", "Find a regular barber", "Get reminders", "Save this shop"];

export default function PromoteOnboarding() {
  const { bookingLink } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadData>({ name: "", email: "", phone: "", goal: goals[0] });

  const progress = useMemo(() => ((step + 1) / 3) * 100, [step]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!bookingLink) return;
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_public_profile_by_booking_link", { _booking_link: bookingLink });
      if (!mounted) return;
      if (error) {
        toast.error("Promote link not found", { description: error.message });
      } else {
        const nextProfile = Array.isArray(data) ? data[0] : data;
        setProfile(nextProfile ?? null);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [bookingLink]);

  useEffect(() => {
    const raw = sessionStorage.getItem(PROMOTE_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.bookingLink === bookingLink && saved?.lead) {
        setLead((current) => ({ ...current, ...saved.lead }));
      }
    } catch {
      sessionStorage.removeItem(PROMOTE_STORAGE_KEY);
    }
  }, [bookingLink]);

  useEffect(() => {
    if (!bookingLink) return;
    sessionStorage.setItem(PROMOTE_STORAGE_KEY, JSON.stringify({ bookingLink, lead, savedAt: Date.now() }));
  }, [bookingLink, lead]);

  const canContinue = () => {
    if (step === 1) return lead.goal.trim().length > 0;
    if (step === 2) return lead.name.trim().length > 1 && /\S+@\S+\.\S+/.test(lead.email);
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      toast.error("Add your name and a valid email to continue");
      return;
    }
    if (step < 2) {
      setDirection(1);
      setStep((value) => value + 1);
      return;
    }
    sessionStorage.setItem(PROMOTE_STORAGE_KEY, JSON.stringify({ bookingLink, lead, committed: true, savedAt: Date.now() }));
    navigate(`/book/${bookingLink}?promote=1`);
  };

  const back = () => {
    setDirection(-1);
    setStep((value) => Math.max(0, value - 1));
  };

  const skip = () => {
    sessionStorage.removeItem(PROMOTE_STORAGE_KEY);
    navigate(`/book/${bookingLink}`);
  };

  if (!bookingLink) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Missing promote link.</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#242832_0%,#0b0c10_42%,#050506_100%)] px-5 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_32%,rgba(255,255,255,0.04))]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[36px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:p-8">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-16 rounded-3xl bg-white/10" />
                <Skeleton className="h-8 w-2/3 bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-5/6 bg-white/10" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/10">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7 text-white/80" />}
                  </div>
                  <div>
                    <Badge className="mb-2 rounded-full bg-white text-black hover:bg-white">Invite link</Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">Join {profile?.full_name ?? "this barber"}</h1>
                  </div>
                </div>
                <p className="mt-6 text-sm leading-6 text-white/60">
                  Become part of their client list before booking. Your details stay temporary until you continue, then we pre-fill your booking so it feels instant.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <Stat icon={<Star className="h-4 w-4" />} label="Rating" value={profile?.rating ? profile.rating.toFixed(1) : "New"} />
                  <Stat icon={<CalendarCheck className="h-4 w-4" />} label="Bookings" value={`${profile?.total_bookings ?? 0}`} />
                  <Stat icon={<Sparkles className="h-4 w-4" />} label="Services" value={`${profile?.services_count ?? 0}`} />
                </div>
                <div className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4" /> Fast path</div>
                  <p className="mt-2 text-xs leading-5 text-white/55">One minute onboarding, then choose your service, time and confirm.</p>
                </div>
              </>
            )}
          </motion.div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.07] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between text-xs text-white/50">
                <span>Step {step + 1} of 3</span>
                <button onClick={skip} className="rounded-full px-3 py-1 hover:bg-white/10">Skip</button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-white" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
              </div>
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 48, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: direction * -48, filter: "blur(8px)" }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[360px]"
              >
                {step === 0 && <IntroSlide name={profile?.full_name ?? "your barber"} />}
                {step === 1 && <GoalSlide value={lead.goal} onChange={(goal) => setLead((current) => ({ ...current, goal }))} />}
                {step === 2 && <DetailsSlide lead={lead} onChange={(nextLead) => setLead((current) => ({ ...current, ...nextLead }))} />}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="light" onPress={back} isDisabled={step === 0} className="rounded-full text-white hover:bg-white/10 hover:text-white">Back</Button>
              <Button onPress={next} className="rounded-full bg-white px-6 text-black hover:bg-white/90">
                {step === 2 ? "Continue to booking" : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntroSlide({ name }: { name: string }) {
  return (
    <div className="flex min-h-[360px] flex-col justify-center">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-black"><Sparkles className="h-6 w-6" /></div>
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Get connected before you book.</h2>
      <p className="mt-5 max-w-xl text-base leading-7 text-white/58">This quick flow helps {name} know who you are, what you need, and keeps your booking form ready when you continue.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {["Personal booking", "Fast reminders", "Saved details"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70"><Check className="mb-2 h-4 w-4 text-white" />{item}</div>)}
      </div>
    </div>
  );
}

function GoalSlide({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What brings you here?</h2>
      <p className="mt-3 text-sm text-white/55">Pick the reason so the experience feels personal.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {goals.map((goal) => (
          <button key={goal} onClick={() => onChange(goal)} className={`rounded-[24px] border p-5 text-left transition ${value === goal ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.09]"}`}>
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-black/10"><Check className="h-4 w-4" /></div>
            <div className="font-medium">{goal}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsSlide({ lead, onChange }: { lead: LeadData; onChange: (value: Partial<LeadData>) => void }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Save your spot.</h2>
      <p className="mt-3 text-sm text-white/55">We use this only to pre-fill your booking. If you leave, it stays temporary in this browser session.</p>
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label className="text-white/70">Name</Label>
          <Input value={lead.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Your name" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/35" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Email</Label>
          <Input value={lead.email} onChange={(event) => onChange({ email: event.target.value })} placeholder="you@example.com" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/35" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Phone optional</Label>
          <Input value={lead.phone} onChange={(event) => onChange({ phone: event.target.value })} placeholder="Phone number" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/35" />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="text-white/70">{icon}</div>
      <div className="mt-3 text-lg font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
