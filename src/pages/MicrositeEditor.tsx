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
    theme: "editorial",
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
          theme: site.theme || "editorial",
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
    else toast({ title: "Saved", description: "Your site is live." });
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
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] bg-card border border-white/5 p-5 md:p-7"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-wider text-primary">
              Microsite
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Your booking website
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Design a beautiful page that lives on your booking link.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <div className="flex items-center gap-2 rounded-2xl bg-card border border-white/5 px-3.5 h-11">
              <Switch checked={state.published} onCheckedChange={(v) => setState((s) => ({ ...s, published: v }))} />
              <span className="text-[12px] font-semibold text-foreground">{state.published ? "Live" : "Draft"}</span>
            </div>
            <Button
              onPress={save}
              isDisabled={saving}
              className="h-11 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.97] transition-transform text-white font-semibold px-5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>

        {/* Link pill */}
        {bookingLink ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-card border border-white/5 pl-3 pr-1 h-11 min-w-0">
              <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[13px] font-mono text-foreground truncate max-w-[260px]">
                {publicUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                onClick={() => copy(publicUrl)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-white/5 text-muted-foreground transition"
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
              className="inline-flex items-center gap-1.5 h-11 rounded-2xl bg-foreground text-background px-4 text-[13px] font-semibold active:scale-[0.97] transition-transform"
            >
              Open site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {subdomainUrl && (
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 h-11 rounded-2xl bg-card border border-white/5 px-3.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition"
                title="Subdomain (requires DNS)"
              >
                Subdomain <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : (
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3.5 h-11">
            <span className="text-[12px] font-medium text-amber-300">Set your booking link slug above first.</span>
          </div>
        )}
      </motion.div>

      {/* Theme picker — Apple-style segmented tabs */}
      <IOSCard icon={<Sparkles className="h-3.5 w-3.5" />} label="Style" hint="Pick a vibe">
        <Tabs value={state.theme} onValueChange={(v) => setState((s) => ({ ...s, theme: v }))} variant="segment">
          <TabsList className="w-full">
            {[
              { id: "editorial", name: "Editorial", sw: ["#faf7f2", "#1c1917", "#c9a84c"] },
              { id: "noir", name: "Noir", sw: ["#0a0a0a", "#fafafa", "#c9a84c"] },
              { id: "mono", name: "Mono", sw: ["#ffffff", "#000000", "#737373"] },
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
          className="rounded-2xl border-0 bg-secondary/50 focus-visible:ring-2 focus-visible:ring-primary/40 resize-none text-[14px]"
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
                className="relative aspect-square rounded-2xl overflow-hidden bg-muted/50 group"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeGallery(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <label className="aspect-square rounded-2xl bg-muted/50 hover:bg-primary/10 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:text-primary text-[11px] font-medium border border-dashed border-white/10 hover:border-primary/40">
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
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Hours</div>
              <Textarea
                rows={4}
                value={state.hours}
                onChange={(e) => setState((s) => ({ ...s, hours: e.target.value }))}
                placeholder={"Mon–Fri 9–7\nSat 10–5\nSun closed"}
                className="rounded-2xl border-0 bg-secondary/50 focus-visible:ring-2 focus-visible:ring-primary/40 resize-none text-[14px]"
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
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={`rounded-[24px] bg-card border border-white/5 p-4 md:p-5 ${className}`}
  >
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
    {children}
  </motion.div>
);

const IOSField = ({ label, value, onChange, placeholder }: any) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{label}</div>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 rounded-2xl border-0 bg-secondary/50 focus-visible:ring-2 focus-visible:ring-primary/40 text-[14px] px-3.5"
    />
  </div>
);

const ImageField = ({ url, onPick, onClear, aspect, rounded = "rounded-2xl" }: any) => (
  <div className={`relative ${aspect} ${rounded} overflow-hidden bg-muted/50 group`}>
    {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0A0A0C] text-white">
        <AppSidebar />
        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 pt-8 md:px-8 md:pt-12">
            <MicrositeEditorPanel />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MicrositeEditor;
