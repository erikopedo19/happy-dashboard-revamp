"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar, Check, Info, MessageSquare, Star } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type N = { id: string; type: string; title: string; body: string | null; read: boolean; created_at: string };

const HIDE_PREFIX = ["/auth", "/book/", "/manage/", "/superadmin"];

const typeMeta: Record<string, { icon: typeof Bell; color: string; darkColor: string }> = {
  appointment: { icon: Calendar, color: "text-blue-600 bg-blue-100", darkColor: "text-blue-300 bg-blue-500/20" },
  review: { icon: Star, color: "text-amber-600 bg-amber-100", darkColor: "text-amber-300 bg-amber-500/20" },
  message: { icon: MessageSquare, color: "text-emerald-600 bg-emerald-100", darkColor: "text-emerald-300 bg-emerald-500/20" },
  default: { icon: Info, color: "text-gray-600 bg-gray-100", darkColor: "text-gray-300 bg-gray-700/40" },
};

export function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState<N[]>([]);
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

    const load = async () => {
      const { data } = await (supabase as any)
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20);
      if (active) setItems(data || []);
    };
    load();

    const uid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const channel = (supabase as any).channel(`notif:${user.id}:${uid}`);
    channel
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new as N;
          setItems((prev) => [n, ...prev].slice(0, 20));
          toast({ title: n.title, description: n.body || undefined });
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && "serviceWorker" in navigator) {
            navigator.serviceWorker.ready
              .then((reg) => reg.showNotification(n.title, { body: n.body || "", icon: "/logo.svg", tag: n.id }))
              .catch(() => {});
          }
        }
      )
      .subscribe();

    return () => { active = false; (supabase as any).removeChannel(channel); };
  }, [user, hidden]);

  if (hidden) return null;

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative w-11 h-11 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur border border-black/5 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-105 transition"
          aria-label="Notifications"
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
              return (
                <div
                  key={i.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0 ${!i.read ? "bg-blue-500/[0.03]" : ""}`}
                >
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${meta.color} dark:${meta.darkColor}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${!i.read ? "font-semibold" : "font-medium"}`}>{i.title}</div>
                    {i.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{i.body}</div>}
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
