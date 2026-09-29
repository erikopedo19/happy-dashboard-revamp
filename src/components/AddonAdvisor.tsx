import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

const SIZES = ["Just me", "2–3 chairs", "4–6 chairs", "7+ chairs"];
const VOLUMES = ["Under 50", "50–150", "150–400", "400+"];
const GOALS = ["More new clients", "Fewer no-shows", "Get paid upfront", "Better reviews", "Win back old clients", "Manage my team"];

type Rec = { id: string; name: string; desc: string; reason: string; priority: "high" | "medium" | "low" };

function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => { haptic("light"); onToggle(o); }}
            className={`rounded-full border px-3.5 py-2 text-[14px] transition active:scale-95 ${
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function AddonAdvisor() {
  const [size, setSize] = useState("");
  const [volume, setVolume] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ summary: string; recommendations: Rec[] } | null>(null);

  const run = async () => {
    haptic("medium");
    setLoading(true); setError(""); setResult(null);
    const { data, error } = await supabase.functions.invoke("recommend-addons", { body: { size, volume, goals, notes } });
    setLoading(false);
    let msg = data?.error as string | undefined;
    if (error && !msg) {
      try { msg = (await (error as any).context?.json())?.error; } catch { /* ignore */ }
      msg ||= "Couldn't get recommendations right now.";
    }
    if (msg) { setError(msg); return; }
    setResult(data);
  };

  const label = "mb-2 px-1 text-[12px] font-medium uppercase text-muted-foreground";

  return (
    <div className="space-y-6">
      <div>
        <p className={label}>Salon size</p>
        <Chips options={SIZES} value={[size]} onToggle={setSize} />
      </div>
      <div>
        <p className={label}>Bookings per month</p>
        <Chips options={VOLUMES} value={[volume]} onToggle={setVolume} />
      </div>
      <div>
        <p className={label}>Your goals</p>
        <Chips options={GOALS} value={goals} onToggle={(g) => setGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))} />
      </div>
      <div>
        <p className={label}>Anything else? (optional)</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Busy on weekends, quiet on Tuesdays" className="rounded-2xl bg-card text-card-foreground" />
      </div>

      <Button onClick={run} disabled={!size || !volume || loading} className="w-full rounded-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Thinking…" : "Get my recommendations"}
      </Button>

      {error && <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[14px] text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3">
          <p className="px-1 text-[15px] text-muted-foreground">{result.summary}</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            {result.recommendations.map((r, i) => (
              <div key={r.id} className={`px-4 py-3.5 ${i ? "border-t border-border" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[16px] font-semibold">{r.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${r.priority === "high" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {r.priority}
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-muted-foreground">{r.reason}</p>
              </div>
            ))}
          </div>
          <p className="px-1 text-[12px] text-muted-foreground">AI-powered suggestions — review before buying.</p>
        </div>
      )}
    </div>
  );
}
