import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, X, ExternalLink, Globe, ImagePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

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

  const publicUrl = bookingLink ? `${window.location.protocol}//${bookingLink}.cutzioo.com` : "";
  const previewUrl = bookingLink ? `/site/${bookingLink}` : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#e11d48]/10 text-[#e11d48] border border-[#e11d48]/10 inline-flex items-center gap-1">
              <Globe className="h-3 w-3" /> Microsite
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Your booking website
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            An editorial-style landing page tied to your booking link.
          </p>
          {bookingLink ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 px-3 py-1.5 text-gray-700 dark:text-gray-200 font-mono">
                {bookingLink}.cutzioo.com <ExternalLink className="h-3 w-3" />
              </a>
              <Link to={previewUrl} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 px-3 py-1.5 text-gray-700 dark:text-gray-200">
                Preview <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <p className="text-amber-500 text-xs mt-3">Set your booking link slug above first.</p>
          )}
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-zinc-900 px-3.5 h-10">
            <Switch checked={state.published} onCheckedChange={(v) => setState((s) => ({ ...s, published: v }))} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{state.published ? "Published" : "Draft"}</span>
          </div>
          <Button onClick={save} disabled={saving} className="h-10 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold px-5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
          </Button>
        </div>
      </div>

      {/* Hero + Logo + Headline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PanelCard label="Hero image" hint="Vertical 4:5">
          <ImageField url={state.hero_url} onPick={(e) => handleFile(e, "hero_url")} onClear={() => setState((s) => ({ ...s, hero_url: "" }))} aspect="aspect-[4/5]" />
        </PanelCard>
        <PanelCard label="Logo" hint="Square PNG">
          <ImageField url={state.logo_url} onPick={(e) => handleFile(e, "logo_url")} onClear={() => setState((s) => ({ ...s, logo_url: "" }))} aspect="aspect-square" rounded="rounded-full" />
        </PanelCard>
        <PanelCard label="Headline & tagline">
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Headline</Label>
              <Input value={state.headline} onChange={(e) => setState((s) => ({ ...s, headline: e.target.value }))} className="mt-1.5 h-10 rounded-xl border-2" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tagline</Label>
              <Input value={state.tagline} onChange={(e) => setState((s) => ({ ...s, tagline: e.target.value }))} className="mt-1.5 h-10 rounded-xl border-2" />
            </div>
          </div>
        </PanelCard>
      </div>

      {/* About */}
      <PanelCard label="About">
        <Textarea
          value={state.about}
          onChange={(e) => setState((s) => ({ ...s, about: e.target.value }))}
          rows={4}
          placeholder="A short story about your craft, your space, your team…"
          className="rounded-xl border-2 resize-none"
        />
      </PanelCard>

      {/* Gallery */}
      <PanelCard label="Gallery" hint="Showcase your work">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {state.gallery.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-900 group">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button onClick={() => removeGallery(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-800 hover:border-[#e11d48] hover:bg-[#e11d48]/5 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 text-[11px] font-medium">
            <ImagePlus className="h-5 w-5" />
            Add
            <input type="file" accept="image/*" multiple className="hidden" onChange={addGallery} />
          </label>
        </div>
      </PanelCard>

      {/* Visit & links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PanelCard label="Visit">
          <div className="space-y-3">
            <Field label="Address" value={state.address} onChange={(v) => setState((s) => ({ ...s, address: v }))} />
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</Label>
              <Textarea rows={4} value={state.hours} onChange={(e) => setState((s) => ({ ...s, hours: e.target.value }))} placeholder={"Mon–Fri 9–7\nSat 10–5\nSun closed"} className="mt-1.5 rounded-xl border-2 resize-none" />
            </div>
          </div>
        </PanelCard>
        <PanelCard label="Social & web">
          <div className="space-y-3">
            <Field label="Instagram URL" value={state.instagram} onChange={(v) => setState((s) => ({ ...s, instagram: v }))} />
            <Field label="Facebook URL" value={state.facebook} onChange={(v) => setState((s) => ({ ...s, facebook: v }))} />
            <Field label="TikTok URL" value={state.tiktok} onChange={(v) => setState((s) => ({ ...s, tiktok: v }))} />
            <Field label="Website" value={state.website_url} onChange={(v) => setState((s) => ({ ...s, website_url: v }))} />
          </div>
        </PanelCard>
      </div>
    </div>
  );
};

const PanelCard = ({ label, hint, children, className = "" }: any) => (
  <div className={`rounded-2xl bg-gray-50/70 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/80 p-4 md:p-5 ${className}`}>
    <div className="flex items-baseline justify-between mb-3 gap-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">{label}</div>
      {hint && <div className="text-[10px] text-gray-400">{hint}</div>}
    </div>
    {children}
  </div>
);

const Field = ({ label, value, onChange }: any) => (
  <div>
    <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-10 rounded-xl border-2" />
  </div>
);

const ImageField = ({ url, onPick, onClear, aspect, rounded = "rounded-xl" }: any) => (
  <div className={`relative ${aspect} ${rounded} overflow-hidden bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 group`}>
    {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">No image</div>}
    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition cursor-pointer">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white"><Upload className="h-3.5 w-3.5" /> Replace</span>
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
      <div className="min-h-screen flex w-full bg-slate-50/50 dark:bg-[#0a0a0c]">
        <AppSidebar />
        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 pt-8 md:px-8 md:pt-12">
            <div className="bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-zinc-800/80 p-5 md:p-8 shadow-sm">
              <MicrositeEditorPanel />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MicrositeEditor;
