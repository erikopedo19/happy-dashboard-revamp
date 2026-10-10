import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Seo } from "@/components/Seo";
import { EventsPanel } from "@/components/EventsPanel";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  KeyRound,
  Briefcase,
  CalendarDays,
  MapPin,
  Search,
  Crown,
  Loader2,
  CheckCircle2,
  Phone,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Send,
  Store,
  ExternalLink,
  Wand2,
} from "lucide-react";

export interface ListingRow {
  id: string;
  created_by: string | null;
  kind: "rent" | "space" | "job";
  profession?: "barber" | "salon" | "nails";
  latitude?: number | null;
  longitude?: number | null;
  source_url?: string | null;
  source_name?: string | null;
  ai_found?: boolean;
  title: string;
  short_description: string | null;
  description: string | null;
  location: string | null;
  price_text: string | null;
  cover_url: string | null;
  contact_phone: string | null;
  featured: boolean;
}

type TabKey = "rent" | "space" | "job" | "events";
const PROFESSIONS = [
  { key: "all", label: "All" },
  { key: "barber", label: "Barbers" },
  { key: "salon", label: "Hair salons" },
  { key: "nails", label: "Nails" },
] as const;
const distKm = (a: number, b: number, c: number, d: number) => {
  const R = 6371, t = Math.PI / 180;
  const x = Math.sin(((c - a) * t) / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(((d - b) * t) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const FREE_LIMIT = 2;
const PRO_LIMIT = 10;

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "rent", label: "Chairs", icon: KeyRound },
  { key: "space", label: "Spaces", icon: Store },
  { key: "job", label: "Jobs", icon: Briefcase },
  { key: "events", label: "Events", icon: CalendarDays },
];

const KIND_STYLE: Record<"rent" | "space" | "job", { badge: string; icon: any; gradient: string }> = {
  rent: {
    badge: "bg-[#0A84FF]",
    icon: KeyRound,
    gradient: "from-[#0A84FF]/80 to-[#0055D4]",
  },
  space: {
    badge: "bg-[#30D158]",
    icon: Store,
    gradient: "from-[#30D158]/80 to-[#1E8E3E]",
  },
  job: {
    badge: "bg-[#AF52DE]",
    icon: Briefcase,
    gradient: "from-[#AF52DE]/80 to-[#7B2FBE]",
  },
};

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

export default function Aggelies() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) || "rent";
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? tab : "rent";

  const [q, setQ] = useState("");
  const [applying, setApplying] = useState<ListingRow | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [prof, setProf] = useState<string>("all");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { maximumAge: 600_000, timeout: 8000 }
    );
  }, []);

  const findWithAi = async () => {
    if (!user) { navigate("/auth", { state: { from: "/aggelies" } }); return; }
    haptic("light");
    let here = pos;
    let city: string | undefined;
    if (!here) {
      city = window.prompt("Which city should we search?")?.trim() || undefined;
      if (!city) return;
    }
    setFinding(true);
    const { data, error: err } = await supabase.functions.invoke("find-listings", { body: { lat: here?.lat, lng: here?.lng, city } });
    setFinding(false);
    if (err || data?.error) {
      let msg = data?.error;
      try { msg = msg || JSON.parse(await (err as any).context.text()).error; } catch {}
      toast.error(msg || "Couldn't search right now.");
      return;
    }
    haptic("success");
    if (data.cached) toast.success(`Listings near ${data.city} are already up to date.`);
    else toast.success(data.added ? `Found ${data.added} new listings near ${data.city}.` : `No new listings near ${data.city} right now.`);
    refetch();
  };

  const limit = isPremium ? PRO_LIMIT : FREE_LIMIT;

  const { data: listings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["aggelies-listings"],
    queryFn: async () => {
      const { data, error: err } = await (supabase as any)
        .from("listings")
        .select("*")
        .eq("published", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (err) throw err;
      return (data ?? []) as ListingRow[];
    },
    staleTime: 60_000,
  });

  const { data: myApplications } = useQuery({
    queryKey: ["aggelies-my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error: err } = await (supabase as any)
        .from("listing_applications")
        .select("listing_id")
        .eq("applicant_id", user!.id);
      if (err) throw err;
      return new Set<string>(((data ?? []) as any[]).map((r) => r.listing_id));
    },
    staleTime: 30_000,
  });

  const usedCount = myApplications?.size ?? 0;

  const setTab = (key: TabKey) => {
    if (key === activeTab) return;
    haptic("selection");
    if (key === "rent") searchParams.delete("tab");
    else searchParams.set("tab", key);
    setSearchParams(searchParams, { replace: true });
  };

  const filtered = useMemo(() => {
    if (activeTab === "events") return [];
    const term = q.trim().toLowerCase();
    return listings
      .filter((l) => l.kind === activeTab)
      .filter((l) => prof === "all" || (l.profession ?? "barber") === prof)
      .filter(
        (l) =>
          !term ||
          l.title.toLowerCase().includes(term) ||
          (l.location ?? "").toLowerCase().includes(term) ||
          (l.short_description ?? "").toLowerCase().includes(term)
      )
      .sort((a, b) => {
        if (!pos) return 0;
        const da = a.latitude != null && a.longitude != null ? distKm(pos.lat, pos.lng, a.latitude, a.longitude) : 9999;
        const db = b.latitude != null && b.longitude != null ? distKm(pos.lat, pos.lng, b.latitude, b.longitude) : 9999;
        return da - db;
      });
  }, [listings, activeTab, q, prof, pos]);

  const openApply = (listing: ListingRow) => {
    haptic("light");
    if (!user) {
      navigate("/auth", { state: { from: "/aggelies" } });
      return;
    }
    setLimitHit(false);
    setApplying(listing);
  };

  return (
    <div className="dark min-h-screen bg-[#000000] text-[#F2F2F7] pb-32">
      <Seo
        title="Rent & Staff — Chairs, Spaces, Jobs & Events | Cutzioo"
        description="Chairs and spaces for rent, staff openings and barber events — apply in one tap on Cutzioo."
        path="/aggelies"
      />

      {/* Ambient wash */}
      <div aria-hidden className="pointer-events-none fixed -top-40 left-1/2 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-[#FF2D46]/[0.12] blur-[110px]" />

      <div className="relative max-w-3xl mx-auto px-5 pt-14">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em]">Rent &amp; Staff</h1>
            <p className="mt-1.5 text-[14px] text-white/45">
              Chairs, salon spaces, jobs for barbers, hairdressers & nail artists.
            </p>
          </div>
          {user && (
            <div
              className={cn(
                "mb-1 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                isPremium
                  ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                  : "border-white/10 bg-white/[0.05] text-white/60"
              )}
            >
              {isPremium && <Crown className="h-3.5 w-3.5" />}
              {usedCount}/{limit} applied
            </div>
          )}
        </div>

        {/* Segmented tabs */}
        <div className="mt-6 grid grid-cols-4 gap-1 rounded-full border border-white/[0.08] bg-[#1C1C1E] p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-semibold transition-colors",
                  active ? "text-white" : "text-white/50"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="aggelies-tab"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35)]"
                    transition={spring}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {activeTab === "events" ? (
              <div className="mt-5">
                <EventsPanel embedded />
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => { haptic("selection"); setProf(p.key); }}
                      className={cn(
                        "h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition active:scale-95",
                        prof === p.key ? "bg-white text-black" : "bg-white/[0.07] text-white/70"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={findWithAi}
                  disabled={finding}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-gradient-to-r from-[#FF5A6E]/15 to-[#AF52DE]/15 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-70"
                >
                  {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-[#FF5A6E]" />}
                  {finding ? "Searching the web near you…" : pos ? "Find listings near me with AI" : "Find listings with AI"}
                </button>

                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={activeTab !== "job" ? "Search areas, prices, salons…" : "Search roles, salons, cities…"}
                    className="h-12 rounded-full border-white/[0.08] bg-white/[0.05] pl-11 text-[15px] text-white placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#FF5A6E]/50"
                  />
                </div>

                {isLoading && (
                  <div className="mt-5 space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-40 animate-pulse rounded-[24px] bg-[#1C1C1E]" />
                    ))}
                  </div>
                )}

                {!isLoading && error && (
                  <div className="mt-6 rounded-[24px] border border-white/[0.08] bg-[#1C1C1E] p-6 text-center">
                    <AlertCircle className="mx-auto h-6 w-6 text-[#FF5A6E]" />
                    <p className="mt-2 font-semibold">Couldn't load listings</p>
                    <p className="mt-1 text-sm text-white/50">Check your connection and try again.</p>
                    <Button onClick={() => refetch()} variant="outline" className="mt-4 rounded-full border-white/15 bg-transparent text-white">
                      <RefreshCw className="mr-2 h-4 w-4" /> Retry
                    </Button>
                  </div>
                )}

                {!isLoading && !error && filtered.length === 0 && (
                  <div className="mt-14 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/[0.06] bg-[#1C1C1E]">
                      {activeTab !== "job" ? (
                        <KeyRound className="h-8 w-8 text-white/40" />
                      ) : (
                        <Briefcase className="h-8 w-8 text-white/40" />
                      )}
                    </div>
                    <p className="mt-4 text-[17px] font-semibold">
                      {q ? "Nothing matches your search" : activeTab !== "job" ? "Nothing for rent yet — try AI search" : "No openings yet"}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      {q ? "Try a different search." : "New aggelies will show up here."}
                    </p>
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {filtered.map((l, i) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      index={i}
                      applied={myApplications?.has(l.id) ?? false}
                      onApply={() => openApply(l)}
                    />
                  ))}
                </div>

                {!isLoading && !error && filtered.length > 0 && (
                  <p className="mt-6 text-center text-[12px] text-white/35">
                    Free accounts can apply to {FREE_LIMIT} listings ·{" "}
                    <span className="text-amber-300/80">Pro gets {PRO_LIMIT}</span>
                  </p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ApplySheet
        listing={applying}
        limitHit={limitHit}
        setLimitHit={setLimitHit}
        usedCount={usedCount}
        limit={limit}
        isPremium={isPremium}
        onClose={() => setApplying(null)}
        onApplied={() => qc.invalidateQueries({ queryKey: ["aggelies-my-applications", user?.id] })}
      />
    </div>
  );
}

function ListingCard({
  listing,
  index,
  applied,
  onApply,
}: {
  listing: ListingRow;
  index: number;
  applied: boolean;
  onApply: () => void;
}) {
  const style = KIND_STYLE[listing.kind];
  const Icon = style.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index, 10) * 0.04, ...spring }}
      className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#1C1C1E]"
    >
      <button type="button" onClick={() => setExpanded((v) => !v)} className="block w-full text-left">
        <div className={cn("relative h-36 w-full bg-gradient-to-br", style.gradient)}>
          {listing.cover_url ? (
            <img src={listing.cover_url} alt={listing.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Icon aria-hidden className="absolute -right-3 top-1/2 h-28 w-28 -translate-y-1/2 rotate-[14deg] text-white/15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white", style.badge)}>
            {listing.kind === "rent" ? "Chair for rent" : listing.kind === "space" ? "Space for rent" : "Hiring"}
          </span>
          {listing.featured && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          {listing.price_text && (
            <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-[13px] font-bold text-white backdrop-blur">
              {listing.price_text}
            </span>
          )}
        </div>

        <div className="px-4 pt-3 pb-1">
          <h3 className="truncate text-[17px] font-semibold leading-tight">{listing.title}</h3>
          {listing.location && (
            <p className="mt-1 flex items-center gap-1 text-[12.5px] text-white/50">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{listing.location}</span>
            </p>
          )}
          {listing.short_description && (
            <p className={cn("mt-1.5 text-[13px] leading-relaxed text-white/55", !expanded && "line-clamp-2")}>
              {listing.short_description}
            </p>
          )}
          {listing.source_url && (
            <a
              href={listing.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#FF5A6E]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Found on {listing.source_name || "the web"}
            </a>
          )}
          {expanded && listing.description && (
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/60">{listing.description}</p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-11 flex-1 rounded-full bg-white/[0.07] text-[13.5px] font-semibold text-white/85 transition active:scale-[0.97]"
        >
          {expanded ? "Less" : "Details"}
        </button>
        <button
          type="button"
          disabled={applied}
          onClick={onApply}
          className={cn(
            "flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-full text-[13.5px] font-semibold transition active:scale-[0.97]",
            applied
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35)]"
          )}
        >
          {applied ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Applied
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Apply
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function ApplySheet({
  listing,
  limitHit,
  setLimitHit,
  usedCount,
  limit,
  isPremium,
  onClose,
  onApplied,
}: {
  listing: ListingRow | null;
  limitHit: boolean;
  setLimitHit: (v: boolean) => void;
  usedCount: number;
  limit: number;
  isPremium: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (listing) {
      setDone(false);
      setLimitHit(false);
      setMessage("");
      setPhone("");
      setName((user?.user_metadata as any)?.full_name ?? "");
    }
  }, [listing?.id]);

  const submit = async () => {
    if (!listing || sending) return;
    setSending(true);
    const { data, error } = await (supabase as any).rpc("apply_to_listing", {
      _listing_id: listing.id,
      _full_name: name.trim() || null,
      _phone: phone.trim() || null,
      _message: message.trim() || null,
    });
    setSending(false);

    if (error || !data?.success) {
      const code = data?.error;
      if (code === "limit_reached") {
        setLimitHit(true);
        return;
      }
      if (code === "already_applied") {
        setDone(true);
        onApplied();
        return;
      }
      toast.error("Couldn't send your application. Please try again.");
      return;
    }
    haptic("success");
    setDone(true);
    onApplied();
  };

  return (
    <Sheet open={!!listing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-[#1C1C1E] px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-3 text-[#F2F2F7]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />
        {listing && (
          <>
            {limitHit ? (
              <div className="pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/15">
                  <Crown className="h-7 w-7 text-amber-400" />
                </div>
                <h3 className="mt-4 text-[20px] font-bold">Application limit reached</h3>
                <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-white/55">
                  Free accounts can apply to {FREE_LIMIT} listings. Upgrade to Pro and apply to {PRO_LIMIT}.
                </p>
                <Button
                  onClick={() => { onClose(); navigate("/pricing"); }}
                  className="mt-5 h-12 w-full rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-[15px] font-bold text-black"
                >
                  <Crown className="mr-2 h-4 w-4" /> Upgrade to Pro
                </Button>
                <button onClick={onClose} className="mt-3 text-[13px] font-medium text-white/50">
                  Maybe later
                </button>
              </div>
            ) : done ? (
              <div className="pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="mt-4 text-[20px] font-bold">Application sent</h3>
                <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-white/55">
                  The owner of "{listing.title}" got your details and will reach out directly.
                </p>
                <Button onClick={onClose} className="mt-5 h-12 w-full rounded-full bg-white/[0.1] text-[15px] font-semibold text-white">
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                    Applying to {listing.kind === "rent" ? "rental" : "job"}
                  </p>
                  <h3 className="mt-0.5 text-[20px] font-bold leading-tight">{listing.title}</h3>
                  {listing.location && (
                    <p className="mt-1 flex items-center gap-1 text-[12.5px] text-white/50">
                      <MapPin className="h-3.5 w-3.5" /> {listing.location}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5">
                  {isPremium && <Crown className="h-4 w-4 shrink-0 text-amber-400" />}
                  <p className="text-[12.5px] text-white/60">
                    You've used <span className="font-semibold text-white">{usedCount}</span> of{" "}
                    <span className="font-semibold text-white">{limit}</span> applications
                  </p>
                </div>

                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 rounded-2xl border-white/[0.08] bg-white/[0.05] text-white placeholder:text-white/35"
                />
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    inputMode="tel"
                    className="h-12 rounded-2xl border-white/[0.08] bg-white/[0.05] pl-11 text-white placeholder:text-white/35"
                  />
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={listing.kind === "rent" ? "Say a bit about yourself and when you'd move in…" : "Say a bit about your experience…"}
                  className="min-h-[96px] rounded-2xl border-white/[0.08] bg-white/[0.05] text-white placeholder:text-white/35"
                />
                <Button
                  onClick={submit}
                  disabled={sending}
                  className="h-12 w-full rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] text-[15px] font-bold text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35)]"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Send application</>}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
