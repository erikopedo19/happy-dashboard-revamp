import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BellRing, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

/** "Join cancellation list" for a barber's booking form; hidden unless the barber turned it on. */
export function CancellationListButton({ barberId }: { barberId?: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const { data: enabled = false } = useQuery({
    queryKey: ["accepts-waitlist", barberId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("accepts_waitlist").eq("id", barberId!).maybeSingle();
      return !!data?.accepts_waitlist;
    },
    enabled: !!barberId,
    staleTime: 5 * 60_000,
  });

  if (!barberId || !enabled || user?.id === barberId) return null;

  const join = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setJoining(true);
    haptic("light");
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: { success?: boolean; error?: string } | null; error: { message: string } | null }>;
    const { data: res, error } = await rpc("join_cancellation_waitlist", { _barber_id: barberId });
    setJoining(false);
    if (error || !res?.success) {
      haptic("error");
      toast({ title: "Couldn't join the list", description: res?.error || error?.message, variant: "destructive" });
      return;
    }
    haptic("success");
    setJoined(true);
    toast({ title: "You're on the list", description: "We'll let you know the moment a slot opens in the next 7 days." });
  };

  return (
    <motion.button
      type="button"
      onClick={join}
      disabled={joining || joined}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 flex w-full items-center gap-3 rounded-[18px] bg-black/[0.04] p-3.5 text-left transition disabled:opacity-70 dark:bg-white/[0.06]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FF2D46] text-white">
        {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : joined ? <Check className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
          {joined ? "You're on the list" : "Join cancellation list"}
        </span>
        <span className="block text-[12px] text-[#8E8E93]">
          {joined ? "We'll alert you when a slot opens." : "Get alerted if an earlier slot opens up."}
        </span>
      </span>
    </motion.button>
  );
}
