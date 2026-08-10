import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBannerReminder() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkBannerReminder = async () => {
      try {
        // Get user's profile to check banner and last reminder
        const { data: profile } = await supabase
          .from("profiles")
          .select("banner_url, banner_reminder_sent_at")
          .eq("id", user.id)
          .single();

        if (!profile) return;

        // Only send reminder if user has no banner
        if (!profile.banner_url || profile.banner_url === "") {
          const now = new Date();
          const lastReminder = profile.banner_reminder_sent_at ? new Date(profile.banner_reminder_sent_at) : null;
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

          // Check if 30 days have passed since last reminder (or never sent)
          const shouldSendReminder = !lastReminder || (now.getTime() - lastReminder.getTime()) > thirtyDaysInMs;

          if (shouldSendReminder) {
            // Insert notification
            const { error: notifError } = await supabase
              .from("notifications")
              .insert({
                user_id: user.id,
                type: "default",
                title: "Add a banner to your profile",
                body: "Customize your business page with a banner image to make it stand out. Go to Settings → Business → Business identity.",
                read: false,
              });

            if (!notifError) {
              // Update the reminder timestamp
              await supabase
                .from("profiles")
                .update({ banner_reminder_sent_at: now.toISOString() })
                .eq("id", user.id);
            }
          }
        }
      } catch (error) {
        console.error("Error checking banner reminder:", error);
      }
    };

    checkBannerReminder();
  }, [user]);
}
