import { isNative } from "@/lib/native";

const scheduledTimeouts = new Map<number, number>();

export const notificationId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 2147483000) + 1;
};

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") return true;
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === "granted";
    }

    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export async function notifyNow(title: string, body: string, tag?: string) {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [{ id: notificationId(tag || title), title, body }],
      });
      return;
    }

    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const registration = "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined;
    if (registration) {
      await registration.showNotification(title, { body, icon: "/logo.svg", tag });
    } else {
      new Notification(title, { body, icon: "/logo.svg", tag });
    }
  } catch {
    /* notifications are best-effort */
  }
}

export async function scheduleLeaveNotification({
  key,
  title,
  body,
  at,
}: {
  key: string;
  title: string;
  body: string;
  at: Date;
}) {
  const id = notificationId(key);
  await cancelScheduledNotification(id);

  if (at.getTime() <= Date.now()) {
    await notifyNow(title, body, key);
    return;
  }

  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at },
          },
        ],
      });
    } catch {
      /* plugin unavailable */
    }
    return;
  }

  const delay = at.getTime() - Date.now();
  // Browser Notification has no scheduler; keep this as an in-session reminder.
  if (delay <= 24 * 60 * 60 * 1000) {
    const timeout = window.setTimeout(() => {
      scheduledTimeouts.delete(id);
      void notifyNow(title, body, key);
    }, delay);
    scheduledTimeouts.set(id, timeout);
  }
}

export async function cancelScheduledNotification(id: number) {
  const timeout = scheduledTimeouts.get(id);
  if (timeout) {
    window.clearTimeout(timeout);
    scheduledTimeouts.delete(id);
  }

  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    /* plugin unavailable */
  }
}
