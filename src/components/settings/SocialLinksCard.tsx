import { useEffect, useState } from "react";
import { Instagram, Music2, MessageCircle, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Links = { instagram: string; tiktok: string; whatsapp: string };

const FIELDS: { key: keyof Links; label: string; placeholder: string; icon: any; tint: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourshop", icon: Instagram, tint: "#E1306C" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourshop", icon: Music2, tint: "#00F2EA" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+30 690 000 0000 or wa.me link", icon: MessageCircle, tint: "#25D366" },
];

export function SocialLinksCard({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<Links>({ instagram: "", tiktok: "", whatsapp: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("microsites")
        .select("instagram, tiktok, whatsapp")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setLinks({
          instagram: data.instagram || "",
          tiktok: data.tiktok || "",
          whatsapp: data.whatsapp || "",
        });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("microsites")
      .upsert(
        {
          user_id: user.id,
          instagram: links.instagram.trim() || null,
          tiktok: links.tiktok.trim() || null,
          whatsapp: links.whatsapp.trim() || null,
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save links", description: error.message, variant: "destructive" });
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    toast({ title: "Social links saved", description: "They now appear on your microsite." });
  };

  const isMobile = variant === "mobile";
  const shell = isMobile
    ? "rounded-[28px] bg-[#1C1C1E] p-4"
    : "rounded-3xl border border-white/10 bg-white/[0.03] p-5";

  return (
    <div className={shell}>
      <div className="mb-3">
        <p className="text-[15px] font-semibold text-white">Social media</p>
        <p className="mt-0.5 text-[12px] text-[#8E8E93]">
          Shown as buttons on your microsite so clients can follow or message you.
        </p>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#8E8E93]" />
        </div>
      ) : (
        <div className="space-y-3">
          {FIELDS.map(({ key, label, placeholder, icon: Icon, tint }) => (
            <div key={key} className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: `${tint}22`, color: tint }}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8E8E93]">{label}</p>
                <Input
                  value={links[key]}
                  onChange={(e) => setLinks((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-11 rounded-2xl border-0 bg-[#2C2C2E] text-white placeholder:text-[#8E8E93] focus-visible:ring-[#FF375F]"
                />
              </div>
            </div>
          ))}

          <Button
            onClick={save}
            disabled={saving}
            className="h-11 w-full rounded-2xl bg-[#FF375F] text-white hover:bg-[#FF375F]/90"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Saved
              </>
            ) : (
              "Save links"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SocialLinksCard;
