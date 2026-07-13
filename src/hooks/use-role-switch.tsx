import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AppRole = "barber" | "client";

export function useRoleSwitch() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  const role: AppRole =
    (user?.user_metadata?.role as AppRole) === "client" ? "client" : "barber";

  const setRole = async (next: AppRole) => {
    if (!user || next === role) return;
    setSwitching(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ data: { role: next } });
      if (authError) throw authError;

      // Sync the profiles table (used as a fallback source of truth in some queries).
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({ role: next, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileError) {
        console.error("Role sync to profiles failed", profileError);
      }

      try { localStorage.setItem("cutzio:mode-choice", next); } catch {}

      // Force the AuthContext user to reflect the new metadata before navigation.
      await refreshUser();

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
