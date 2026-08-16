import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Info, RefreshCcw, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActiveBarber {
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  bookings: number;
  calendar_updates: number;
  clients: number;
  services: number;
  last_active: string | null;
  activity_score: number;
}

const RANGES = [7, 30, 90];

/** Super-admin only: transparent breakdown of app/administrative activity. */
export const ActiveBarbersCard = () => {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ActiveBarber[]>({
    queryKey: ["most-active-barbers", days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_most_active_barbers", {
        _days: days,
        _limit: 5,
      });
      if (error) throw error;
      return (data || []) as ActiveBarber[];
    },
  });

  const top = data?.[0];
  const name = (b: ActiveBarber) => b.business_name || b.full_name || "Unnamed barber";

  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Most active barbers
            </CardTitle>
            <CardDescription>
              Usage &amp; administrative activity — not a quality or performance ranking.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-medium transition",
                  days === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {r}d
              </button>
            ))}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
              <RefreshCcw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-2">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="w-4 h-4" /> Couldn't load activity data
            </p>
            <p className="text-muted-foreground text-xs">{(error as any)?.message || "Please try again."}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No activity recorded in this period.</p>
        ) : (
          <>
            {top && (
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Most active
                </p>
                <p className="text-lg font-semibold mt-0.5">{name(top)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Active because of {top.bookings} booking{top.bookings === 1 ? "" : "s"} created,{" "}
                  {top.calendar_updates} calendar update{top.calendar_updates === 1 ? "" : "s"} and{" "}
                  {top.clients} client{top.clients === 1 ? "" : "s"} managed in the last {days} days.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {data.map((b, i) => (
                <div
                  key={b.user_id}
                  className="rounded-2xl border p-3 flex flex-wrap items-center gap-x-4 gap-y-1.5"
                >
                  <span className="text-xs font-semibold w-5 text-muted-foreground">#{i + 1}</span>
                  <span className="font-medium text-sm flex-1 min-w-[120px] truncate">{name(b)}</span>
                  <Badge variant="secondary" className="rounded-lg">{b.bookings} bookings</Badge>
                  <Badge variant="secondary" className="rounded-lg">{b.calendar_updates} updates</Badge>
                  <Badge variant="secondary" className="rounded-lg">{b.clients} clients</Badge>
                  <Badge variant="secondary" className="rounded-lg">{b.services} services</Badge>
                  <span className="text-xs text-muted-foreground">
                    {b.last_active
                      ? `active ${formatDistanceToNow(new Date(b.last_active), { addSuffix: true })}`
                      : "no recent activity"}
                  </span>
                  <Badge className="rounded-lg">score {b.activity_score}</Badge>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            This report only aggregates data the app already stores to run the product: bookings created,
            calendar edits, clients and services. No browsing, location or device tracking is collected.
            The score (bookings ×3 + calendar updates ×2 + clients) is an administrative usage indicator used
            to spot engaged and at-risk accounts — it does not measure service quality or employee performance.
          </span>
        </p>
      </CardContent>
    </Card>
  );
};

export default ActiveBarbersCard;
