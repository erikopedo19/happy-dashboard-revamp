import type { ReactNode } from "react";
import {
  BatteryFull,
  Bell,
  ChevronLeft,
  Clock,
  MapPin,
  Scissors,
  Signal,
  Star,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CSS iPhone frame + miniature DOM "app screens" used across the landing.
 * Everything is plain markup so it stays crisp at any scale and needs no assets.
 */
export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative w-[250px] shrink-0", className)}>
      <div className="relative rounded-[44px] bg-[#131316] p-[9px] shadow-[0_50px_90px_-30px_rgba(2,6,23,0.6)] ring-1 ring-black/60">
        <div className="relative aspect-[9/19.4] overflow-hidden rounded-[36px] bg-[#f4f4f6] text-left">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-[9px] z-30 h-[21px] w-[74px] -translate-x-1/2 rounded-full bg-black" />
          {/* status bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-[11px] text-[10px] font-semibold text-neutral-800">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-neutral-800">
              <Signal className="h-2.5 w-2.5" />
              <Wifi className="h-2.5 w-2.5" />
              <BatteryFull className="h-3 w-3" />
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Booking flow scene (client picks a service + time) -------- */
export function BookingScene() {
  const services = [
    { name: "Skin fade", price: "€18", time: "30 min", active: true },
    { name: "Fade + beard", price: "€26", time: "45 min", active: false },
    { name: "Kids cut", price: "€14", time: "25 min", active: false },
  ];
  const times = ["10:00", "10:30", "11:15", "12:00", "14:30", "15:00"];
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-12">
      <div className="flex items-center justify-between">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-sm">
          <ChevronLeft className="h-4 w-4 text-neutral-700" />
        </span>
        <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[9px] font-bold tracking-tight text-white">
          cutzioo
        </span>
      </div>
      <p className="mt-4 font-serif text-[19px] italic leading-tight text-neutral-900">
        Book your <span className="not-italic font-sans font-bold">next cut</span>
      </p>
      <p className="mt-1 text-[10px] text-neutral-500">Fresh Cuts · Campo de Ourique</p>
      <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-neutral-600">
        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> 4.9 · 230 reviews
      </div>
      <div className="mt-3 space-y-1.5">
        {services.map((s) => (
          <div
            key={s.name}
            className={cn(
              "flex items-center justify-between rounded-xl border px-3 py-2",
              s.active
                ? "border-rose-500 bg-rose-50"
                : "border-neutral-200 bg-white"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  s.active ? "bg-rose-500" : "bg-neutral-300"
                )}
              />
              <div>
                <p className="text-[11px] font-semibold text-neutral-900">{s.name}</p>
                <p className="text-[9px] text-neutral-500">{s.time}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-neutral-900">{s.price}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        Today
      </p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {times.map((t, i) => (
          <span
            key={t}
            className={cn(
              "rounded-lg py-1.5 text-center text-[10px] font-semibold",
              i === 4 ? "bg-rose-500 text-white" : "bg-white text-neutral-700"
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-auto rounded-xl bg-neutral-900 py-2.5 text-center text-[12px] font-semibold text-white">
        Continue
      </div>
    </div>
  );
}

/* ---------------- Agenda scene (barber's day) ------------------------------ */
export function AgendaScene() {
  const rows = [
    { t: "10:00", name: "Maria S.", svc: "Skin fade", tint: "bg-rose-500" },
    { t: "10:30", name: "Break", svc: "—", tint: "bg-neutral-300" },
    { t: "11:00", name: "João P.", svc: "Fade + beard", tint: "bg-sky-500" },
    { t: "11:45", name: "André M.", svc: "Buzz cut", tint: "bg-emerald-500" },
    { t: "12:15", name: "Walk-in", svc: "Beard trim", tint: "bg-amber-500" },
  ];
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[16px] font-bold text-neutral-900">Agenda</p>
          <p className="text-[9px] text-neutral-500">Tuesday 12 · 5 bookings</p>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-sm">
          <Bell className="h-3.5 w-3.5 text-neutral-700" />
        </span>
      </div>
      <div className="mt-3 flex-1 space-y-1.5">
        {rows.map((r) => (
          <div key={r.t} className="flex items-stretch gap-2">
            <span className="w-8 pt-1 text-[9px] font-medium text-neutral-400">{r.t}</span>
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-sm">
              <span className={cn("h-7 w-1 rounded-full", r.tint)} />
              <div className="flex-1">
                <p className="text-[10.5px] font-semibold text-neutral-900">{r.name}</p>
                <p className="text-[8.5px] text-neutral-500">{r.svc}</p>
              </div>
              {r.name !== "Break" && <Clock className="h-3 w-3 text-neutral-300" />}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl bg-rose-500 py-2 text-center text-[11px] font-semibold text-white">
        + New booking
      </div>
    </div>
  );
}

/* ---------------- Explore / map scene -------------------------------------- */
export function ExploreScene() {
  return (
    <div className="relative flex h-full flex-col pt-12">
      {/* faux map */}
      <div className="relative flex-1 overflow-hidden bg-[#dfe8df]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#fff_1.5px,transparent_1.5px),linear-gradient(90deg,#fff_1.5px,transparent_1.5px)] [background-size:34px_34px]" />
        <div className="absolute left-[-20%] top-[30%] h-[3px] w-[140%] rotate-[24deg] bg-white/90" />
        <div className="absolute left-[55%] top-[-20%] h-[140%] w-[3px] rotate-[18deg] bg-white/90" />
        {[
          { l: "24%", t: "26%" },
          { l: "62%", t: "44%" },
          { l: "38%", t: "62%" },
        ].map((p, i) => (
          <span key={i} className="absolute" style={{ left: p.l, top: p.t }}>
            <MapPin
              className={cn(
                "h-6 w-6 drop-shadow",
                i === 1 ? "fill-rose-500 text-rose-600" : "fill-white text-neutral-500"
              )}
            />
          </span>
        ))}
        <span className="absolute left-[58%] top-[18%] h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow" />
      </div>
      {/* bottom sheet */}
      <div className="relative -mt-3 rounded-t-2xl bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-neutral-200" />
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900">
            <Scissors className="h-4 w-4 text-white" />
          </span>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-neutral-900">Fresh Cuts</p>
            <p className="text-[9px] text-neutral-500">0.4 km · ★ 4.9 · Next: 14:30</p>
          </div>
          <span className="rounded-lg bg-rose-500 px-3 py-1.5 text-[10px] font-semibold text-white">
            Book
          </span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {["Fade", "Beard", "Kids"].map((c) => (
            <span
              key={c}
              className="rounded-full bg-neutral-100 px-2 py-1 text-[8.5px] font-medium text-neutral-600"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
