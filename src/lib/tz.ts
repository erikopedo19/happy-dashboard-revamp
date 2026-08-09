// Timezone-safe helpers for booking hour sync across agenda, Find Barber, and booking link.

export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const listTimezones = (): string[] => {
  try {
    // @ts-ignore - not in older TS lib defs
    const list = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
    if (list?.length) return list;
  } catch {
    // fall through
  }
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "America/Argentina/Buenos_Aires",
    "Europe/London",
    "Europe/Dublin",
    "Europe/Lisbon",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Amsterdam",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Zurich",
    "Europe/Vienna",
    "Europe/Prague",
    "Europe/Warsaw",
    "Europe/Athens",
    "Europe/Istanbul",
    "Europe/Bucharest",
    "Europe/Sofia",
    "Europe/Tirane",
    "Europe/Belgrade",
    "Africa/Cairo",
    "Africa/Casablanca",
    "Africa/Johannesburg",
    "Asia/Dubai",
    "Asia/Tehran",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Perth",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
};

// Returns YYYY-MM-DD for `d` as seen in `tz`.
export const dateStrInTz = (d: Date, tz: string): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

// Minutes since midnight for `d` as seen in `tz`.
export const minutesInTz = (d: Date, tz: string): number => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  } catch {
    return d.getHours() * 60 + d.getMinutes();
  }
};

export const timeStrToMinutes = (t: string): number => {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Format a friendly timezone label with the current UTC offset.
export const formatTzLabel = (tz: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return off ? `${tz.replace(/_/g, " ")} (${off})` : tz.replace(/_/g, " ");
  } catch {
    return tz.replace(/_/g, " ");
  }
};
