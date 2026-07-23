"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Banner } from "@/components/Banner";
import { Loader2, Plus, Trash2, Megaphone } from "lucide-react";

interface BannerRecord {
  id: string;
  title: string;
  description?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  variant: string;
  gradient_colors?: string[] | null;
  active: boolean;
  dismissable: boolean;
  auto_dismiss?: number | null;
  priority: number;
  created_at?: string;
}

const VARIANTS = ["default", "minimal", "popup", "destructive", "warning", "success", "info", "announcement"];

export function BannersManager() {
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [variant, setVariant] = useState("default");
  const [gradientColors, setGradientColors] = useState("");
  const [dismissable, setDismissable] = useState(true);
  const [priority, setPriority] = useState("0");

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("banners")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load banners", { description: error.message });
    } else {
      setBanners(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      button_text: buttonText.trim() || null,
      button_link: buttonLink.trim() || null,
      variant,
      gradient_colors: gradientColors
        ? gradientColors.split("\n").map((c) => c.trim()).filter(Boolean)
        : null,
      dismissable,
      priority: Number(priority) || 0,
      active: true,
    };
    const { error } = await (supabase as any).from("banners").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("Could not create banner", { description: error.message });
      return;
    }
    toast.success("Banner created");
    setTitle("");
    setDescription("");
    setButtonText("");
    setButtonLink("");
    setVariant("default");
    setGradientColors("");
    setDismissable(true);
    setPriority("0");
    fetchBanners();
  };

  const toggleActive = async (banner: BannerRecord) => {
    const next = !banner.active;
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, active: next } : b)));
    const { error } = await (supabase as any).from("banners").update({ active: next }).eq("id", banner.id);
    if (error) {
      toast.error("Update failed", { description: error.message });
      fetchBanners();
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm("Delete this banner?")) return;
    setBanners((prev) => prev.filter((b) => b.id !== id));
    const { error } = await (supabase as any).from("banners").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      fetchBanners();
    }
  };

  const previewColors = gradientColors
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Top banner</CardTitle>
          <CardDescription>Create announcement banners shown at the top of the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🎉 Summer offer live" className="rounded-2xl" /></div>
            <div className="space-y-2"><Label>Variant</Label>
              <select value={variant} onChange={(e) => setVariant(e.target.value)} className="w-full h-10 rounded-2xl border border-input bg-background px-3 text-sm">
                {VARIANTS.map((v) => (<option key={v} value={v}>{v}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Get 30 days free" className="rounded-2xl" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Button text</Label><Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Start free trial" className="rounded-2xl" /></div>
            <div className="space-y-2"><Label>Button link</Label><Input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} placeholder="https://example.com" className="rounded-2xl" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Priority</Label><Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-2xl" /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={dismissable} onCheckedChange={setDismissable} /><Label className="mb-0">Dismissable</Label></div>
          </div>
          <div className="space-y-2">
            <Label>Gradient colors (one rgba per line, optional)</Label>
            <textarea value={gradientColors} onChange={(e) => setGradientColors(e.target.value)} rows={3} placeholder="rgba(0,149,255,0.56)&#10;rgba(231,77,255,0.77)" className="w-full resize-none rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {title && (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Banner
                title={title}
                description={description || undefined}
                buttonText={buttonText || undefined}
                buttonLink={buttonLink || undefined}
                variant={variant as any}
                dismissable={dismissable}
                gradientColors={previewColors.length ? previewColors : undefined}
              />
            </div>
          )}

          <Button onClick={handleCreate} disabled={busy} className="rounded-full bg-white text-black hover:bg-white/90">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create banner
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Active banners</CardTitle>
          <CardDescription>Highest priority active banner is shown globally.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading banners…</div>
          ) : banners.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No banners yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {banners.map((banner) => (
                <div key={banner.id} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{banner.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{banner.variant} · priority {banner.priority}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch checked={banner.active} onCheckedChange={() => toggleActive(banner)} />
                    <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => deleteBanner(banner.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
