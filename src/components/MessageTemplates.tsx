import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, MessageSquare, Save, Sparkles } from "lucide-react";

const db = supabase as any;

type Template = {
  user_id: string;
  email_subject: string;
  email_body: string;
  sms_body: string;
  accent_color: string;
  enabled: boolean;
};

const PLACEHOLDERS = [
  "{{customerName}}", "{{businessName}}", "{{serviceName}}",
  "{{appointmentDate}}", "{{appointmentTime}}", "{{price}}", "{{stylistName}}",
];

export function MessageTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["message-template", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await db.from("message_templates").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    setForm(
      data || {
        user_id: user.id,
        email_subject: "Booking Confirmation - {{businessName}}",
        email_body:
          "Hi {{customerName}},\n\nYour {{serviceName}} appointment with {{businessName}} is confirmed.\n\nDate: {{appointmentDate}}\nTime: {{appointmentTime}}\n\nThanks!",
        sms_body:
          "{{businessName}}: Your {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} is confirmed.",
        accent_color: "#2563eb",
        enabled: true,
      },
    );
  }, [data, user]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form || !user) throw new Error("Not ready");
      const { error } = await db
        .from("message_templates")
        .upsert({ ...form, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-template", user?.id] });
      toast({ title: "Templates saved", description: "Confirmation messages updated." });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const insert = (placeholder: string, field: "email_subject" | "email_body" | "sms_body") => {
    if (!form) return;
    setForm({ ...form, [field]: (form[field] || "") + " " + placeholder });
  };

  if (isLoading || !form) {
    return <div className="py-8 text-center text-muted-foreground">Loading templates…</div>;
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-[20px] border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
                <Mail className="h-5 w-5 text-[#0A84FF]" />
              </div>
              <div>
                <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7] text-base">Confirmation messages</CardTitle>
                <CardDescription className="text-[#8E8E93] text-xs">Email sent on every new booking.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled" className="text-sm text-[#8E8E93]">Send</Label>
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] mb-2 block">Email subject</Label>
            <Input
              value={form.email_subject}
              onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
              className="rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 h-12"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Email body</Label>
              <div className="flex gap-1">
                {["{{customerName}}", "{{serviceName}}", "{{appointmentDate}}"].map((p) => (
                  <Button key={p} type="button" size="sm" variant="ghost"
                    className="h-7 text-xs font-mono text-[#8E8E93] hover:text-[#0A84FF]"
                    onClick={() => insert(p, "email_body")}>+ {p.replace(/[{}]/g, "")}</Button>
                ))}
              </div>
            </div>
            <Textarea
              value={form.email_body}
              onChange={(e) => setForm({ ...form, email_body: e.target.value })}
              rows={6}
              className="rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] mb-2 block">SMS message</Label>
            <Textarea
              value={form.sms_body}
              onChange={(e) => setForm({ ...form, sms_body: e.target.value })}
              rows={3}
              maxLength={320}
              className="rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 font-mono text-sm"
            />
            <p className="text-xs text-[#8E8E93] mt-2">{form.sms_body.length}/320 characters</p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Accent color</Label>
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="h-10 w-14 rounded-[10px] border-0 bg-transparent cursor-pointer"
            />
            <Input
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="w-32 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 h-10"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-[12px] bg-[#0A84FF] hover:bg-[#0066d6] text-white gap-2 h-12"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save templates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
