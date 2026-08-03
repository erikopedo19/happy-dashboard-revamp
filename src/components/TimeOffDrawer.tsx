import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Palmtree, Trash2 } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";

const REASONS = [
  { key: "vacation", label: "Vacation 🏝️" },
  { key: "sick", label: "Sick 🤒" },
  { key: "personal", label: "Personal 🙌" },
  { key: "closed", label: "Closed 🔒" },
  { key: "custom", label: "Write reason ✍️" },
];

const toKey = (d: Date) => format(d, "yyyy-MM-dd");

interface TimeOffDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export function TimeOffDrawer({ open, onOpenChange, initialDate }: TimeOffDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<Date>(startOfMonth(initialDate ?? new Date()));
  const [selected, setSelected] = useState<string[]>(initialDate ? [toKey(initialDate)] : []);
  const [reason, setReason] = useState<string>("vacation");
  const [saving, setSaving] = useState(false);

  const { data: daysOff = [], refetch } = useQuery<{ id: string; off_date: string; reason: string | null }[]>({
    queryKey: ["time_off", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("time_off")
        .select("id, off_date, reason")
        .eq("user_id", user.id)
        .order("off_date", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!user && open,
  });

  const offSet = useMemo(() => new Set(daysOff.map((d) => d.off_date)), [daysOff]);

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const today = startOfDay(new Date());

  const dragging = useRef(false);
  const dragMode = useRef<"add" | "remove">("add");
  const lastKey = useRef<string | null>(null);

  const applyDay = (key: string) => {
    setSelected((prev) => {
      const has = prev.includes(key);
      if (dragMode.current === "add") return has ? prev : [...prev, key];
      return has ? prev.filter((k) => k !== key) : prev;
    });
  };

  const startDrag = (day: Date) => {
    if (isBefore(day, today)) return;
    const key = toKey(day);
    dragging.current = true;
    dragMode.current = selected.includes(key) ? "remove" : "add";
    lastKey.current = key;
    haptic("selection");
    applyDay(key);
  };

  const onGridPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cell = el?.closest?.("[data-daykey]") as HTMLElement | null;
    const key = cell?.dataset.daykey;
    if (!key || key === lastKey.current || cell?.dataset.past === "1") return;
    lastKey.current = key;
    haptic("selection");
    applyDay(key);
  };

  const endDrag = () => {
    dragging.current = false;
    lastKey.current = null;
  };


  const save = async () => {
    if (!user || selected.length === 0) return;
    setSaving(true);
    try {
      const rows = selected.map((off_date) => ({ user_id: user.id, off_date, reason }));
      const { error } = await (supabase as any)
        .from("time_off")
        .upsert(rows, { onConflict: "user_id,off_date" });
      if (error) throw error;
      haptic("success");
      toast({ title: "Days off saved", description: "These days won't appear on your booking forms." });
      setSelected([]);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["public-time-off"] });
    } catch (e: any) {
      haptic("error");
      toast({ title: "Couldn't save", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeDay = async (id: string) => {
    haptic("warning");
    const { error } = await (supabase as any).from("time_off").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["public-time-off"] });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-white/10 bg-[#0f0f12] text-white max-h-[92vh]">
        <div className="mx-auto w-full max-w-md px-5 pb-8 pt-2 overflow-y-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Palmtree className="w-5 h-5 text-white/80" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold leading-tight">Days off</h2>
              <p className="text-[13px] text-white/50">Tap or drag across days — they are hidden from booking</p>
            </div>
          </div>

          {/* Month header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { haptic("light"); setMonth(addMonths(month, -1)); }}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[15px] font-semibold">{format(month, "MMMM yyyy")}</span>
            <button
              onClick={() => { haptic("light"); setMonth(addMonths(month, 1)); }}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-medium text-white/35 py-1">{d}</div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={format(month, "yyyy-MM")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-7 gap-1 touch-none select-none"
              onPointerMove={onGridPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
            >
              {grid.map((day) => {
                const key = toKey(day);
                const inMonth = isSameMonth(day, month);
                const past = isBefore(day, today);
                const isSelected = selected.includes(key);
                const isOff = offSet.has(key);
                return (
                  <button
                    key={key}
                    data-daykey={key}
                    data-past={past ? "1" : "0"}
                    onPointerDown={(e) => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); startDrag(day); }}
                    disabled={past}
                    className={cn(
                      "aspect-square rounded-2xl text-[14px] font-medium flex flex-col items-center justify-center transition-all active:scale-95",
                      !inMonth && "opacity-25",
                      past && "opacity-20",
                      isSelected
                        ? "bg-white text-black"
                        : isOff
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-white/[0.04] text-white/80"
                    )}
                  >
                    {format(day, "d")}
                    {isSameDay(day, today) && (
                      <span className={cn("w-1 h-1 rounded-full mt-0.5", isSelected ? "bg-black" : "bg-white/60")} />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Reasons */}
          <div className="flex flex-wrap gap-2 mt-5">
            {REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => { haptic("selection"); setReason(r.key); }}
                className={cn(
                  "px-3.5 h-9 rounded-full text-[13px] font-medium transition-all active:scale-95",
                  reason === r.key ? "bg-white text-black" : "bg-white/[0.06] text-white/70"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Button
            onClick={save}
            disabled={selected.length === 0 || saving}
            className="w-full h-12 mt-5 rounded-2xl bg-white text-black hover:bg-white/90 text-[15px] font-semibold disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Mark ${selected.length || ""} day${selected.length === 1 ? "" : "s"} off`}
          </Button>

          {daysOff.length > 0 && (
            <div className="mt-6">
              <p className="text-[12px] uppercase tracking-wider text-white/35 mb-2">Upcoming days off</p>
              <div className="space-y-2">
                {daysOff.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
                    <div>
                      <div className="text-[14px] font-medium">{format(new Date(d.off_date), "EEE, MMM d")}</div>
                      <div className="text-[12px] text-white/40 capitalize">{d.reason || "closed"}</div>
                    </div>
                    <button
                      onClick={() => removeDay(d.id)}
                      className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition"
                    >
                      <Trash2 className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
