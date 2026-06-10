import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

const upload = async (file: File, folder: string) => {
  const ext = file.name.split(".").pop();
  const name = `microsite/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, field: "hero_url" | "logo_url") => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await upload(f, field); setState((s) => ({ ...s, [field]: url })); }
    catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
  };

  const addGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      {/* iOS-style hero header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[28px] p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(225,29,72,0.10) 0%, rgba(244,114,182,0.06) 50%, rgba(99,102,241,0.08) 100%)",
        }}
      >
        <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full blur-3xl opacity-50" style={{ background: "#e11d48" }} />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full blur-3xl opacity-30" style={{ background: "#6366f1" }} />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-[#e11d48]">
              <Sparkles className="h-3 w-3" /> Microsite
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Your booking website
            </h2>
            <p className="text-[13px] text-gray-600 dark:text-gray-300/80 mt-1">
              Design a beautiful page that lives on your booking link.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <div className="flex items-center gap-2 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur border border-white/40 dark:border-white/10 px-3.5 h-11 shadow-sm">
              <Switch checked={state.published} onCheckedChange={(v) => setState((s) => ({ ...s, published: v }))} />
              <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{state.published ? "Live" : "Draft"}</span>
            </div>
            <Button
              onClick={save}
              disabled={saving}
              className="h-11 rounded-2xl bg-[#e11d48] hover:bg-[#be123c] active:scale-[0.97] transition-transform text-white font-semibold px-5 shadow-lg shadow-[#e11d48]/30"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>

        {/* Link pill */}
        {bookingLink ? (
          <div className="relative mt-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900/70 backdrop-blur border border-white/60 dark:border-white/5 shadow-sm pl-3 pr-1 h-11 min-w-0">
              <Globe className="h-3.5 w-3.5 text-[#e11d48] shrink-0" />
              <span className="text-[13px] font-mono text-gray-700 dark:text-gray-200 truncate max-w-[260px]">
                {publicUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                onClick={() => copy(publicUrl)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition"
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
              className="inline-flex items-center gap-1.5 h-11 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 text-[13px] font-semibold active:scale-[0.97] transition-transform shadow-sm"
            >
              Open site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {subdomainUrl && (
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 h-11 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur border border-white/40 dark:border-white/5 px-3.5 text-[12px] font-medium text-gray-600 dark:text-gray-300 hover:bg-white transition"
                title="Subdomain (requires DNS)"
              >
                Subdomain <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : (
          <div className="relative mt-5 inline-flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 px-3.5 h-11">
            <span className="text-[12px] font-medium text-amber-700 dark:text-amber-300">Set your booking link slug above first.</span>
          </div>
        )}
      </motion.div>

      {/* Theme picker — iOS segmented cards */}
      <iOSCard icon={<Sparkles className="h-3.5 w-3.5" />} label="Style" hint="Pick a vibe">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: "editorial", name: "Editorial", sub: "Light & airy", sw: ["#faf7f2", "#1c1917", "#c9a84c"] },
            { id: "noir", name: "Noir", sub: "Dark & luxe", sw: ["#0a0a0a", "#fafafa", "#c9a84c"] },
            { id: "mono", name: "Mono", sub: "Crisp minimal", sw: ["#ffffff", "#000000", "#737373"] },
          ].map((t) => {
            const active = state.theme === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setState((s) => ({ ...s, theme: t.id }))}
                className={`relative text-left rounded-2xl p-3 transition-all overflow-hidden ${
                  active
                    ? "bg-white dark:bg-zinc-900 ring-2 ring-[#e11d48] shadow-md"
                    : "bg-gray-100/70 dark:bg-zinc-900/40 ring-1 ring-transparent hover:bg-gray-100 dark:hover:bg-zinc-900/70"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {t.sw.map((c, i) => (
                    <span key={i} className="h-7 flex-1 rounded-lg border border-black/5" style={{ background: c }} />
                  ))}
                </div>
                <div className="text-[13px] font-semibold text-gray-900 dark:text-white">{t.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{t.sub}</div>
                {active && (
                  <motion.div
                    layoutId="theme-check"
                    className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#e11d48] flex items-center justify-center"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </iOSCard>

      {/* Hero + Logo + Headline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <iOSCard icon={<ImageIcon className="h-3.5 w-3.5" />} label="Hero image" hint="Vertical 4:5">
          <ImageField url={state.hero_url} onPick={(e) => handleFile(e, "hero_url")} onClear={() => setState((s) => ({ ...s, hero_url: "" }))} aspect="aspect-[4/5]" />
        </iOSCard>
        <iOSCard icon={<ImageIcon className="h-3.5 w-3.5" />} label="Logo" hint="Square PNG">
          <ImageField url={state.logo_url} onPick={(e) => handleFile(e, "logo_url")} onClear={() => setState((s) => ({ ...s, logo_url: "" }))} aspect="aspect-square" rounded="rounded-full" />
        </iOSCard>
        <iOSCard icon={<Type className="h-3.5 w-3.5" />} label="Headline" hint="What people see first">
          <div className="space-y-2.5">
            <iOSField label="Headline" value={state.headline} onChange={(v) => setState((s) => ({ ...s, headline: v }))} />
            <iOSField label="Tagline" value={state.tagline} onChange={(v) => setState((s) => ({ ...s, tagline: v }))} />
          </div>
        </iOSCard>
      </div>

      {/* About */}
      <iOSCard icon={<FileText className="h-3.5 w-3.5" />} label="About">
        <Textarea
          value={state.about}
          onChange={(e) => setState((s) => ({ ...s, about: e.target.value }))}
          rows={4}
          placeholder="A short story about your craft, your space, your team…"
          className="rounded-2xl border-0 bg-gray-100/80 dark:bg-zinc-900/60 focus-visible:ring-2 focus-visible:ring-[#e11d48]/40 resize-none text-[14px]"
        />
      </iOSCard>

      {/* Gallery */}
      <iOSCard icon={<ImagePlus className="h-3.5 w-3.5" />} label="Gallery" hint="Showcase your work">
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
                className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-900 group"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeGallery(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <label className="aspect-square rounded-2xl bg-gray-100/70 dark:bg-zinc-900/50 hover:bg-[#e11d48]/10 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 hover:text-[#e11d48] text-[11px] font-medium border border-dashed border-gray-200 dark:border-zinc-800 hover:border-[#e11d48]/40">
            <ImagePlus className="h-5 w-5" />
            Add
            <input type="file" accept="image/*" multiple className="hidden" onChange={addGallery} />
          </label>
        </div>
      </iOSCard>

      {/* Visit & links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <iOSCard icon={<MapPin className="h-3.5 w-3.5" />} label="Visit">
          <div className="space-y-2.5">
            <iOSField label="Address" value={state.address} onChange={(v) => setState((s) => ({ ...s, address: v }))} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 px-1">Hours</div>
              <Textarea
                rows={4}
                value={state.hours}
                onChange={(e) => setState((s) => ({ ...s, hours: e.target.value }))}
                placeholder={"Mon–Fri 9–7\nSat 10–5\nSun closed"}
                className="rounded-2xl border-0 bg-gray-100/80 dark:bg-zinc-900/60 focus-visible:ring-2 focus-visible:ring-[#e11d48]/40 resize-none text-[14px]"
              />
            </div>
          </div>
        </iOSCard>
        <iOSCard icon={<Link2 className="h-3.5 w-3.5" />} label="Social & web">
          <div className="space-y-2.5">
            <iOSField label="Instagram" value={state.instagram} onChange={(v) => setState((s) => ({ ...s, instagram: v }))} placeholder="https://instagram.com/..." />
            <iOSField label="Facebook" value={state.facebook} onChange={(v) => setState((s) => ({ ...s, facebook: v }))} placeholder="https://facebook.com/..." />
            <iOSField label="TikTok" value={state.tiktok} onChange={(v) => setState((s) => ({ ...s, tiktok: v }))} placeholder="https://tiktok.com/@..." />
            <iOSField label="Website" value={state.website_url} onChange={(v) => setState((s) => ({ ...s, website_url: v }))} placeholder="https://..." />
          </div>
        </iOSCard>
      </div>
    </div>
  );
};

const iOSCard = ({ icon, label, hint, children, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={`rounded-[24px] bg-white dark:bg-[#161618] border border-gray-100 dark:border-white/5 p-4 md:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
  >
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
        {icon && <span className="text-[#e11d48]">{icon}</span>}
        {label}
      </div>
      {hint && <div className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</div>}
    </div>
    {children}
  </motion.div>
);

const iOSField = ({ label, value, onChange, placeholder }: any) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 px-1">{label}</div>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 rounded-2xl border-0 bg-gray-100/80 dark:bg-zinc-900/60 focus-visible:ring-2 focus-visible:ring-[#e11d48]/40 text-[14px] px-3.5"
    />
  </div>
);

const ImageField = ({ url, onPick, onClear, aspect, rounded = "rounded-2xl" }: any) => (
  <div className={`relative ${aspect} ${rounded} overflow-hidden bg-gray-100 dark:bg-zinc-900 group`}>
    {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
        <ImageIcon className="h-5 w-5" />
        No image
      </div>
    )}
    <label className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition cursor-pointer">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
        <Upload className="h-3.5 w-3.5" /> Replace
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
    {url && (
      <button onClick={onClear} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 backdrop-blur text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const MicrositeEditor = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#f5f5f7] dark:bg-[#0a0a0c]">
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
