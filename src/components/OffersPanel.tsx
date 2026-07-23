"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LimitedOfferDialog, type Offer as DialogOffer } from "@/components/LimitedOfferDialog";
import { BannersManager } from "@/components/BannersManager";
import { Loader2, Plus, Trash2, Eye, Gift } from "lucide-react";

interface Offer extends DialogOffer {
  active: boolean;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function OffersPanel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOffer, setPreviewOffer] = useState<DialogOffer | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load offers", { description: error.message });
    } else {
      setOffers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const parseFeatures = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

  const handleCreate = async () => {
    if (!title.trim() || !discount.trim()) {
      toast.error("Title and discount are required");
      return;
    }
    setBusy(true);
    const features = parseFeatures(featuresText);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      discount: discount.trim(),
      features,
      active: true,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const { data, error } = await (supabase as any).from("offers").insert(payload).select().single();
    setBusy(false);

    if (error) {
      toast.error("Could not create offer", { description: error.message });
      return;
    }

    toast.success("Offer created");
    setOffers((prev) => [data, ...prev]);
    setPreviewOffer({
      id: data.id,
      title: data.title,
      description: data.description,
      discount: data.discount,
      features: data.features,
    });
    setPreviewOpen(true);

    // reset form
    setTitle("");
    setDescription("");
    setDiscount("");
    setFeaturesText("");
    setExpiresAt("");
  };

  const toggleActive = async (offer: Offer) => {
    const next = !offer.active;
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, active: next } : o)));
    const { error } = await (supabase as any).from("offers").update({ active: next }).eq("id", offer.id);
    if (error) {
      toast.error("Update failed", { description: error.message });
      fetchOffers();
    }
  };

  const deleteOffer = async (id: string) => {
    if (!window.confirm("Delete this offer?")) return;
    setOffers((prev) => prev.filter((o) => o.id !== id));
    const { error } = await (supabase as any).from("offers").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
      fetchOffers();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> Create limited offer</CardTitle>
          <CardDescription>Build a time-sensitive promotion. A preview dialog pops up once it is saved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Offer title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer Special" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Discount badge</Label>
              <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="50% OFF" className="rounded-2xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Grab this deal before it's gone" className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>Features (one per line)</Label>
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={4}
              placeholder="50% off your first month&#10;Valid until December 31, 2024&#10;First 100 users only"
              className="w-full resize-none rounded-2xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expires at (optional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-2xl" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={busy} className="rounded-full bg-white text-black hover:bg-white/90">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create offer & preview dialog
          </Button>
        </CardContent>
      </Card>

      {previewOffer && (
        <LimitedOfferDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title="🔥 Limited Time Offer!"
          description="Grab this deal before it's gone"
          offer={previewOffer}
          warningTitle="Don't miss out!"
          warningText="This exclusive offer won't last long. Claim it now before it's gone forever."
          claimButtonText="👉 Claim Offer Now"
          declineButtonText="No thanks, I'll pay full price"
          onClaimOffer={() => toast.info("Offer claimed (preview)")}
          onDeclineOffer={() => toast.info("Offer declined (preview)")}
          onDialogClose={() => setPreviewOffer(null)}
        />
      )}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Existing offers</CardTitle>
          <CardDescription>Manage active and expired promotions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading offers…</div>
          ) : offers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No offers yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {offers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{offer.title}</span>
                      <Badge variant="secondary" className="rounded-full">{offer.discount}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {offer.expires_at ? `Expires ${new Date(offer.expires_at).toLocaleString()}` : "No expiry"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch checked={offer.active} onCheckedChange={() => toggleActive(offer)} />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setPreviewOffer(offer); setPreviewOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => deleteOffer(offer.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BannersManager />
    </div>
  );
}
