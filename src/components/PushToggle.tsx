import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { enableBookingPush, disableBookingPush, isBookingPushEnabled, pushSupported } from "@/lib/push";

export function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();

  useEffect(() => { isBookingPushEnabled().then(setEnabled); }, []);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    if (next) {
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        toast({ title: "Notifications blocked", description: "Enable notifications in your browser/site settings to receive alerts." });
        setBusy(false);
        return;
      }
      const r = await enableBookingPush();
      if (!r.ok) {
        const isPermission = (r.reason || "").toLowerCase().includes("permission") || (r.reason || "").toLowerCase().includes("blocked");
        toast({ title: isPermission ? "Notifications blocked" : "Couldn't enable push", description: r.reason, variant: isPermission ? "default" : "destructive" });
      } else {
        setEnabled(true);
        toast({ title: "Push enabled", description: "You'll get an alert for new bookings." });
      }
    } else {
      await disableBookingPush();
      setEnabled(false);
      toast({ title: "Push disabled" });
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">Push notifications</p>
        <p className="text-sm text-[#8E8E93] dark:text-gray-500">
          {supported
            ? "Get an instant alert on this device when a new booking comes in."
            : "Not supported on this browser. On iPhone, add to Home Screen first."}
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} disabled={!supported || busy} />
    </div>
  );
}
