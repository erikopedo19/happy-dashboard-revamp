import { useState } from "react";
import {
  Bell,
  Calendar,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationType = "all" | "bookings" | "clients" | "alerts" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const tabConfig: {
  id: NotificationType;
  label: string;
  color: string;
  activeColor: string;
  dotColor: string;
  icon: typeof Bell;
}[] = [
  {
    id: "all",
    label: "All",
    color: "text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100",
    activeColor: "text-gray-900 border-gray-900 bg-gray-900 text-white",
    dotColor: "bg-gray-500",
    icon: Bell,
  },
  {
    id: "bookings",
    label: "Bookings",
    color: "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100",
    activeColor: "text-white border-blue-600 bg-blue-600",
    dotColor: "bg-blue-500",
    icon: Calendar,
  },
  {
    id: "clients",
    label: "Clients",
    color: "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
    activeColor: "text-white border-emerald-600 bg-emerald-600",
    dotColor: "bg-emerald-500",
    icon: UserPlus,
  },
  {
    id: "alerts",
    label: "Alerts",
    color: "text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100",
    activeColor: "text-white border-orange-600 bg-orange-600",
    dotColor: "bg-orange-500",
    icon: AlertTriangle,
  },
  {
    id: "system",
    label: "System",
    color: "text-purple-600 border-purple-200 bg-purple-50 hover:bg-purple-100",
    activeColor: "text-white border-purple-600 bg-purple-600",
    dotColor: "bg-purple-500",
    icon: Info,
  },
];

const notificationIconMap: Record<NotificationType, { icon: typeof Bell; bgColor: string; iconColor: string }> = {
  all: { icon: Bell, bgColor: "bg-gray-100", iconColor: "text-gray-600" },
  bookings: { icon: Calendar, bgColor: "bg-blue-100", iconColor: "text-blue-600" },
  clients: { icon: UserPlus, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  alerts: { icon: AlertTriangle, bgColor: "bg-orange-100", iconColor: "text-orange-600" },
  system: { icon: Info, bgColor: "bg-purple-100", iconColor: "text-purple-600" },
};

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "bookings",
    title: "New Booking",
    message: "John D. booked a Haircut for tomorrow at 10:00 AM",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "clients",
    title: "New Client Registered",
    message: "Sarah M. created an account and is browsing services",
    time: "15 min ago",
    read: false,
  },
  {
    id: "3",
    type: "alerts",
    title: "Cancellation",
    message: "Mike R. cancelled his 3:00 PM appointment today",
    time: "30 min ago",
    read: false,
  },
  {
    id: "4",
    type: "system",
    title: "Profile Update",
    message: "Your booking page is now live and accepting appointments",
    time: "1 hr ago",
    read: true,
  },
  {
    id: "5",
    type: "bookings",
    title: "Booking Confirmed",
    message: "Alex W. confirmed their Beard Trim for Friday at 2:30 PM",
    time: "2 hr ago",
    read: true,
  },
  {
    id: "6",
    type: "alerts",
    title: "No-show Alert",
    message: "Client David L. did not show up for his 11:00 AM slot",
    time: "3 hr ago",
    read: true,
  },
  {
    id: "7",
    type: "clients",
    title: "Returning Client",
    message: "Emma K. re-booked after 2 months — welcome back!",
    time: "5 hr ago",
    read: true,
  },
  {
    id: "8",
    type: "system",
    title: "Weekly Summary",
    message: "You had 24 bookings this week, up 12% from last week",
    time: "1 day ago",
    read: true,
  },
];

export function NotificationTabs() {
  const [activeTab, setActiveTab] = useState<NotificationType>("all");
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const filtered =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => n.type === activeTab);

  const unreadCounts: Record<NotificationType, number> = {
    all: notifications.filter((n) => !n.read).length,
    bookings: notifications.filter((n) => n.type === "bookings" && !n.read).length,
    clients: notifications.filter((n) => n.type === "clients" && !n.read).length,
    alerts: notifications.filter((n) => n.type === "alerts" && !n.read).length,
    system: notifications.filter((n) => n.type === "system" && !n.read).length,
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabConfig.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = unreadCounts[tab.id];
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 whitespace-nowrap",
                isActive ? tab.activeColor : tab.color
              )}
            >
              <TabIcon className="h-3 w-3" />
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold",
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-current/10 text-current"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-700 h-7"
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-6 w-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No notifications</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const config = notificationIconMap[notif.type];
            const NotifIcon = config.icon;
            return (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer group",
                  notif.read
                    ? "bg-white border-gray-100 hover:border-gray-200"
                    : "bg-white border-l-[3px] shadow-sm",
                  !notif.read && notif.type === "bookings" && "border-l-blue-500",
                  !notif.read && notif.type === "clients" && "border-l-emerald-500",
                  !notif.read && notif.type === "alerts" && "border-l-orange-500",
                  !notif.read && notif.type === "system" && "border-l-purple-500"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    config.bgColor
                  )}
                >
                  <NotifIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {notif.time}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(notif.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
