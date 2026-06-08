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

const upload = async (file: File, folder: string) => {
  const ext = file.name.split(".").pop();
  const name = `microsite/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("brand-images").upload(name, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("brand-images").getPublicUrl(name).data.publicUrl;
};

const MicrositeEditor = () => {
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

  const publicUrl = bookingLink
    ? `${window.location.protocol}//${bookingLink}.cutzioo.com`
    : "";
  const previewUrl = bookingLink ? `/site/${bookingLink}` : "";

  if (loading) {
    return <div className="min-h-screen bg-black text-white/60 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40"><Globe className="h-3.5 w-3.5" /> Microsite</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Your booking site</h1>
            <p className="text-white/50 text-sm mt-1.5">A minimal editorial page that lives at your subdomain.</p>
            {bookingLink ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-white/80">
                  {bookingLink}.cutzioo.com <ExternalLink className="h-3 w-3" />
                </a>
                <Link to={previewUrl} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-white/80">
                  Preview <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="text-amber-400 text-xs mt-3">Set a booking link slug first in Booking Page settings.</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 h-10">
              <Switch checked={state.published} onCheckedChange={(v) => setState((s) => ({ ...s, published: v }))} />
              <span className="text-xs text-white/70">{state.published ? "Published" : "Draft"}</span>
            </div>
            <Button onClick={save} disabled={saving} className="h-10 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </div>
        </div>

        {/* Hero + Logo */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Card label="Hero image" hint="Vertical 4:5 works best">
            <ImageField url={state.hero_url} onPick={(e) => handleFile(e, "hero_url")} onClear={() => setState((s) => ({ ...s, hero_url: "" }))} aspect="aspect-[4/5]" />
          </Card>
          <Card label="Logo" hint="Square, transparent PNG">
            <ImageField url={state.logo_url} onPick={(e) => handleFile(e, "logo_url")} onClear={() => setState((s) => ({ ...s, logo_url: "" }))} aspect="aspect-square" rounded="rounded-full" />
          </Card>
          <Card label="Headline & tagline">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-white/50">Headline</Label>
                <Input value={state.headline} onChange={(e) => setState((s) => ({ ...s, headline: e.target.value }))} className="mt-1 bg-white/[0.04] border-white/10 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-white/50">Tagline</Label>
                <Input value={state.tagline} onChange={(e) => setState((s) => ({ ...s, tagline: e.target.value }))} className="mt-1 bg-white/[0.04] border-white/10 rounded-xl" />
              </div>
            </div>
          </Card>
        </div>

        {/* About */}
        <Card label="About" className="mb-4">
          <Textarea
            value={state.about}
            onChange={(e) => setState((s) => ({ ...s, about: e.target.value }))}
            rows={5}
            placeholder="A short story about your craft, your space, your team…"
            className="bg-white/[0.04] border-white/10 rounded-xl resize-none"
          />
        </Card>

        {/* Gallery */}
        <Card label="Gallery" hint="Showcase your work" className="mb-4">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {state.gallery.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.04] group">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeGallery(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border border-dashed border-white/15 hover:border-white/40 hover:bg-white/[0.03] transition flex flex-col items-center justify-center gap-1 cursor-pointer text-white/50 text-xs">
              <ImagePlus className="h-5 w-5" />
              Add
              <input type="file" accept="image/*" multiple className="hidden" onChange={addGallery} />
            </label>
          </div>
        </Card>

        {/* Visit & links */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card label="Visit">
            <div className="space-y-3">
              <Field label="Address" value={state.address} onChange={(v) => setState((s) => ({ ...s, address: v }))} />
              <div>
                <Label className="text-xs text-white/50">Hours</Label>
                <Textarea rows={4} value={state.hours} onChange={(e) => setState((s) => ({ ...s, hours: e.target.value }))} placeholder={"Mon–Fri 9–7\nSat 10–5\nSun closed"} className="mt-1 bg-white/[0.04] border-white/10 rounded-xl resize-none" />
              </div>
            </div>
          </Card>
          <Card label="Social & web">
            <div className="space-y-3">
              <Field label="Instagram URL" value={state.instagram} onChange={(v) => setState((s) => ({ ...s, instagram: v }))} />
              <Field label="Facebook URL" value={state.facebook} onChange={(v) => setState((s) => ({ ...s, facebook: v }))} />
              <Field label="TikTok URL" value={state.tiktok} onChange={(v) => setState((s) => ({ ...s, tiktok: v }))} />
              <Field label="Website" value={state.website_url} onChange={(v) => setState((s) => ({ ...s, website_url: v }))} />
            </div>
          </Card>
        </div>

        <div className="mt-8 rounded-2xl bg-white/[0.04] border border-white/10 p-5 text-sm text-white/60">
          <div className="font-medium text-white/90 mb-1">Subdomain setup (one-time)</div>
          To activate <span className="text-white">{bookingLink || "your-slug"}.cutzioo.com</span>, add a wildcard DNS record <code className="text-white">*.cutzioo.com</code> pointing to your hosting, then add <code className="text-white">*.cutzioo.com</code> as a custom domain in project settings. Until then, your site is live at <code className="text-white">/site/{bookingLink || "your-slug"}</code>.
        </div>
      </div>
    </div>
  );
};

const Card = ({ label, hint, children, className = "" }: any) => (
  <div className={`rounded-2xl bg-white/[0.04] border border-white/10 p-5 ${className}`}>
    <div className="flex items-baseline justify-between mb-3">
      <div className="text-sm font-medium text-white/90">{label}</div>
      {hint && <div className="text-[11px] text-white/40">{hint}</div>}
    </div>
    {children}
  </div>
);

const Field = ({ label, value, onChange }: any) => (
  <div>
    <Label className="text-xs text-white/50">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 bg-white/[0.04] border-white/10 rounded-xl" />
  </div>
);

const ImageField = ({ url, onPick, onClear, aspect, rounded = "rounded-xl" }: any) => (
  <div className={`relative ${aspect} ${rounded} overflow-hidden bg-white/[0.04] border border-white/10 group`}>
    {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-white/30 text-xs">No image</div>}
    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition cursor-pointer">
      <span className="inline-flex items-center gap-1.5 text-xs text-white"><Upload className="h-3.5 w-3.5" /> Replace</span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
    {url && (
      <button onClick={onClear} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default MicrositeEditor;
