import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Check, Calendar } from "lucide-react";

const weekDays = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 0, label: "Sun", full: "Sunday" },
];

interface OnboardingSetupProps {
  onComplete: () => void;
}

export function OnboardingSetup({ onComplete }: OnboardingSetupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"days" | "hours">("days");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState("08:00");
  const [endHour, setEndHour] = useState("18:00");
  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const hasValidHours = startHour < endHour;

  const handleSave = async () => {
    if (!user) return;
    if (workingDays.length === 0) {
      toast({ title: "Select working days", variant: "destructive" });
      return;
    }
    if (!hasValidHours) {
      toast({ title: "Closing time must be later", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error: agendaError } = await (supabase as any)
        .from("agenda_settings")
        .upsert(
          {
            user_id: user.id,
            working_days: workingDays,
            start_hour: startHour,
            end_hour: endHour,
            service_duration: 30,
          },
          { onConflict: "user_id" }
        );

      if (agendaError) throw agendaError;

      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (profileError) throw profileError;

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["agenda-settings", user.id] });
      toast({ title: "Setup complete" });
      onComplete();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not save setup.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F2F2F7] dark:bg-[#0c0c0c] flex flex-col">
      <div className="flex-1 overflow-auto px-6 py-8 md:py-12">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-[16px] bg-[#0A84FF] mb-6">
              {step === "days" ? (
                <Calendar className="w-7 h-7 text-white" />
              ) : (
                <Clock className="w-7 h-7 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] mb-2">
              {step === "days" ? "Which days do you work?" : "What hours are you open?"}
            </h1>
            <p className="text-[#8E8E93] mb-8">
              {step === "days"
                ? "Tap the days your business is open. You can change this anytime in settings."
                : "Set your opening and closing hours."}
            </p>
          </motion.div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {step === "days" ? (
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => {
                  const active = workingDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "flex-1 min-w-[4.5rem] rounded-[14px] border px-3 py-4 text-center transition-all",
                        active
                          ? "border-[#0A84FF] bg-[#0A84FF] text-white shadow-sm"
                          : "border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                      )}
                    >
                      <span className="text-sm font-semibold">{day.label}</span>
                      <p className="text-[11px] mt-0.5 opacity-80">{day.full}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full h-[64px] rounded-[16px] border border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] text-center text-2xl font-semibold outline-none focus:border-[#0A84FF]"
                    />
                    <p className="text-[11px] text-[#8E8E93] text-center mt-2">Opens</p>
                  </div>
                  <span className="text-[#8E8E93] font-medium">to</span>
                  <div className="flex-1">
                    <input
                      type="time"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full h-[64px] rounded-[16px] border border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] text-center text-2xl font-semibold outline-none focus:border-[#0A84FF]"
                    />
                    <p className="text-[11px] text-[#8E8E93] text-center mt-2">Closes</p>
                  </div>
                </div>
                {!hasValidHours && (
                  <p className="text-xs text-red-500 text-center">Closing time must be later than opening time.</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="px-6 py-6 border-t border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
        <div className="max-w-md mx-auto flex gap-3">
          {step === "days" ? (
            <Button
              onClick={() => setStep("hours")}
              disabled={workingDays.length === 0}
              className="flex-1 h-14 rounded-[14px] bg-[#0A84FF] hover:bg-[#0066d6] text-white font-semibold"
            >
              Continue
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("days")}
                className="flex-1 h-14 rounded-[14px] border-[#C6C6C8] dark:border-[#2C2C2E]"
              >
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasValidHours}
                className="flex-1 h-14 rounded-[14px] bg-[#0A84FF] hover:bg-[#0066d6] text-white font-semibold"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Done
                  </span>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
