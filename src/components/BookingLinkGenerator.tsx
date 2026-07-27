import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  ExternalLink,
  RefreshCw,
  Share2,
  Save,
  Link as LinkIcon,
  Check,
  Crown,
  QrCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import PulseButton, { type ButtonColor } from "@/components/PulseButton";
import TypewriterLoop from "@/components/TypewriterLoop";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BUTTON_COLORS: { value: string; label: string; tw: string }[] = [
  { value: "default", label: "Default UI", tw: "bg-white/10 border border-white/20" },
  { value: "pink", label: "Neon Pink", tw: "bg-[#ff2281]" },
  { value: "blue", label: "Ocean", tw: "bg-[#0070f3]" },
  { value: "orange", label: "Sunset", tw: "bg-[#f2994a]" },
  { value: "yellow", label: "Gold", tw: "bg-[#f2c94c]" },
  { value: "green", label: "Mint", tw: "bg-[#27ae60]" },
  { value: "purple", label: "Berry", tw: "bg-[#8e44ad]" },
];

const cleanSlug = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const LANGS = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { value: "es", label: "Español", flag: "��" },
] as const;

const BookingLinkGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [askPhone, setAskPhone] = useState(true);
  const [askNotes, setAskNotes] = useState(true);
  const [bookingLocale, setBookingLocale] = useState<string>("en");
  const [copied, setCopied] = useState(false);
  const [bookingTheme, setBookingTheme] = useState<string>("default");
  const [brandColor, setBrandColor] = useState<string>("#e11d48");
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["profile-booking-link", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "booking_link, full_name, business_name, ask_phone, ask_notes, brand_color, booking_theme, booking_locale"
        )
        .eq("id", user.id)
        .single();
      if (error) {
        if (error.code === "PGRST116") {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name:
                user.user_metadata?.full_name || user.email?.split("@")[0],
              ask_phone: true,
              ask_notes: true,
              brand_color: "#e11d48",
              booking_locale: "en",
            })
            .select(
              "booking_link, full_name, business_name, ask_phone, ask_notes, brand_color, booking_locale"
            )
            .single();
          if (createError) throw createError;
          return newProfile;
        }
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // Default slug: business_name → full_name → email prefix.
  const suggestedSlug = useMemo(() => {
    const base =
      (profile as any)?.business_name ||
      profile?.full_name ||
      user?.email?.split("@")[0] ||
      "";
    return cleanSlug(base);
  }, [profile, user]);

  useEffect(() => {
    if (!profile) return;
    setCustomSlug(profile.booking_link || suggestedSlug);
    setAskPhone(profile.ask_phone ?? true);
    setAskNotes(profile.ask_notes ?? true);
    setBookingLocale((profile as any)?.booking_locale ?? "en");
    setBookingTheme((profile as any)?.booking_theme || "default");
    setBrandColor((profile as any)?.brand_color || "#e11d48");
  }, [profile, suggestedSlug]);

  const getBookingUrl = () => {
    const slug = profile?.booking_link || customSlug;
    if (!slug) return "";
    return `${window.location.origin}/book/${slug}`;
  };

  const bookingUrl = getBookingUrl();

  const updateSlug = async () => {
    if (!user) return;
    const cleaned = cleanSlug(customSlug);
    if (!cleaned) {
      toast({
        title: "Invalid link",
        description: "Use letters and numbers.",
        variant: "destructive",
      });
      return;
    }
    setCustomSlug(cleaned);
    setIsGenerating(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("booking_link", cleaned)
        .neq("id", user.id)
        .maybeSingle();
      if (existing) {
        toast({
          title: "Already taken",
          description: "Try a different link.",
          variant: "destructive",
        });
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          booking_link: cleaned,
          ask_phone: askPhone,
          ask_notes: askNotes,
          booking_locale: bookingLocale,
          booking_theme: isPremium ? bookingTheme : "default",
          brand_color: isPremium ? brandColor : null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile-booking-link"] });
      await refetch();
      toast({ title: "Saved", description: "Your link is live." });
    } catch (e) {
      console.error(e);
      toast({
        title: "Couldn't save",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetToSuggested = () => setCustomSlug(suggestedSlug);

  const copyToClipboard = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const shareLink = async () => {
    if (!bookingUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Book an appointment",
          url: bookingUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      copyToClipboard();
    }
  };

  const openBookingPage = () => {
    if (bookingUrl) window.open(bookingUrl, "_blank");
  };

  if (isLoading) return <BookingLinkSkeleton />;

  const displayUrl = bookingUrl.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <span className="h-10 w-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <LinkIcon className="h-4 w-4 text-white/80" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white leading-tight">
            Booking link
          </p>
          <p className="text-[12px] text-white/45 mt-0.5">
            Share so clients can book online.
          </p>
        </div>
      </div>

      {/* URL preview */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Your link
          </span>
          <button
            onClick={copyToClipboard}
            disabled={!bookingUrl}
            className="text-[11px] font-semibold text-white/60 hover:text-white flex items-center gap-1 disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
        <p className="text-[14px] text-white font-medium break-all leading-snug select-all">
          {displayUrl || <span className="text-white/30">set a name below</span>}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={shareLink}
            disabled={!bookingUrl}
            className="h-10 rounded-xl bg-white/[0.06] border border-white/10 text-white text-[13px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-40"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
          <button
            onClick={openBookingPage}
            disabled={!bookingUrl}
            className="h-10 rounded-xl bg-white/[0.06] border border-white/10 text-white text-[13px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-40"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
        </div>
      </div>


      {/* Slug editor */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Custom name
          </Label>
          <button
            type="button"
            onClick={resetToSuggested}
            className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 h-12 focus-within:border-white/25 transition">
          <span className="text-[13px] text-white/40 shrink-0">/book/</span>
          <input
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateSlug();
              }
            }}
            placeholder={suggestedSlug || "your-name"}
            className="flex-1 bg-transparent text-[14px] font-medium text-white placeholder:text-white/25 outline-none"
          />
          <button
            type="button"
            onClick={updateSlug}
            disabled={isGenerating || customSlug.trim().length === 0}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 transition text-white"
          >
            Save
          </button>
        </div>
        {suggestedSlug && customSlug !== suggestedSlug && (
          <p className="text-[11px] text-white/40">
            Suggested from your business:{" "}
            <button
              onClick={resetToSuggested}
              className="text-white/70 underline underline-offset-2"
            >
              {suggestedSlug}
            </button>
          </p>
        )}
      </div>

      {/* Options */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
        <OptionRow
          label="Ask phone number"
          checked={askPhone}
          onChange={setAskPhone}
        />
        <OptionRow
          label="Ask notes"
          checked={askNotes}
          onChange={setAskNotes}
        />
      </div>

      {/* Language */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 px-1">
          Language
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((lang) => {
            const active = bookingLocale === lang.value;
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => setBookingLocale(lang.value)}
                className={cn(
                  "h-10 rounded-xl text-[12.5px] font-medium border transition flex items-center justify-center gap-1.5",
                  active
                    ? "bg-white text-black border-white"
                    : "bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/[0.06]"
                )}
              >
                <span className="text-sm leading-none">{lang.flag}</span>
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-rose-400" />
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Premium button theme
            </Label>
          </div>
          {!isPremium && (
            <span className="text-[11px] flex items-center gap-1 text-rose-400 font-medium">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
        </div>

        <TypewriterLoop
          LeadText="Button"
          morphingText={BUTTON_COLORS.map((c) => c.label)}
          className="text-2xl md:text-4xl !justify-start"
          interval={3500}
        />

        {bookingTheme === "default" ? (
          <button
            type="button"
            disabled={!isPremium}
            className="w-full h-12 rounded-full font-semibold text-white flex items-center justify-center"
            style={{ backgroundColor: brandColor }}
          >
            {bookingUrl ? "Book now" : "Preview"}
          </button>
        ) : (
          <PulseButton
            text={bookingUrl ? "Book now" : "Preview"}
            color={(BUTTON_COLORS.find((c) => c.value === bookingTheme)?.value as ButtonColor) || "pink"}
            size="md"
            className="w-full"
            disabled={!isPremium && bookingTheme !== "default"}
          />
        )}

        <div className="grid grid-cols-6 gap-2">
          {BUTTON_COLORS.map((c) => {
            const active = bookingTheme === c.value;
            const disabled = !isPremium && c.value !== "default";
            return (
              <button
                key={c.value}
                type="button"
                disabled={disabled}
                onClick={() => setBookingTheme(c.value)}
                className={cn(
                  "h-10 rounded-xl border-2 transition flex items-center justify-center",
                  active ? "border-white" : "border-transparent",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                title={c.label}
              >
                <div className={cn("w-6 h-6 rounded-full", c.tw)} />
              </button>
            );
          })}
        </div>

        {isPremium ? (
          <div className="flex items-center gap-2 px-1">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Brand color</Label>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-transparent cursor-pointer"
            />
          </div>
        ) : (
          <p className="px-1 text-[11px] text-white/40">
            Upgrade to Pro to unlock animated premium button themes.
          </p>
        )}
      </div>

      {/* Save */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={updateSlug}
        disabled={isGenerating || customSlug.trim().length === 0}
        className="w-full h-12 rounded-2xl bg-white text-black text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> Saving…
          </>
        ) : (
          <>
            <Save className="w-4 h-4" strokeWidth={2.5} /> Save
          </>
        )}
      </motion.button>
    </div>
  );
};

function OptionRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 h-12">
      <span className="text-[14px] text-white">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function BookingLinkSkeleton() {
  const bar = "bg-white/[0.06] rounded-md animate-pulse";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="h-10 w-10 rounded-2xl bg-white/[0.06] animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className={cn(bar, "h-3 w-24")} />
          <div className={cn(bar, "h-2.5 w-40")} />
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
        <div className={cn(bar, "h-2.5 w-16")} />
        <div className={cn(bar, "h-4 w-3/4")} />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="h-10 rounded-xl bg-white/[0.05] animate-pulse" />
          <div className="h-10 rounded-xl bg-white/[0.05] animate-pulse" />
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
        <div className={cn(bar, "h-2.5 w-20")} />
        <div className="h-12 rounded-xl bg-white/[0.05] animate-pulse" />
      </div>
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 divide-y divide-white/5 overflow-hidden">
        <div className="h-12 animate-pulse bg-white/[0.02]" />
        <div className="h-12 animate-pulse bg-white/[0.02]" />
      </div>
      <div className="h-12 rounded-2xl bg-white/[0.06] animate-pulse" />
    </div>
  );
}

export default BookingLinkGenerator;
