// Pure helpers for the owner's morning briefing (kept separate so they can be tested).
export const BRIEFING_TZ = "Europe/Athens";
export const BRIEFING_HOUR = 9;

/** Local date (YYYY-MM-DD) and hour in the briefing time zone. */
export function localParts(now: Date, tz = BRIEFING_TZ) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** UTC instant range [start, end) covering a whole local day. */
export function localDayRangeUtc(date: string, tz = BRIEFING_TZ) {
  const offsetAt = (iso: string) => {
    const d = new Date(iso);
    const local = new Date(d.toLocaleString("en-US", { timeZone: tz }));
    const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return local.getTime() - utc.getTime();
  };
  const startGuess = `${date}T00:00:00Z`;
  const endGuess = `${shiftDate(date, 1)}T00:00:00Z`;
  const start = new Date(new Date(startGuess).getTime() - offsetAt(startGuess)).toISOString();
  const end = new Date(new Date(endGuess).getTime() - offsetAt(endGuess)).toISOString();
  return { start, end };
}

/** Scheduled runs only send at 9:00 local time; manual runs (force) always may. */
export function shouldSendNow(now: Date, force = false) {
  return force || localParts(now).hour === BRIEFING_HOUR;
}

export function briefingDates(now: Date) {
  const today = localParts(now).date;
  return { today, yesterday: shiftDate(today, -1), weekAgo: shiftDate(today, -7) };
}

export const money = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format((cents || 0) / 100);
