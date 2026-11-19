import { format } from "date-fns";
import { buildSeries, type SeriesRow, type Totals } from "@/components/reports/ReportsVisuals";

export type RangeValue = "today" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear";

export interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  price: number | null;
  status: string | null;
  stylist_id: string | null;
  service_id: string;
  customer_id: string | null;
  service?: { id: string; name: string; color: string | null; duration: number | null } | null;
}
export interface StylistRow { id: string; name: string; title: string | null; satisfaction: number | null }
export interface ReviewRow { id: string; rating: number; comment: string | null; reviewer_name: string | null; created_at: string }
export interface TopCustomerRow { id: string; name: string; bookings: number; revenue: number; lastVisit: string | null; initials: string }
export type PrevRow = SeriesRow & { status?: string | null };

export const RANGES: { value: RangeValue; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "7 Days" },
  { value: "last30days", label: "30 Days" },
  { value: "thisMonth", label: "Month" },
  { value: "lastMonth", label: "Last Mo." },
  { value: "thisYear", label: "Year" },
];

export function getRangeDates(range: RangeValue) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (range === "last7days") start.setDate(now.getDate() - 6);
  else if (range === "last30days") start.setDate(now.getDate() - 29);
  else if (range === "thisMonth") start.setDate(1);
  else if (range === "lastMonth") {
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    end.setDate(0);
  } else if (range === "thisYear") start.setMonth(0, 1);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - days);
  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);
  return {
    start, end, days, prevStart,
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    prevStartDate: format(prevStart, "yyyy-MM-dd"),
    prevEndDate: format(prevEnd, "yyyy-MM-dd"),
  };
}

const CANCELLED = new Set(["cancelled", "canceled"]);
const NO_SHOW = new Set(["no_show", "no-show", "noshow"]);
const UPCOMING = new Set(["scheduled", "confirmed"]);
/** A cancelled or missed booking never brought money in. */
export const isLost = (status?: string | null) => !!status && (CANCELLED.has(status) || NO_SHOW.has(status));

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
const hourLabel = (h: number) => (h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);
const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const earningRows = <T extends PrevRow>(rows: T[]) => rows.map((r) => (isLost(r.status) ? { ...r, price: 0 } : r));
const totalsOf = (rows: PrevRow[]): Totals => ({
  revenue: rows.reduce((s, r) => s + (isLost(r.status) ? 0 : r.price || 0), 0),
  bookings: rows.length,
  clients: new Set(rows.map((r) => r.customer_id).filter(Boolean)).size,
});

/** Revenue per booking that was kept, the same rule the current period's average ticket uses. */
function averageTicketOf(rows: PrevRow[]) {
  let revenue = 0, kept = 0;
  for (const r of rows) if (!isLost(r.status)) { revenue += r.price || 0; kept += 1; }
  return kept ? revenue / kept : 0;
}

export function computeTrend(cur: PrevRow[], prev: PrevRow[], range: ReturnType<typeof getRangeDates>) {
  return {
    series: buildSeries(earningRows(cur), range.start, range.days),
    prevSeries: buildSeries(earningRows(prev), range.prevStart, range.days),
    totals: totalsOf(cur),
    prevTotals: totalsOf(prev),
    prevAverageTicket: averageTicketOf(prev),
  };
}

