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
    <div className="space-y-6">
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Confirmation messages</CardTitle>
                <CardDescription>Customize the email and SMS sent on every new booking.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled" className="text-sm text-muted-foreground">Send</Label>
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Available placeholders:</p>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map((p) => (
              <Badge key={p} variant="outline" className="rounded-full border-border bg-secondary text-xs font-mono">
                {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-foreground">Email</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Subject</Label>
            <Input
              value={form.email_subject}
              onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
              className="rounded-xl bg-background border-border h-11"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">Body</Label>
              <div className="flex gap-1">
                {["{{customerName}}", "{{serviceName}}", "{{appointmentDate}}"].map((p) => (
                  <Button key={p} type="button" size="sm" variant="ghost"
                    className="h-7 text-xs font-mono text-muted-foreground hover:text-foreground"
                    onClick={() => insert(p, "email_body")}>+ {p.replace(/[{}]/g, "")}</Button>
                ))}
              </div>
            </div>
            <Textarea
              value={form.email_body}
              onChange={(e) => setForm({ ...form, email_body: e.target.value })}
              rows={9}
              className="rounded-xl bg-background border-border font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">Accent color</Label>
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="h-10 w-14 rounded-lg border border-border bg-transparent cursor-pointer"
            />
            <Input
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="w-32 rounded-xl bg-background border-border h-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-foreground">SMS</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={form.sms_body}
            onChange={(e) => setForm({ ...form, sms_body: e.target.value })}
            rows={4}
            maxLength={320}
            className="rounded-xl bg-background border-border font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">{form.sms_body.length}/320 characters · Brevo SMS credits required.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save templates
        </Button>
      </div>
    </div>
  );
}
