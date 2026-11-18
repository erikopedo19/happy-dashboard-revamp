import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";

type Briefing = { subject: string; summary: string; highlights: string[]; todo: string[] };

/** Owner-only: preview or send the AI morning briefing (it also arrives daily at 9:00 Athens). */
export const DailyBriefingCard = () => {
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [preview, setPreview] = useState<Briefing | null>(null);

  const run = async (mode: "preview" | "send") => {
    setBusy(mode);
    try {
      const body = mode === "preview" ? { preview: true } : { force: true, resend: true };
      const { data, error } = await supabase.functions.invoke("owner-daily-briefing", { body });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* keep message */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      if (mode === "preview") setPreview(data.briefing);
      else toast.success("Briefing sent to your inbox");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't create the briefing");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="h-4 w-4 text-primary" /> Morning briefing
        </CardTitle>
        <CardDescription>
          Every day at 9:00 (Athens) you get an email with yesterday's sales and bookings, plus today's bookings, unpaid visits and failed payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={() => run("preview")}>
            {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Preview today's
          </Button>
          <Button className="rounded-full" disabled={!!busy} onClick={() => run("send")}>
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email it now
          </Button>
        </div>
        {preview && (
          <div className="space-y-3 rounded-2xl border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">{preview.subject}</p>
            <p className="text-muted-foreground">{preview.summary}</p>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Yesterday</p>
              <ul className="list-disc space-y-1 pl-5">{preview.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">To do today</p>
              <ul className="list-disc space-y-1 pl-5">{preview.todo.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyBriefingCard;
