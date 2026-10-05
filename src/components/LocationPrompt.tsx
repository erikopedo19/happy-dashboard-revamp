import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DISMISS_KEY = "location-prompt-dismissed";

/** Asks shop owners without a map location to pin it so clients can find them. */
export function LocationPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [homeService, setHomeService] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("latitude, longitude, onboarding_completed, home_service")
        .eq("id", user.id)
        .maybeSingle();
      if (data && data.onboarding_completed && (data.latitude == null || data.longitude == null)) {
        setHomeService(!!data.home_service);
        const { data: shops } = await (supabase as any).rpc("list_public_profiles");
        setNearbyCount((shops || []).filter((s: any) => s.latitude != null).length);
        setOpen(true);
      }
    })();
  }, [user]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const pin = () => {
    if (!user || !("geolocation" in navigator)) return;
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const { error: e } = await (supabase as any)
          .from("profiles")
          .update({
            latitude: lat,
            longitude: lng,
            home_service: homeService,
            google_maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          })
          .eq("id", user.id);
        setBusy(false);
        if (e) setError("Couldn't save your location. Try again.");
        else setOpen(false);
      },
      () => {
        setBusy(false);
        setError("Allow location access to pin your shop.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#1C1C1E] p-6 text-white shadow-2xl"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <button onClick={dismiss} aria-label="Later" className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5">
              <X className="h-4 w-4" />
            </button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF375F]/15"
            >
              <MapPin className="h-7 w-7 text-[#FF375F]" />
            </motion.div>
            <h2 className="text-[22px] font-semibold">Put your shop on the map</h2>
            <p className="mt-1.5 text-[15px] text-white/60">
              Clients nearby search the map to find a barber. Pin your location so they can find and book you.
            </p>
            {nearbyCount !== null && (
              <p className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-[14px] text-white/80">
                <span className="font-semibold text-[#FF375F]">{nearbyCount}</span> shops are already on the map.
              </p>
            )}
            <button
              type="button"
              onClick={() => setHomeService(!homeService)}
              className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-left text-[15px]"
            >
              <span>👑 I also come to clients' homes</span>
              <span className={`h-6 w-10 rounded-full p-0.5 transition-colors ${homeService ? "bg-[#FF375F]" : "bg-white/20"}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${homeService ? "translate-x-4" : ""}`} />
              </span>
            </button>
            {error && <p className="mt-3 text-[13px] text-[#FF453A]">{error}</p>}
            <button
              onClick={pin}
              disabled={busy}
              className="mt-5 h-12 w-full rounded-full bg-[#FF375F] text-[15px] font-semibold active:scale-95 transition-transform disabled:opacity-60"
            >
              {busy ? "Finding you…" : "Pin my location"}
            </button>
            <button onClick={dismiss} className="mt-2 h-10 w-full text-[14px] text-white/50">Later</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
