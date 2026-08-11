import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Loader2, AlertCircle, RefreshCw, MapPin, CalendarDays, Clock, Search, Navigation, Ticket, User } from "lucide-react";
import { Seo } from "@/components/Seo";

export interface EventRow {
  id: string;
  title: string;
  cover_url: string | null;
  short_description: string | null;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  organizer: string | null;
  map_url: string | null;
  registration_url: string | null;
  category: string;
  featured: boolean;
}

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : null);

export default function Events() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<EventRow | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("events")
      .select("*")
      .eq("published", true)
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date", { ascending: true });
    if (err) setError("We couldn't load events right now.");
    else setEvents((data ?? []) as unknown as EventRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return events;
    return events.filter((e) =>
      [e.title, e.location, e.organizer, e.short_description, e.category].some((v) => v?.toLowerCase().includes(s))
    );
  }, [events, q]);

  const featured = filtered.find((e) => e.featured) ?? filtered[0];
  const rest = filtered.filter((e) => e.id !== featured?.id);

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-28">
      <Seo
        title="Barber Events & Seminars | Cutzioo"
        description="Discover barber seminars, workshops and education events near you on Cutzioo."
      />
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="text-[28px] font-bold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground mt-1">Seminars, workshops and barber education.</p>

        <div className="relative mt-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, cities, organizers…"
            className="pl-10 h-11 rounded-2xl bg-white dark:bg-[#1C1C1E] border-[#E5E5EA] dark:border-[#2C2C2E]"
          />
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            <div className="h-44 rounded-3xl bg-muted animate-pulse" />
            <div className="h-24 rounded-3xl bg-muted animate-pulse" />
            <div className="h-24 rounded-3xl bg-muted animate-pulse" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading events…
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
            <p className="mt-2 font-semibold">Couldn't load events</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={load} variant="outline" className="mt-4 rounded-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted mx-auto flex items-center justify-center">
              <CalendarDays className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="mt-3 font-semibold">No events yet</p>
            <p className="text-sm text-muted-foreground">
              {q ? "Try a different search." : "New seminars and workshops will show up here."}
            </p>
          </div>
        )}

        {!loading && !error && featured && (
          <button
            onClick={() => setSelected(featured)}
            className="mt-6 w-full text-left rounded-3xl overflow-hidden bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] active:scale-[0.99] transition"
          >
            <div className="h-44 w-full bg-gradient-to-br from-rose-500/80 to-rose-700 relative">
              {featured.cover_url && (
                <img src={featured.cover_url} alt={featured.title} className="w-full h-full object-cover" loading="lazy" />
              )}
              <Badge className="absolute top-3 left-3 rounded-full bg-black/60 text-white border-0">Featured</Badge>
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold leading-tight">{featured.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{featured.short_description}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{fmtDate(featured.event_date)}</span>
                {featured.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{featured.location}</span>}
              </div>
            </div>
          </button>
        )}

        <div className="mt-4 space-y-3">
          {rest.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className="w-full text-left flex gap-3 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3 active:scale-[0.99] transition"
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted shrink-0">
                {e.cover_url ? (
                  <img src={e.cover_url} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rose-500/70 to-rose-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{e.short_description}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{fmtDate(e.event_date)}</span>
                  {e.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{e.location}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto p-0">
          {selected && (
            <div>
              <div className="h-48 w-full bg-gradient-to-br from-rose-500/80 to-rose-700">
                {selected.cover_url && (
                  <img src={selected.cover_url} alt={selected.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <Badge className="rounded-full mb-2 capitalize">{selected.category}</Badge>
                  <h2 className="text-2xl font-bold tracking-tight">{selected.title}</h2>
                  {selected.short_description && (
                    <p className="text-sm text-muted-foreground mt-1">{selected.short_description}</p>
                  )}
                </div>

                <div className="rounded-2xl bg-muted/50 divide-y divide-border">
                  <Row icon={CalendarDays} label="Date" value={fmtDate(selected.event_date)} />
                  {(selected.start_time || selected.end_time) && (
                    <Row
                      icon={Clock}
                      label="Time"
                      value={[fmtTime(selected.start_time), fmtTime(selected.end_time)].filter(Boolean).join(" – ")}
                    />
                  )}
                  {selected.location && <Row icon={MapPin} label="Location" value={selected.location} />}
                  {selected.organizer && <Row icon={User} label="Organizer" value={selected.organizer} />}
                </div>

                {selected.description && (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pb-6">
                  {selected.map_url && (
                    <Button
                      className="rounded-full h-12 flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                      onClick={() => window.open(selected.map_url!, "_blank", "noopener,noreferrer")}
                    >
                      <Navigation className="w-4 h-4 mr-2" /> Get directions
                    </Button>
                  )}
                  {selected.registration_url && (
                    <Button
                      variant="outline"
                      className="rounded-full h-12 flex-1"
                      onClick={() => window.open(selected.registration_url!, "_blank", "noopener,noreferrer")}
                    >
                      <Ticket className="w-4 h-4 mr-2" /> Register
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <span className="text-sm font-medium flex-1 text-right">{value}</span>
    </div>
  );
}
