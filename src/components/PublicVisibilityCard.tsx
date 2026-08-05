import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar } from "@heroui/react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Globe, Users, Image as ImageIcon, Loader2, Lock, UserCircle2 } from "lucide-react";

type UploadTarget = "avatar" | "banner-profile" | "banner-team" | "logo-team";

export const PublicVisibilityCard = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<UploadTarget | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile-visibility", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, banner_url, is_public, brand_color")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: membership } = useQuery({
    queryKey: ["my-membership", userId],
    queryFn: async () => {
      const { data: mem } = await (supabase as any)
        .from("memberships")
        .select("org_id, role")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mem?.org_id) return null;
      const { data: team } = await (supabase as any)
        .from("teams")
        .select("id, name, logo_url, banner_url, is_public, color, address, latitude, longitude")
        .eq("org_id", mem.org_id)
        .maybeSingle();
      const { data: stylists } = await (supabase as any)
        .from("stylists")
        .select("id, name, avatar_url, title")
        .eq("org_id", mem.org_id);
      return { ...mem, team, stylists: stylists || [] };
    },
    enabled: !!userId,
  });

  const isInTeam = !!membership?.team;
  const isOwner = membership?.role === "owner" || membership?.role === "admin";
  // Members invited to a team CANNOT publish their solo profile
  const isLockedMember = isInTeam && !isOwner;
  const mode: "team" | "solo" = isInTeam && isOwner ? "team" : "solo";

  const toggleProfile = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await (supabase as any).from("profiles").update({ is_public: val }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-visibility", userId] }); toast({ title: "Visibility updated" }); },
  });

  const toggleTeam = useMutation({
    mutationFn: async (val: boolean) => {
      if (!membership?.team?.id) return;
      const { error } = await (supabase as any).from("teams").update({ is_public: val }).eq("id", membership.team.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-membership", userId] }); toast({ title: "Team visibility updated" }); },
  });

  const uploadImage = async (file: File, target: UploadTarget) => {
    setUploading(target);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${target}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("brand-images").getPublicUrl(path);
      const url = pub.publicUrl;
      if (target === "avatar") {
        await (supabase as any).from("profiles").update({ avatar_url: url }).eq("id", userId);
        qc.invalidateQueries({ queryKey: ["profile-visibility", userId] });
      } else if (target === "banner-profile") {
        await (supabase as any).from("profiles").update({ banner_url: url }).eq("id", userId);
        qc.invalidateQueries({ queryKey: ["profile-visibility", userId] });
      } else if (target === "banner-team" && membership?.team?.id) {
        await (supabase as any).from("teams").update({ banner_url: url }).eq("id", membership.team.id);
        qc.invalidateQueries({ queryKey: ["my-membership", userId] });
      } else if (target === "logo-team" && membership?.team?.id) {
        await (supabase as any).from("teams").update({ logo_url: url }).eq("id", membership.team.id);
        qc.invalidateQueries({ queryKey: ["my-membership", userId] });
      }
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  const banner = mode === "team" ? membership?.team?.banner_url : profile?.banner_url;
  const avatar = mode === "team" ? membership?.team?.logo_url : profile?.avatar_url;
  const name = mode === "team" ? membership?.team?.name : profile?.full_name;
  const accent = (mode === "team" ? membership?.team?.color : profile?.brand_color) || "#e0c4a8";
  const isPublic = mode === "team" ? !!membership?.team?.is_public : !!profile?.is_public;

  return (
    <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E] overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF2D55] to-[#A21CAF] flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              Public visibility
              {mode === "team" && <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Team — {membership?.team?.name}</Badge>}
              {isLockedMember && <Badge variant="outline" className="text-amber-600 border-amber-300"><Lock className="h-3 w-3 mr-1" />Member</Badge>}
            </CardTitle>
            <CardDescription>
              {isLockedMember
                ? "You're part of a team. Only the team owner can publish the shop. Leave the team to publish your own page."
                : mode === "team"
                ? "Publish your team shop to the discovery map. Stylists in your org appear automatically."
                : "Publish your solo shop to the discovery map."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Live preview */}
        <div className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
          <div className="relative h-32 w-full" style={{ background: banner ? undefined : `linear-gradient(135deg, ${accent}, #00000040)` }}>
            {banner && <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute -bottom-6 left-4">
              <Avatar
                src={avatar || undefined}
                name={name?.[0] || "?"}
                className="h-16 w-16"
                isBordered
              />
            </div>
          </div>
          <div className="pt-8 pb-4 px-4 bg-[#F8F8FA] dark:bg-[#0E0E10]">
            <div className="font-semibold">{name || "Your shop"}</div>
            {mode === "team" && membership?.stylists?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {membership.stylists.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-1 bg-white dark:bg-[#1C1C1E] rounded-full px-2 py-0.5 border border-black/5 dark:border-white/10">
                    <Avatar
                      src={s.avatar_url || undefined}
                      name={s.name?.[0]}
                      className="h-5 w-5"
                    />
                    <span className="text-xs">{s.name}</span>
                  </div>
                ))}
                {membership.stylists.length > 5 && <span className="text-xs text-[#8E8E93] self-center">+{membership.stylists.length - 5}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F8FA] dark:bg-[#0E0E10]">
          <div className="flex-1 pr-3">
            <Label className="text-sm font-semibold">Show on public map</Label>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              {isLockedMember
                ? "Disabled — only the team owner controls visibility."
                : mode === "team"
                ? `Publishes team "${membership?.team?.name}" on the discovery map.`
                : "Anyone can find and book you on the discovery page."}
            </p>
          </div>
          <Switch
            checked={isPublic}
            disabled={isLockedMember || (mode === "team" && !membership?.team?.id)}
            onCheckedChange={(v) => (mode === "team" ? toggleTeam.mutate(v) : toggleProfile.mutate(v))}
          />
        </div>

        {!isLockedMember && (
          <>
            {/* Avatar / Logo */}
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <UserCircle2 className="h-4 w-4" /> {mode === "team" ? "Team logo" : "Profile photo"}
              </Label>
              <div className="flex items-center gap-3">
                <Avatar
                  src={avatar || undefined}
                  name={name?.[0] || "?"}
                  className="h-14 w-14"
                />
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, mode === "team" ? "logo-team" : "avatar");
                  }}
                  className="rounded-2xl"
                />
                {(uploading === "avatar" || uploading === "logo-team") && <Loader2 className="h-4 w-4 animate-spin text-[#8E8E93]" />}
              </div>
              <p className="text-xs text-[#8E8E93] mt-1.5">Square image works best. Shown in your public card and bookings.</p>
            </div>

            {/* Banner */}
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Shop banner
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, mode === "team" ? "banner-team" : "banner-profile");
                  }}
                  className="rounded-2xl"
                />
                {(uploading === "banner-profile" || uploading === "banner-team") && <Loader2 className="h-4 w-4 animate-spin text-[#8E8E93]" />}
              </div>
              <p className="text-xs text-[#8E8E93] mt-1.5">Recommended 1600×600. Used as the cover on your public card.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicVisibilityCard;
