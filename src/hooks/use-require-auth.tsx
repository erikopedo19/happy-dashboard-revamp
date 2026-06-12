import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Returns a guard function. Call it from any handler that hits the database.
 * If the user is not signed in, it shows a toast, navigates to /auth, and
 * returns false (so the caller can early-return).
 *
 *   const requireAuth = useRequireAuth();
 *   const onBook = () => {
 *     if (!requireAuth("Sign in to book an appointment")) return;
 *     // ... continue
 *   };
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    (message?: string) => {
      if (user) return true;
      toast.message(message ?? "Sign in to continue", {
        description: "Create a free account in seconds.",
      });
      navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
      return false;
    },
    [user, navigate]
  );
}
