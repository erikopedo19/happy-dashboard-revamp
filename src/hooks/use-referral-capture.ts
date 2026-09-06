import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PENDING_KEY = "cutzio:pending-referral";
const DONE_KEY = "cutzio:referral-claimed";

/**
 * Captures ?ref=CODE from any URL and, once the visitor is signed in,
 * attributes the signup so the inviter gets a free month.
 */
export function useReferralCapture() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Capture the code as soon as it shows up in the URL
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("ref");
    if (code) {
      try {
        localStorage.setItem(PENDING_KEY, code.trim().toUpperCase());
      } catch {
        /* ignore */
      }
    }
  }, [location.search]);

  // Claim it after sign-in
  useEffect(() => {
    if (loading || !user) return;
    let code: string | null = null;
    try {
      if (localStorage.getItem(DONE_KEY) === user.id) return;
      code = localStorage.getItem(PENDING_KEY);
    } catch {
      return;
    }
    if (!code) return;

    (async () => {
      try {
        await supabase.rpc("claim_referral", { p_code: code! });
      } catch {
        /* ignore */
      } finally {
        try {
          localStorage.removeItem(PENDING_KEY);
          localStorage.setItem(DONE_KEY, user.id);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event("premium:refresh"));
      }
    })();
  }, [user, loading]);
}

export const REFERRAL_PENDING_KEY = PENDING_KEY;
