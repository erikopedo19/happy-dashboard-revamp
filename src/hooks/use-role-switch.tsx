import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AppRole = "barber" | "client";

export function useRoleSwitch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  const role: AppRole =
    (user?.user_metadata?.role as AppRole) === "client" ? "client" : "barber";

  const setRole = async (next: AppRole) => {
    if (!user || next === role) return;
    setSwitching(true);
    try {
      await supabase.auth.updateUser({ data: { role: next } });
      try {
        await (supabase as any)
          .from("profiles")
          .update({ role: next, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      } catch {}
      toast({ title: next === "client" ? "Switched to client mode" : "Switched to barber mode" });
      navigate(next === "client" ? "/find-barber" : "/admin", { replace: true });
    } catch (e: any) {
      toast({ title: "Couldn't switch mode", description: e?.message, variant: "destructive" });
    } finally {
      setSwitching(false);
    }
  };

  return { role, setRole, switching };
}
