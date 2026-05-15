import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Globe, Users, Image as ImageIcon, Loader2 } from "lucide-react";

export const PublicVisibilityCard = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Profile
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

  // Membership / team
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

  const isTeamMode = !!membership?.team;

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

  const uploadBanner = async (file: File, target: "profile" | "team") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = target === "profile"
        ? `${userId}/banner-${Date.now()}.${ext}`
        : `team-${membership?.team?.id}/banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("brand-images").getPublicUrl(path);
      if (target === "profile") {
        await (supabase as any).from("profiles").update({ banner_url: pub.publicUrl }).eq("id", userId);
        qc.invalidateQueries({ queryKey: ["profile-visibility", userId] });
      } else if (membership?.team?.id) {
        await (supabase as any).from("teams").update({ banner_url: pub.publicUrl }).eq("id", membership.team.id);
        qc.invalidateQueries({ queryKey: ["my-membership", userId] });
      }
      toast({ title: "Banner uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const banner = isTeamMode ? membership?.team?.banner_url : profile?.banner_url;
  const avatar = isTeamMode ? membership?.team?.logo_url : profile?.avatar_url;
  const name = isTeamMode ? membership?.team?.name : profile?.full_name;
  const accent = (isTeamMode ? membership?.team?.color : profile?.brand_color) || "#e0c4a8";
  const isPublic = isTeamMode ? !!membership?.team?.is_public : !!profile?.is_public;

  return (
    <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E] overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF2D55] to-[#A21CAF] flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Public visibility
              {isTeamMode && <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Team mode</Badge>}
            </CardTitle>
            <CardDescription>
              {isTeamMode
                ? "Show your team shop and stylists publicly on the discovery map."
                : "Show your solo shop publicly on the discovery map."}
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
              <Avatar className="h-16 w-16 ring-4 ring-white dark:ring-[#1C1C1E]">
                <AvatarImage src={avatar || undefined} />
                <AvatarFallback style={{ background: accent }}>{name?.[0] || "?"}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="pt-8 pb-4 px-4 bg-[#F8F8FA] dark:bg-[#0E0E10]">
            <div className="font-semibold">{name || "Your shop"}</div>
            {isTeamMode && membership?.stylists && membership.stylists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {membership.stylists.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-1 bg-white dark:bg-[#1C1C1E] rounded-full px-2 py-0.5 border border-black/5 dark:border-white/10">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={s.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{s.name?.[0]}</AvatarFallback>
                    </Avatar>
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
          <div>
            <Label className="text-sm font-semibold">Show on public map</Label>
            <p className="text-xs text-[#8E8E93] mt-0.5">Anyone can find and book you on the discovery page.</p>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={(v) => (isTeamMode ? toggleTeam.mutate(v) : toggleProfile.mutate(v))}
          />
        </div>

        {/* Banner upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Shop banner
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBanner(f, isTeamMode ? "team" : "profile");
              }}
              className="rounded-2xl"
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-[#8E8E93]" />}
          </div>
          <p className="text-xs text-[#8E8E93] mt-1.5">Recommended 1600×600. Used as the cover on your public card.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicVisibilityCard;
