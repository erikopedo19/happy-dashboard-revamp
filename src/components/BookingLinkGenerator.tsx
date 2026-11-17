import { useState, useEffect, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { displayBookingUrl, publicBookingUrl } from "@/lib/bookingUrl";
import { copyText, openExternal, platformShareUrl, shareFile, shareLink as shareSheet, type SharePlatform } from "@/lib/share";
import { generateShareBanner } from "@/lib/generateShareBanner";
import { ShareBanner } from "@/components/ShareBanner";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Globe,
  Mail,
  ChevronDown,
  MessageCircle,
  MessageSquare,
  Send,
  Instagram,
  Facebook,
  Twitter,
  ImageDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import PulseButton, { type ButtonColor } from "@/components/PulseButton";
import TypewriterLoop from "@/components/TypewriterLoop";
import { supabase } from "@/integrations/supabase/client";
import BookingLinkPreview from "@/components/BookingLinkPreview";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BOOKING_LANGUAGES, isBookingLocale, type BookingLocale } from "@/lib/bookingLocales";
import { CopyButton as ArcCopyButton } from "@/components/arc/copy-button/copy-button";

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

const BookingLinkGenerator = ({ stickySave = false }: { stickySave?: boolean }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [askPhone, setAskPhone] = useState(true);
  const [askNotes, setAskNotes] = useState(true);
  const [bookingLocale, setBookingLocale] = useState<BookingLocale>("en");
  const [bookingTheme, setBookingTheme] = useState<string>("default");
  const [brandColor, setBrandColor] = useState<string>("#E0152F");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [showWebsiteInfo, setShowWebsiteInfo] = useState(false);
  const [websiteRequested, setWebsiteRequested] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["profile-booking-link", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "booking_link, full_name, business_name, ask_phone, ask_notes, brand_color, booking_theme, booking_locale, avatar_url, banner_url, address, description, rating, rating_count, website_design_requested"
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
              brand_color: "#E0152F",
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

  const { data: servicesCount = 0 } = useQuery({
    queryKey: ["services-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null);
      return count ?? 0;
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
    const savedLocale = (profile as any)?.booking_locale;
    setBookingLocale(isBookingLocale(savedLocale) ? savedLocale : "en");
    setBookingTheme((profile as any)?.booking_theme || "default");
    setBrandColor((profile as any)?.brand_color || "#E0152F");
    setWebsiteRequested((profile as any)?.website_design_requested ?? false);
  }, [profile, suggestedSlug]);

  const getBookingUrl = () => {
    const slug = profile?.booking_link || customSlug;
    if (!slug) return "";
    return publicBookingUrl(slug);
  };

  const bookingUrl = getBookingUrl();
  const slugForShare = profile?.booking_link || customSlug;
  const shareDisplayUrl = displayBookingUrl(slugForShare);

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

  const saveLocale = async (value: BookingLocale) => {
    setBookingLocale(value);
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          booking_locale: value,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile-booking-link"] });
      toast({ title: "Language updated", description: "Booking page and emails will use it." });
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't save language", variant: "destructive" });
    }
  };

  const resetToSuggested = () => setCustomSlug(suggestedSlug);

  const shopName = (profile as any)?.business_name || profile?.full_name || "";
  const sharePayload = {
    title: shopName ? `Book with ${shopName}` : "Book an appointment",
    text: shopName ? `Book your next appointment with ${shopName}` : "Book your next appointment",
    url: bookingUrl,
  };

  const shareLink = async () => {
    if (!bookingUrl) return;
    haptic("light");
    const result = await shareSheet(sharePayload);
    if (result === "copied") toast({ title: "Link copied" });
    if (result === "failed") toast({ title: "Couldn't share", description: bookingUrl, variant: "destructive" });
  };

  const shareTo = (platform: SharePlatform) => {
    if (!bookingUrl) return;
    haptic("light");
    openExternal(platformShareUrl(platform, sharePayload));
  };

  /** Instagram and stories have no link composer: hand over the banner image and keep the link on the clipboard. */
  const shareBannerImage = async () => {
    if (!bookingUrl || bannerBusy) return;
    haptic("light");
    setBannerBusy(true);
    try {
      const blob = await generateShareBanner(shareDisplayUrl, shopName);
      const copied = await copyText(bookingUrl);
      const result = await shareFile(blob, `cutzioo-${slugForShare}.png`, { title: sharePayload.title });
      if (result === "downloaded") {
        toast({ title: "Banner saved", description: copied ? "Link copied too. Paste it in your bio or story." : undefined });
      } else if (result === "unsupported") {
        const shared = await shareLink(sharePayload);
        if (shared === "copied") toast({ title: "Link copied", description: "This version of the app can't share images yet." });
      }
    } catch {
      toast({ title: "Couldn't create the banner", variant: "destructive" });
    } finally {
      setBannerBusy(false);
    }
  };

  const openBookingPage = () => {
    if (!bookingUrl) return;
    haptic("light");
    window.open(bookingUrl, "_blank");
  };

  const requestWebsiteDesign = async () => {
    setShowWebsiteInfo((s) => !s);
    if (!user || websiteRequested) return;
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          website_design_requested: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      setWebsiteRequested(true);
      await queryClient.invalidateQueries({ queryKey: ["profile-booking-link"] });
      toast({ title: "Request sent", description: "Our team will email you soon." });
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <BookingLinkSkeleton />;

  const bookingPreview = (
    <BookingLinkPreview
      name={(profile as any)?.business_name || profile?.full_name || "Your business"}
      subtitle={(profile as any)?.business_name ? profile?.full_name || "Barber" : "Barber"}
      about={(profile as any)?.description}
      address={(profile as any)?.address}
      avatarUrl={(profile as any)?.avatar_url}
      bannerUrl={(profile as any)?.banner_url}
      rating={(profile as any)?.rating}
      ratingCount={(profile as any)?.rating_count}
      servicesCount={servicesCount}
      brandColor={brandColor}
    />
  );

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Your link — hero card */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#121215] p-5">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[#FF2D46]/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-48 w-48 rounded-full bg-[#8F0B1F]/40 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-11 w-11 shrink-0 rounded-[14px] bg-gradient-to-br from-[#FF5A6E] to-[#C8102E] shadow-[0_8px_24px_-6px_rgba(255,45,70,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] flex items-center justify-center text-white">
              <LinkIcon className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-white leading-tight tracking-tight">Booking link</p>
              <p className="text-[12px] text-white/50 mt-0.5">Share so clients can book online.</p>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] font-semibold border",
              profile?.booking_link ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-white/[0.06] border-white/10 text-white/50"
            )}
          >
            <span className={cn("relative h-1.5 w-1.5 rounded-full", profile?.booking_link ? "bg-emerald-400" : "bg-white/40")}>
              {profile?.booking_link && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />}
            </span>
            {profile?.booking_link ? "Live" : "Not saved"}
          </span>
        </div>

        <ShareBanner displayUrl={shareDisplayUrl} shopName={shopName} className="relative mt-5" />

        <div className="relative grid grid-cols-3 gap-2 mt-3">
          <div className="arc-copy-scope h-[60px] rounded-[16px] bg-white/[0.06] border border-white/[0.06] flex items-center justify-center transition hover:bg-white/[0.09]">
            <ArcCopyButton
              value={bookingUrl || ""}
              label="Copy"
              variant="plain"
              disabled={!bookingUrl}
              onCopied={() => haptic("success")}
              className="!min-h-0 !h-10 !w-full !justify-center !rounded-2xl !border-transparent !bg-transparent text-[12px] font-semibold !text-white"
            />
          </div>
          <button
            type="button"
            onClick={shareLink}
            disabled={!bookingUrl}
            className="h-[60px] rounded-[16px] bg-white/[0.06] border border-white/[0.06] flex flex-col items-center justify-center gap-1 text-[12px] font-semibold text-white hover:bg-white/[0.09] active:scale-[0.97] transition disabled:opacity-40"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={openBookingPage}
            disabled={!bookingUrl}
            className="h-[60px] rounded-[16px] bg-gradient-to-b from-[#FF5A6E] via-[#FF2D46] to-[#E0152F] text-white flex flex-col items-center justify-center gap-1 text-[12px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-[0.97] transition disabled:opacity-40"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open</span>
          </button>
        </div>

        <div className="relative mt-4">
          <p className="text-[12px] font-medium text-white/50">Send it straight to</p>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {SHARE_TARGETS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                disabled={!bookingUrl}
                onClick={() => (key === "image" || key === "instagram" ? shareBannerImage() : shareTo(key))}
                className="flex h-[58px] flex-col items-center justify-center gap-1 rounded-[14px] border border-white/[0.06] bg-white/[0.05] text-[11px] font-medium text-white/80 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.09] active:scale-[0.97] disabled:opacity-40"
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live booking page preview */}
      {isMobile ? (
        <div className={SECTION_CARD}>
          <button
            type="button"
            aria-expanded={previewOpen}
            onClick={() => setPreviewOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left text-[14px] font-semibold text-white"
          >
            Preview booking page
            <motion.span animate={{ rotate: previewOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-white/60" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {previewOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-4">{bookingPreview}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        bookingPreview
      )}


      {/* Slug editor */}
      <div className={cn(SECTION_CARD, "space-y-3")}>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<LinkIcon className="h-3.5 w-3.5" />} title="Custom name" />
          <button
            type="button"
            onClick={resetToSuggested}
            className="h-7 rounded-full bg-white/[0.06] px-2.5 text-[11px] font-semibold text-white/60 hover:text-white flex items-center gap-1 transition"
          >
            <RefreshCw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-[16px] bg-black/30 border border-white/[0.08] pl-1.5 pr-1.5 h-12 focus-within:border-[#FF2D46]/60 focus-within:shadow-[0_0_0_4px_rgba(255,45,70,0.12)] transition">
          <span className="text-[12px] font-medium text-white/45 shrink-0 rounded-[10px] bg-white/[0.06] px-2 h-8 inline-flex items-center">cutzioo.com/</span>
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
            className="text-[12px] font-semibold px-3.5 h-9 rounded-[12px] bg-white text-black hover:bg-white/90 disabled:opacity-40 transition"
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


      {/* Language */}
      <div className={cn(SECTION_CARD, "space-y-3")}>
        <SectionTitle
          icon={<Globe className="h-3.5 w-3.5" />}
          title="Booking language"
          subtitle="Used on your booking link and confirmation emails."
        />
        <div className="grid grid-cols-2 gap-2">
          {BOOKING_LANGUAGES.map((l) => {
            const active = bookingLocale === l.value;
            return (
              <button
                key={l.value}
                type="button"
                onClick={() => saveLocale(l.value)}
                className={cn(
                  "h-12 rounded-[16px] border px-3.5 flex items-center gap-2 text-[13px] font-medium transition",
                  active
                    ? "bg-[#FF2D46]/[0.12] border-[#FF2D46]/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "bg-black/25 border-white/[0.06] text-white/60 hover:text-white hover:border-white/15"
                )}
              >
                <span className="truncate">{l.label}</span>
                {active && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#FF2D46]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme */}
      <div className={cn(SECTION_CARD, "space-y-4 overflow-hidden")}>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Crown className="h-3.5 w-3.5" />} title="Premium button theme" />
          {!isPremium && (
            <span className="text-[11px] flex items-center gap-1 text-[#FF2D46] font-medium">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
        </div>

        {isPremium && (
          <>
            <div className="max-w-full overflow-hidden">
              <TypewriterLoop
                LeadText="Button"
                morphingText={BUTTON_COLORS.map((c) => c.label)}
                className="text-2xl md:text-4xl !justify-start max-w-full"
                interval={3500}
              />
            </div>

            {bookingTheme === "default" ? (
              <button
                type="button"
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
              />
            )}

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {BUTTON_COLORS.map((c) => {
                const active = bookingTheme === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBookingTheme(c.value)}
                    className={cn(
                      "h-10 rounded-[18px] border-2 transition flex items-center justify-center",
                      active ? "border-[#FF2D46]" : "border-transparent"
                    )}
                    title={c.label}
                  >
                    <div className={cn("w-6 h-6 rounded-full", c.tw)} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {isPremium ? (
          <div className="flex items-center gap-2 px-1">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Brand color</Label>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-8 h-8 rounded-full overflow-hidden border border-white/[0.08] bg-transparent cursor-pointer"
            />
          </div>
        ) : (
          <p className="px-1 text-[11px] text-white/40">
            Upgrade to Pro to unlock animated premium button themes.
          </p>
        )}
      </div>

      {/* Website design request */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-[#1A0B0F] via-[#141417] to-[#121215] p-4 space-y-3"
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FF2D46]/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 shrink-0 rounded-[14px] bg-gradient-to-br from-[#FF5A6E] to-[#C8102E] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center text-white">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-white">Need a full website?</p>
              <p className="text-[12px] text-white/45">Request a custom design for your brand.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestWebsiteDesign}
            className="h-9 shrink-0 px-4 rounded-full bg-white text-black text-[13px] font-semibold active:scale-[0.98] transition"
          >
            {showWebsiteInfo ? "Hide" : "Request"}
          </button>
        </div>
        <AnimatePresence>
          {showWebsiteInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="relative pt-3 border-t border-white/10">
                <p className="text-[13px] text-white/70">Send your details to</p>
                <a
                  href="mailto:hello@cutzioo.com?subject=Website%20design%20request"
                  className="mt-1 inline-flex items-center gap-2 text-[14px] font-medium text-[#FF2D46] transition"
                >
                  <Mail className="h-4 w-4" /> hello@cutzioo.com
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Save */}
      <div
        className={cn(
          stickySave &&
            "sticky bottom-0 z-20 -mx-4 border-t border-white/[0.08] bg-[#0A0A0C]/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:bg-transparent md:p-0"
        )}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={updateSlug}
          disabled={isGenerating || customSlug.trim().length === 0}
          className="w-full h-12 rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_12px_30px_-12px_rgba(255,45,70,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] disabled:opacity-50"
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
    </motion.div>
  );
};

const SHARE_TARGETS: { key: SharePlatform | "instagram" | "image"; label: string; Icon: typeof Mail }[] = [
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "x", label: "X", Icon: Twitter },
  { key: "telegram", label: "Telegram", Icon: Send },
  { key: "sms", label: "SMS", Icon: MessageSquare },
  { key: "email", label: "Email", Icon: Mail },
  { key: "image", label: "Save image", Icon: ImageDown },
];

const SECTION_CARD =
  "rounded-[24px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-[#FF2D46]/[0.12] text-[#FF5A6E] ring-1 ring-[#FF2D46]/20">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-white leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-white/45 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

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
          <div className="h-10 rounded-[18px] bg-white/[0.05] animate-pulse" />
          <div className="h-10 rounded-[18px] bg-white/[0.05] animate-pulse" />
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
        <div className={cn(bar, "h-2.5 w-20")} />
        <div className="h-12 rounded-[18px] bg-white/[0.05] animate-pulse" />
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
