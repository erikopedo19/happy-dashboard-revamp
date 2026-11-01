import { useEffect, useState, type ChangeEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Save, Upload, X, ExternalLink, Globe, ImagePlus,
  Sparkles, Image as ImageIcon, Type, FileText, MapPin, Link2, Check, Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/beui-tabs";
import { PremiumGate } from "@/components/PremiumGate";
import { CutziooLoader } from "@/components/CutziooLoader";

const upload = async (file: File, folder: string) => {
  const ext = file.name.split(".").pop();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) throw new Error("You must be signed in to upload images.");
  const name = `${uid}/microsite/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("brand-images").upload(name, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("brand-images").getPublicUrl(name).data.publicUrl;
};

export const MicrositeEditorPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookingLink, setBookingLink] = useState("");
  const [state, setState] = useState({
    published: true,
    headline: "",
    tagline: "",
    about: "",
    hero_url: "",
    logo_url: "",
    gallery: [] as string[],
    instagram: "",
    facebook: "",
    tiktok: "",
    website_url: "",
    hours: "",
    address: "",
    theme: "noir",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: prof }, { data: site }] = await Promise.all([
        supabase.from("profiles").select("booking_link, business_name, full_name, banner_url, avatar_url, address").eq("id", user.id).maybeSingle(),
        supabase.from("microsites").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setBookingLink(prof?.booking_link || "");
      if (site) {
        setState({
          published: site.published ?? true,
          headline: site.headline || "",
          tagline: site.tagline || "",
          about: site.about || "",
          hero_url: site.hero_url || "",
          logo_url: site.logo_url || "",
          gallery: Array.isArray(site.gallery) ? (site.gallery as string[]) : [],
          instagram: site.instagram || "",
          facebook: site.facebook || "",
          tiktok: site.tiktok || "",
          website_url: site.website_url || "",
          hours: site.hours || "",
          address: site.address || prof?.address || "",
          theme: site.theme || "noir",
        });
      } else {
        setState((s) => ({
          ...s,
          headline: prof?.business_name || prof?.full_name || "",
          hero_url: prof?.banner_url || "",
          logo_url: prof?.avatar_url || "",
          address: prof?.address || "",
        }));
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { user_id: user.id, ...state, gallery: state.gallery as any };
    const { error } = await supabase.from("microsites").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      if (bookingLink) localStorage.removeItem(`cutzio:site:${bookingLink}`);
      toast({ title: "Saved", description: "Your site is live." });
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>, field: "hero_url" | "logo_url") => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await upload(f, field); setState((s) => ({ ...s, [field]: url })); }
    catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
  };

  const addGallery = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try { const url = await upload(f, "gallery"); setState((s) => ({ ...s, gallery: [...s.gallery, url] })); }
      catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    }
    e.target.value = "";
  };

  const removeGallery = (i: number) => setState((s) => ({ ...s, gallery: s.gallery.filter((_, idx) => idx !== i) }));

  // Public URL — uses /site/slug on the current origin so the link always works
  // even before a wildcard subdomain is configured.
  const previewUrl = bookingLink ? `/site/${bookingLink}` : "";
  const publicUrl = bookingLink ? `${window.location.origin}/site/${bookingLink}` : "";
  const subdomainUrl = bookingLink ? `https://${bookingLink}.cutzioo.com` : "";

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <CutziooLoader variant="loop" size="48px" wordmark={false} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#111114] p-5 md:p-7"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-16 h-64 w-64 rounded-full bg-[#FF2D46]/30 blur-[90px]" />
          <div className="absolute -bottom-32 right-0 h-64 w-72 rounded-full bg-[#8F0B1F]/40 blur-[90px]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0 flex items-start gap-4">
            <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#FF5A6E] to-[#C8102E] shadow-[0_12px_30px_-8px_rgba(255,45,70,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]">
              <Globe className="h-6 w-6 text-white" />
            </span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF2D46]/[0.12] border border-[#FF2D46]/25 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF8FA3]">
                <Sparkles className="h-3 w-3" /> Microsite
              </div>
              <h2 className="mt-2 text-2xl md:text-[34px] font-bold tracking-[-0.03em] leading-tight text-white">
                Your booking website
              </h2>
              <p className="text-[13px] text-white/50 mt-1">
                Design a beautiful page that lives on your booking link.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <div className={`flex items-center gap-2 rounded-full border px-3.5 h-11 transition-colors ${state.published ? "bg-emerald-500/10 border-emerald-500/25" : "bg-white/[0.05] border-white/[0.08]"}`}>
              <Switch checked={state.published} onCheckedChange={(v) => setState((s) => ({ ...s, published: v }))} />
              <span className={`text-[12px] font-semibold ${state.published ? "text-emerald-300" : "text-white/60"}`}>{state.published ? "Live" : "Draft"}</span>
            </div>
            <Button
              onPress={save}
              isDisabled={saving}
              className="h-11 rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[0_12px_30px_-12px_rgba(255,45,70,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-[0.97] transition-transform text-white font-semibold px-5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>

        {/* Link pill */}
        {bookingLink ? (
          <div className="relative mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.08] pl-2 pr-1 h-11 min-w-0">
              <span className="flex items-center gap-1 pl-1.5 pr-1">
                <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
                <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
                <span className="h-2 w-2 rounded-full bg-[#28C840]" />
              </span>
              <span className="text-[13px] font-mono text-white/85 truncate max-w-[220px] sm:max-w-[300px]">
                {publicUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                onClick={() => copy(publicUrl)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 transition"
                title="Copy"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                      <Copy className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <Link
              to={previewUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 h-11 rounded-full bg-white text-black px-4 text-[13px] font-semibold active:scale-[0.97] transition-transform"
            >
              Open site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {subdomainUrl && (
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 h-11 rounded-full bg-white/[0.05] border border-white/[0.08] px-3.5 text-[12px] font-medium text-white/60 hover:text-white transition"
                title="Subdomain (requires DNS)"
              >
                Subdomain <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : (
          <div className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 h-11">
            <span className="text-[12px] font-medium text-amber-300">Set your booking link slug above first.</span>
          </div>
        )}
      </motion.div>

      {/* Theme picker — Apple-style segmented tabs */}
      <IOSCard icon={<Sparkles className="h-3.5 w-3.5" />} label="Style" hint="Pick a vibe">
        <Tabs value={state.theme} onValueChange={(v) => setState((s) => ({ ...s, theme: v }))} variant="segment">
          <TabsList className="w-full">
            {[
              { id: "noir", name: "Cinema", sw: ["#0B0B0C", "#FFFFFF", "#FF2D46"] },
              { id: "editorial", name: "Editorial", sw: ["#F3EEE6", "#17140F", "#B4532A"] },
              { id: "mono", name: "Bold", sw: ["#0A0A0A", "#F5F5F0", "#D7FF3A"] },
              { id: "fresh", name: "Fresh", sw: ["#FFFFFF", "#0B0B0C", "#38BDF8"] },
            ].map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex gap-0.5">
                    {t.sw.map((c, i) => (
                      <span key={i} className="h-3 w-3 rounded-[2px] border border-black/5" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[13px]">{t.name}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </IOSCard>

      {/* Hero + Logo + Headline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IOSCard icon={<ImageIcon className="h-3.5 w-3.5" />} label="Hero image" hint="Vertical 4:5">
          <ImageField url={state.hero_url} onPick={(e) => handleFile(e, "hero_url")} onClear={() => setState((s) => ({ ...s, hero_url: "" }))} aspect="aspect-[4/5]" />
        </IOSCard>
        <IOSCard icon={<ImageIcon className="h-3.5 w-3.5" />} label="Logo" hint="Square PNG">
          <ImageField url={state.logo_url} onPick={(e) => handleFile(e, "logo_url")} onClear={() => setState((s) => ({ ...s, logo_url: "" }))} aspect="aspect-square" rounded="rounded-full" />
        </IOSCard>
        <IOSCard icon={<Type className="h-3.5 w-3.5" />} label="Headline" hint="What people see first">
          <div className="space-y-2.5">
            <IOSField label="Headline" value={state.headline} onChange={(v) => setState((s) => ({ ...s, headline: v }))} />
            <IOSField label="Tagline" value={state.tagline} onChange={(v) => setState((s) => ({ ...s, tagline: v }))} />
          </div>
        </IOSCard>
      </div>

      {/* About */}
      <IOSCard icon={<FileText className="h-3.5 w-3.5" />} label="About">
        <Textarea
          value={state.about}
          onChange={(e) => setState((s) => ({ ...s, about: e.target.value }))}
          rows={4}
          placeholder="A short story about your craft, your space, your team…"
          className="rounded-[14px] border border-white/[0.07] bg-black/30 text-white placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-[#FF2D46]/40 focus-visible:border-[#FF2D46]/50 resize-none text-[14px]"
        />
      </IOSCard>

      {/* Gallery */}
      <IOSCard icon={<ImagePlus className="h-3.5 w-3.5" />} label="Gallery" hint="Showcase your work">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          <AnimatePresence initial={false}>
            {state.gallery.map((url, i) => (
              <motion.div
                key={url + i}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="relative aspect-square rounded-2xl overflow-hidden bg-black/30 ring-1 ring-white/[0.06] group"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeGallery(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <label className="aspect-square rounded-2xl bg-black/30 hover:bg-[#FF2D46]/10 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-white/40 hover:text-[#FF5A6E] text-[11px] font-medium border border-dashed border-white/10 hover:border-[#FF2D46]/40">
            <ImagePlus className="h-5 w-5" />
            Add
            <input type="file" accept="image/*" multiple className="hidden" onChange={addGallery} />
          </label>
        </div>
      </IOSCard>

      {/* Visit & links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <IOSCard icon={<MapPin className="h-3.5 w-3.5" />} label="Visit">
          <div className="space-y-2.5">
            <IOSField label="Address" value={state.address} onChange={(v) => setState((s) => ({ ...s, address: v }))} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-1.5 px-1">Hours</div>
              <Textarea
                rows={4}
                value={state.hours}
                onChange={(e) => setState((s) => ({ ...s, hours: e.target.value }))}
                placeholder={"Mon–Fri 9–7\nSat 10–5\nSun closed"}
                className="rounded-[14px] border border-white/[0.07] bg-black/30 text-white placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-[#FF2D46]/40 focus-visible:border-[#FF2D46]/50 resize-none text-[14px]"
              />
            </div>
          </div>
        </IOSCard>
        <IOSCard icon={<Link2 className="h-3.5 w-3.5" />} label="Social & web">
          <div className="space-y-2.5">
            <IOSField label="Instagram" value={state.instagram} onChange={(v) => setState((s) => ({ ...s, instagram: v }))} placeholder="https://instagram.com/..." />
            <IOSField label="Facebook" value={state.facebook} onChange={(v) => setState((s) => ({ ...s, facebook: v }))} placeholder="https://facebook.com/..." />
            <IOSField label="TikTok" value={state.tiktok} onChange={(v) => setState((s) => ({ ...s, tiktok: v }))} placeholder="https://tiktok.com/@..." />
            <IOSField label="Website" value={state.website_url} onChange={(v) => setState((s) => ({ ...s, website_url: v }))} placeholder="https://..." />
          </div>
        </IOSCard>
      </div>
    </div>
  );
};

const IOSCard = ({ icon, label, hint, children, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className={`rounded-[24px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-4 md:p-5 transition-colors hover:border-white/[0.12] ${className}`}
  >
    <div className="flex items-center justify-between mb-4 gap-2">
      <div className="inline-flex items-center gap-2.5 text-[14px] font-semibold text-white">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#FF2D46]/[0.12] text-[#FF5A6E] ring-1 ring-[#FF2D46]/20">
            {icon}
          </span>
        )}
        {label}
      </div>
      {hint && <div className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/45">{hint}</div>}
    </div>
    {children}
  </motion.div>
);

const IOSField = ({ label, value, onChange, placeholder }: any) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-1.5 px-1">{label}</div>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 rounded-[14px] border border-white/[0.07] bg-black/30 text-white placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-[#FF2D46]/40 focus-visible:border-[#FF2D46]/50 text-[14px] px-3.5"
    />
  </div>
);

const ImageField = ({ url, onPick, onClear, aspect, rounded = "rounded-2xl" }: any) => (
  <div className={`relative ${aspect} ${rounded} overflow-hidden bg-black/30 border border-dashed border-white/[0.1] group`}>
    {url ? <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : (
      <div className="h-full w-full flex flex-col items-center justify-center text-white/40 text-xs gap-1">
        <ImageIcon className="h-5 w-5" />
        No image
      </div>
    )}
    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition cursor-pointer">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 px-3 py-1.5 rounded-full">
        <Upload className="h-3.5 w-3.5" /> Replace
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
    {url && (
      <button onClick={onClear} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const MicrositeEditor = () => {
  return (
    <PremiumGate
      featureName="Your website"
      description="Microsites are part of Cutzioo Pro. Upgrade to publish your own booking website."
    >
    <SidebarProvider>
      <div className="h-[100dvh] flex w-full bg-[#0A0A0C] text-white overflow-hidden">
        <AppSidebar />
        <main className="flex-1 min-w-0 pb-24 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 pt-8 md:px-8 md:pt-12">
            <MicrositeEditorPanel />
          </div>
        </main>
      </div>
    </SidebarProvider>
    </PremiumGate>
  );
};

export default MicrositeEditor;
