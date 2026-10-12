"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellRing, Calendar, Check, Info, MessageSquare, Navigation, Star } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { haptic } from "@/lib/haptics";
import { ensureNotificationPermission, notifyNow } from "@/lib/nativeNotifications";
import { TNumber } from "@/components/ui/t-number";

type N = { id: string; type: string; title: string; body: string | null; read: boolean; created_at: string; appointment_id?: string | null };
type WaitlistOffer = { claim_token: string; offered_appointment_id: string; status: string };

const HIDE_PREFIX = ["/auth", "/book/", "/manage/", "/superadmin", "/waitlist"];

const typeMeta: Record<string, { icon: typeof Bell; color: string }> = {
  appointment: { icon: Calendar, color: "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/20" },
  waitlist_offer: { icon: BellRing, color: "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-500/20" },
  waitlist_claimed: { icon: Check, color: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/20" },
  client_eta: { icon: Navigation, color: "text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-500/20" },
  review: { icon: Star, color: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/20" },
  message: { icon: MessageSquare, color: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/20" },
  default: { icon: Info, color: "text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700/40" },
};

let inlineBells = 0;
const bellListeners = new Set<() => void>();
const emitBells = () => bellListeners.forEach((l) => l());
const subscribeBells = (l: () => void) => {
  bellListeners.add(l);
  return () => bellListeners.delete(l);
};

export function NotificationBell({ floating = false }: { floating?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  const inlineMounted = useSyncExternalStore(subscribeBells, () => inlineBells > 0, () => false);

  useEffect(() => {
    if (floating) return;
    inlineBells++;
    emitBells();
    return () => {
      inlineBells--;
      emitBells();
    };
  }, [floating]);

  const [items, setItems] = useState<N[]>([]);
  const [waitlistOffers, setWaitlistOffers] = useState<Map<string, WaitlistOffer>>(new Map());
  const [storiesOpen, setStoriesOpen] = useState(0);

  useEffect(() => {
    const onOpen = () => setStoriesOpen((n) => n + 1);
    const onClose = () => setStoriesOpen((n) => Math.max(0, n - 1));
    window.addEventListener("stories:open", onOpen);
    window.addEventListener("stories:close", onClose);
    return () => {
      window.removeEventListener("stories:open", onOpen);
      window.removeEventListener("stories:close", onClose);
    };
  }, []);

  const hidden = !user || storiesOpen > 0 || HIDE_PREFIX.some((p) => location.pathname === p || location.pathname.startsWith(p)) || location.pathname === "/";

  useEffect(() => {
    if (!user || hidden) return;
    let active = true;

    const loadOffers = async () => {
      const { data } = await (supabase.rpc as any)("get_my_waitlist_offers");
      if (!active) return;
      const map = new Map<string, WaitlistOffer>();
      (data || []).forEach((offer: WaitlistOffer) => {
        if (offer.status === "offered" && offer.offered_appointment_id && offer.claim_token) {
          map.set(offer.offered_appointment_id, offer);
        }
      });
      setWaitlistOffers(map);
    };

    const load = async () => {
      const { data } = await supabase
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20);
      if (active) setItems(data || []);
    };
    load();
    loadOffers();

    const uid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const channel = supabase.channel(`notif:${user.id}:${uid}`);
    channel
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: { new: N }) => {
          const n = payload.new as N;
          setItems((prev) => [n, ...prev].slice(0, 20));
          toast({ title: n.title, description: n.body || undefined });
          if (n.type === "waitlist_offer") {
            haptic("warning");
            loadOffers();
          }
          void notifyNow(n.title, n.body || "", n.id);
        }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "cancellation_waitlist", filter: `client_user_id=eq.${user.id}` },
        loadOffers
      )
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user, hidden]);

  if (hidden || (floating && inlineMounted)) return null;

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative w-11 h-11 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur border border-black/5 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-105 transition"
          aria-label="Notifications"
          onClick={() => void ensureNotificationPermission()}
        >
          <Bell className="w-5 h-5 text-[#1C1C1E] dark:text-white" />
          {unread > 0 && (
            <span className="t-badge" data-open="true">
              <span className="t-badge-dot min-w-[18px] h-[18px] px-1 rounded-full bg-[#E0152F] text-[10px] font-bold text-white flex items-center justify-center">
                <TNumber value={unread > 9 ? "9+" : unread} />
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-50 w-80 p-0 rounded-3xl border border-black/5 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl shadow-2xl max-h-96 overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
      >
        {/* Morph header — mirrors the activity-dropdown card */}
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {unread > 0 ? `${unread} New ${unread === 1 ? "Activity" : "Activities"}` : "Notifications"}
            </h3>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              What's happening around you
            </p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-3">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="space-y-1">
              {items.map((i, idx) => {
                const meta = typeMeta[i.type] || typeMeta.default;
                const Icon = meta.icon;
                const offer = i.type === "waitlist_offer" && i.appointment_id
                  ? waitlistOffers.get(i.appointment_id)
                  : undefined;
                return (
                  <div
                    key={i.id}
                    className={`cz-bell-item flex items-start gap-3 rounded-xl p-3 transition-colors duration-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 ${!i.read ? "bg-blue-500/[0.03]" : ""}`}
                    style={{ animationDelay: `${idx * 75}ms` }}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-sm truncate ${!i.read ? "font-semibold" : "font-medium"} text-neutral-900 dark:text-white`}>{i.title}</h4>
                      {i.body && <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{i.body}</p>}
                      {offer && (
                        <Link
                          to={`/waitlist/claim/${offer.claim_token}`}
                          onClick={() => haptic("medium")}
                          className="mt-2 inline-flex h-9 items-center rounded-full bg-rose-500 px-3 text-[12px] font-semibold text-white active:scale-95"
                        >
                          Claim it
                        </Link>
                      )}
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                      {formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
