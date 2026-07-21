import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ONBOARDING_STORAGE_KEY, type OnboardingDraft } from "@/pages/Onboarding";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * After login/signup, if a pre-login onboarding draft is present in
 * localStorage, write it to the database, set the user role, and
 * redirect to the right home. Runs once per session.
 */
export function useFinalizeOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;

    const raw = (() => {
      try { return localStorage.getItem(ONBOARDING_STORAGE_KEY); } catch { return null; }
    })();
    if (!raw) return;

    let draft: OnboardingDraft;
    try { draft = JSON.parse(raw); } catch { return; }
    if (!draft?.role) return;

    ran.current = true;

    (async () => {
      try {
        // 1. Role
        await supabase.auth.updateUser({ data: { role: draft.role } });

        if (draft.role === "client") {
          if (draft.clientFullName?.trim()) {
            await supabase
              .from("profiles")
              .update({ full_name: draft.clientFullName.trim(), updated_at: new Date().toISOString() } as any)
              .eq("id", user.id);
          }
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
          toast.success("Welcome to Cutzio!");
          navigate("/find-barber", { replace: true });
          return;
        }

        // 2. Team invite (if barber pasted an invite link/code)
        const rawInvite = (draft.teamInviteCode || "").trim();
        if (rawInvite) {
          // Accept full URLs or bare tokens: pull the last path/query segment.
          const token = (() => {
            try {
              const url = new URL(rawInvite);
              const qsToken = url.searchParams.get("token") || url.searchParams.get("code");
              if (qsToken) return qsToken.trim();
              const segs = url.pathname.split("/").filter(Boolean);
              return segs[segs.length - 1] || rawInvite;
            } catch {
              return rawInvite;
            }
          })();

          try {
            const { data: res, error } = await (supabase as any).rpc("accept_invitation", { token_str: token });
            if (error) throw error;
            if (res?.success) {
              localStorage.removeItem(ONBOARDING_STORAGE_KEY);
              toast.success("You've joined the team!");
              navigate("/admin", { replace: true });
              return;
            }
            toast.error("Invite couldn't be applied", { description: res?.error || "Continuing as solo — ask your owner for a fresh invite link." });
          } catch (e: any) {
            toast.error("Invalid invite link", { description: e?.message || "Continuing as solo — ask your owner for a fresh invite link." });
          }
        }

        // 3. Profile (barber)
        const fullAddress = [draft.address, draft.city].filter(Boolean).join(", ");
        const years = parseInt(draft.yearsExperience) || null;
        const cleanSlug = (raw: string) =>
          raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
        const desiredSlug = cleanSlug(draft.bookingLink || draft.businessName || "");

        // Ensure the booking link is unique; append -2, -3... if taken.
        let finalSlug: string | null = null;
        if (desiredSlug) {
          finalSlug = desiredSlug;
          for (let i = 0; i < 10; i++) {
            const { data: taken } = await (supabase as any)
              .from("profiles")
              .select("id")
              .eq("booking_link", finalSlug)
              .neq("id", user.id)
              .maybeSingle();
            if (!taken) break;
            finalSlug = `${desiredSlug}-${i + 2}`;
          }
        }

        await supabase
          .from("profiles")
          .update({
            full_name: draft.businessName || undefined,
            business_name: draft.businessName || undefined,
            address: fullAddress || null,
            description: draft.description || null,
            years_experience: years,
            is_public: true,
            booking_link: finalSlug ?? undefined,
            accepts_waitlist: !!draft.acceptsWaitlist,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", user.id);

        // 3b. Stylists (from onboarding)
        if (draft.stylists?.length) {
          try {
            await supabase.from("stylists").insert(
              draft.stylists.map((s) => ({
                user_id: user.id,
                name: s.name,
                title: s.title || "Stylist",
                is_public: true,
              }))
            );
          } catch (err) {
            console.warn("Stylist insert failed", err);
          }
        }

        // 3. Services
        if (draft.services?.length) {
          await supabase.from("services").insert(
            draft.services.map((name) => ({
              user_id: user.id, name, duration: 30, price: 25,
            }))
          );
        }

        // 4. Business hours
        try {
          await supabase.from("business_hours").delete().eq("user_id", user.id);
          await supabase.from("business_hours").insert(
            DAYS.map((n) => ({
              user_id: user.id,
              day_of_week: n,
              open_time: draft.startHour,
              close_time: draft.endHour,
              is_closed: !draft.workingDays.includes(n),
            }))
          );
        } catch {}

        // 5. Agenda
        try {
          await supabase.from("agenda_settings").delete().eq("user_id", user.id);
          await supabase.from("agenda_settings").insert({
            user_id: user.id,
            start_hour: draft.startHour,
            end_hour: draft.endHour,
            working_days: draft.workingDays,
          } as any);
        } catch {}

        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        toast.success("Welcome to Cutzio!", { description: "Your profile is ready." });
        if (location.pathname !== "/admin") navigate("/admin", { replace: true });
      } catch (e: any) {
        console.error("Onboarding finalize failed", e);
        ran.current = false; // allow retry
      }
    })();
  }, [user, navigate, location.pathname]);
}