/** Every Reports statistic, from one walk over the range's appointments. */
export function computeAnalytics(appointments: AppointmentRow[], stylists: StylistRow[], servicesCount: number, rangeDays: number) {
  let totalRevenue = 0, completed = 0, scheduled = 0, cancelled = 0, noShows = 0, minutesBooked = 0, upcomingRevenue = 0, weekendCount = 0, kept = 0;
  const customers = new Map<string, number>();
  const daily = new Map<string, { date: string; revenue: number; appointments: number; completed: number }>();
  const services = new Map<string, { name: string; bookings: number; revenue: number }>();
  const byStylist = new Map<string, { bookings: number; completed: number; revenue: number }>();
  const dow = [0, 0, 0, 0, 0, 0, 0];
  const hours = HOURS.map(() => 0);
  const heatmap = DAYS.map(() => HOURS.map(() => 0));
  const parts = [0, 0, 0];

  for (const a of appointments) {
    const lost = isLost(a.status);
    const price = lost ? 0 : a.price || 0;
    const status = a.status || "";
    totalRevenue += price;
    if (!lost) kept += 1;
    if (status === "completed") completed += 1;
    else if (UPCOMING.has(status)) { scheduled += 1; upcomingRevenue += price; }
    else if (CANCELLED.has(status)) cancelled += 1;
    else if (NO_SHOW.has(status)) noShows += 1;
    minutesBooked += a.service?.duration || 0;
    if (a.customer_id) customers.set(a.customer_id, (customers.get(a.customer_id) || 0) + 1);

    const d = daily.get(a.appointment_date) || { date: a.appointment_date, revenue: 0, appointments: 0, completed: 0 };
    d.revenue += price; d.appointments += 1;
    if (status === "completed") d.completed += 1;
    daily.set(a.appointment_date, d);

    const name = a.service?.name || "Service";
    const s = services.get(name) || { name, bookings: 0, revenue: 0 };
    s.bookings += 1; s.revenue += price;
    services.set(name, s);

    if (a.stylist_id) {
      const st = byStylist.get(a.stylist_id) || { bookings: 0, completed: 0, revenue: 0 };
      st.bookings += 1; st.revenue += price;
      if (status === "completed") st.completed += 1;
      byStylist.set(a.stylist_id, st);
    }

    const day = new Date(`${a.appointment_date}T00:00:00`).getDay();
    const hour = parseInt((a.appointment_time || "0").split(":")[0], 10);
    if (!Number.isNaN(day)) {
      dow[day] += 1;
      if (day === 0 || day === 6) weekendCount += 1;
      if (hour >= 8 && hour <= 20) heatmap[day][hour - 8] += 1;
    }
    if (hour >= 8 && hour <= 20) hours[hour - 8] += 1;
    parts[hour < 12 ? 0 : hour < 17 ? 1 : 2] += 1;
  }

  const total = appointments.length;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const dailyRows = Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date));
  const revenueTrend = dailyRows.map((i) => ({ label: dayLabel(i.date), date: i.date, revenue: i.revenue, appointments: i.appointments, completed: i.completed }));
  const serviceBreakdown = Array.from(services.values()).sort((a, b) => b.bookings - a.bookings).slice(0, 6);
  const stylistPerformance = stylists.map((s) => {
    const st = byStylist.get(s.id) || { bookings: 0, completed: 0, revenue: 0 };
    return {
      id: s.id, name: s.name, title: s.title || "Stylist", ...st, satisfaction: s.satisfaction || 0,
      score: st.revenue + st.completed * 30 + (s.satisfaction || 0) * 100,
    };
  }).sort((a, b) => b.score - a.score);
  const other = total - completed - scheduled - cancelled - noShows;
  const statusBreakdown = [
    { name: "Completed", value: completed, fill: "#30D158" },
    { name: "Scheduled", value: scheduled, fill: "#0A84FF" },
    { name: "Cancelled", value: cancelled, fill: "#FF2D46" },
    { name: "No-show", value: noShows, fill: "#FF9F0A" },
    { name: "Other", value: other, fill: "#8E8E93" },
  ].filter((i) => i.value > 0);
  const dayOfWeekDemand = DAYS.map((day, i) => ({ day, count: dow[i] }));
  const hourlyDemand = HOURS.map((h, i) => ({ hour: hourLabel(h), count: hours[i] }));
  const top = <T extends { count: number }>(rows: T[], dir: 1 | -1) =>
    rows.reduce((best, r) => ((r.count - best.count) * dir > 0 ? r : best), rows[0]);

  const half = Math.floor(revenueTrend.length / 2);
  const sum = (rows: typeof revenueTrend) => rows.reduce((s, r) => s + r.revenue, 0);
  const firstHalf = sum(revenueTrend.slice(0, half));
  const revenueDelta = firstHalf > 0 ? Math.round(((sum(revenueTrend.slice(half)) - firstHalf) / firstHalf) * 100) : 0;

  let streak = dailyRows.length ? 1 : 0;
  for (let i = dailyRows.length - 2; i >= 0; i--) {
    const gap = (new Date(`${dailyRows[i + 1].date}T00:00:00`).getTime() - new Date(`${dailyRows[i].date}T00:00:00`).getTime()) / 86_400_000;
    if (Math.round(gap) === 1) streak += 1; else break;
  }
  const returningCustomers = Array.from(customers.values()).filter((n) => n > 1).length;
  const topService = serviceBreakdown[0] || null;

  return {
    totalRevenue, totalAppointments: total, totalCustomers: customers.size,
    averageTicket: kept ? totalRevenue / kept : 0,
    completionRate: pct(completed, total), completedAppointments: completed,
    scheduledAppointments: scheduled, cancelledAppointments: cancelled,
    revenueTrend, serviceBreakdown, stylistPerformance, statusBreakdown, dayOfWeekDemand,
    hourlyDemand, peakHour: top(hourlyDemand, 1), busiestDay: top(dayOfWeekDemand, 1), quietHour: top(hourlyDemand, -1),
    activeServices: servicesCount, activeStylists: stylists.length, revenueDelta,
    noShows, cancelRate: pct(cancelled, total), minutesBooked, avgDuration: total ? Math.round(minutesBooked / total) : 0,
    returningCustomers, returningRate: pct(returningCustomers, customers.size),
    rangeDays, revenuePerDay: totalRevenue / rangeDays, bookingsPerDay: total / rangeDays, activeDays: daily.size,
    bestDay: dailyRows.reduce<(typeof dailyRows)[number] | null>((best, d) => (!best || d.revenue > best.revenue ? d : best), null),
    topService, topServiceShare: topService ? pct(topService.bookings, total) : 0,
    dayparts: [
      { key: "Morning", range: "before 12", count: parts[0] },
      { key: "Afternoon", range: "12 – 17", count: parts[1] },
      { key: "Evening", range: "after 17", count: parts[2] },
    ],
    weekendShare: pct(weekendCount, total), upcomingRevenue, streak,
    heatmap, heatMax: Math.max(1, ...heatmap.flat()),
    weekdayBookings: [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: DAYS[i], value: dow[i] })),
  };
}
export type ReportsAnalytics = ReturnType<typeof computeAnalytics>;

