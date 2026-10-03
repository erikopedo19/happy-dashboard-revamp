"use client";

import { useEffect, useState } from "react";
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

export function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
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
      const { data } = await supabase.rpc("get_my_waitlist_offers");
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

  if (hidden) return null;

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
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e11d48] text-[10px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-50 w-80 p-0 rounded-2xl border border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#0E0E0F]/95 backdrop-blur-2xl shadow-2xl max-h-96 overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur">
          <div className="font-semibold text-sm">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            items.map((i) => {
              const meta = typeMeta[i.type] || typeMeta.default;
              const Icon = meta.icon;
              const offer = i.type === "waitlist_offer" && i.appointment_id
                ? waitlistOffers.get(i.appointment_id)
                : undefined;
              return (
                <div
                  key={i.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0 ${!i.read ? "bg-blue-500/[0.03]" : ""}`}
                >
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${!i.read ? "font-semibold" : "font-medium"}`}>{i.title}</div>
                    {i.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{i.body}</div>}
                    {offer && (
                      <Link
                        to={`/waitlist/claim/${offer.claim_token}`}
                        onClick={() => haptic("medium")}
                        className="mt-2 inline-flex h-9 items-center rounded-full bg-rose-500 px-3 text-[12px] font-semibold text-white active:scale-95"
                      >
                        Claim it
                      </Link>
                    )}
                    <div className="text-[10px] text-muted-foreground/70 mt-1">{formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</div>
                  </div>
                  {!i.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#007AFF]" />}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
