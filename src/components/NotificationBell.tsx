import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type N = { id: string; type: string; title: string; body: string | null; read: boolean; created_at: string };

const HIDE_PREFIX = ["/auth", "/book/", "/manage/", "/superadmin", "/find-barber", "/find-barbershop", "/my-bookings", "/me", "/favorites"];

export function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);

  const role = (user?.user_metadata as any)?.role;
  const hidden = !user || role === "client" || HIDE_PREFIX.some((p) => location.pathname === p || location.pathname.startsWith(p)) || location.pathname === "/";

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

    const channel = (supabase as any)
      .channel(`notif:${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new as N;
          setItems((prev) => [n, ...prev].slice(0, 20));
          toast({ title: n.title, description: n.body || undefined });
          // Browser native notification (if granted)
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(n.title, { body: n.body || "", icon: "/logo.svg" }); } catch {}
          }
        }
      ).subscribe();

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-[60] w-11 h-11 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur border border-black/5 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-105 transition"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-[#1C1C1E] dark:text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e11d48] text-[10px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
          <div className="font-semibold">Notifications</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : items.map((i) => (
            <div key={i.id} className={`px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0 ${!i.read ? "bg-blue-500/5" : ""}`}>
              <div className="text-sm font-medium">{i.title}</div>
              {i.body && <div className="text-xs text-muted-foreground mt-0.5">{i.body}</div>}
              <div className="text-[10px] text-muted-foreground/70 mt-1">{formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