/** Spend per client in the range, best first. Names are looked up afterwards for the few that are shown. */
export function rankCustomers(appointments: AppointmentRow[], limit = 8) {
  const map = new Map<string, { id: string; bookings: number; revenue: number; lastVisit: string | null }>();
  for (const a of appointments) {
    if (!a.customer_id || isLost(a.status)) continue;
    const c = map.get(a.customer_id) || { id: a.customer_id, bookings: 0, revenue: 0, lastVisit: null };
    c.bookings += 1; c.revenue += a.price || 0;
    if (!c.lastVisit || a.appointment_date > c.lastVisit) c.lastVisit = a.appointment_date;
    map.set(a.customer_id, c);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export const initialsOf = (name?: string | null) => {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
};

export function analyticsCsv(a: ReportsAnalytics, rangeLabel: string, money: (n: number) => string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ["Range", rangeLabel], ["Revenue", money(a.totalRevenue)], ["Bookings", a.totalAppointments], ["Clients", a.totalCustomers],
    ["Average ticket", money(a.averageTicket)], ["Completed", a.completedAppointments], ["Scheduled", a.scheduledAppointments],
    ["Cancelled", a.cancelledAppointments], ["No-shows", a.noShows], ["Returning clients", `${a.returningRate}%`],
    [], ["Date", "Revenue", "Bookings", "Completed"],
    ...a.revenueTrend.map((r) => [r.date, r.revenue, r.appointments, r.completed]),
    [], ["Service", "Bookings", "Revenue"],
    ...a.serviceBreakdown.map((s) => [s.name, s.bookings, s.revenue]),
  ];
  return lines.map((l) => l.map(esc).join(",")).join("\n");
}
