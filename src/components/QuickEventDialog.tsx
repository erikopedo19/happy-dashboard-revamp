import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Loader2, CalendarDays } from "lucide-react";

export const EVENT_COLORS = ["#FF375F", "#0A84FF", "#30D158", "#FF9F0A", "#BF5AF2", "#64D2FF"];

interface QuickEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** yyyy-MM-dd */
  defaultDate?: string;
  /** HH:mm */
  defaultTime?: string;
}

/** Lightweight event creator reused by the calendar / agenda screens. */
export const QuickEventDialog = ({ open, onOpenChange, defaultDate, defaultTime }: QuickEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [start, setStart] = useState(defaultTime || "09:00");
  const [end, setEnd] = useState("10:00");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || "");
    if (defaultTime) {
      setStart(defaultTime);
      const [h, m] = defaultTime.split(":").map(Number);
      const endMin = h * 60 + m + 60;
      setEnd(`${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`);
    }
  }, [open, defaultDate, defaultTime]);

  const save = async () => {
    if (!user) return;
    if (!title.trim() || !date) {
      toast({ title: "Missing details", description: "Add a title and a date.", variant: "destructive" });
      return;
    }
    if (end <= start) {
      toast({ title: "Invalid time", description: "End time must be after start time.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("events").insert({
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      start_time: start,
      end_time: end,
      color,
      category: "other",
      published: false,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save event", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Event added", description: `${title} · ${date} ${start}` });
    await queryClient.invalidateQueries({ queryKey: ["agenda-events"] });
    await queryClient.invalidateQueries({ queryKey: ["events"] });
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Add event
          </DialogTitle>
          <DialogDescription>
            Blocks time on your calendar for seminars, workshops or anything else.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Barber workshop" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-date">Date</Label>
            <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Start</Label>
              <Input id="ev-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">End</Label>
              <Input id="ev-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Description (optional)</Label>
            <Textarea id="ev-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickEventDialog;
