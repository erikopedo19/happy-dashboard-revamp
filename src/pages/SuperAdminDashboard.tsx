import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Search, Shield, Crown, Users, CheckCircle2, XCircle, RefreshCcw, Loader2 } from "lucide-react";

const SUPER_ADMIN_EMAIL = "erikballiu19@gmail.com";

type Sub = {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  active: boolean;
} | null;

type Row = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  full_name: string | null;
  business_name: string | null;
  avatar_url: string | null;
  role: string | null;
  subscription: Sub;
};

export default function SuperAdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  // gate
  useEffect(() => {
    if (loading) return;
    if (!user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      navigate("/superadmin", { replace: true });
    }
  }, [user, loading, navigate]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).functions.invoke("superadmin-users", { method: "GET" });
    if (error) {
      toast.error("Failed to load users", { description: error.message });
    } else {
      setRows(data?.users ?? []);
    }
    setBusy(false);
  };

  useEffect(() => { if (user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL) load(); /* eslint-disable-next-line */ }, [user?.id]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      (r.email ?? "").toLowerCase().includes(term) ||
      (r.full_name ?? "").toLowerCase().includes(term) ||
      (r.business_name ?? "").toLowerCase().includes(term)
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.subscription?.active).length;
    const free = total - active;
    return { total, active, free };
  }, [rows]);

  const quickToggle = async (row: Row, next: boolean) => {
    const optimistic = rows.map((r) => r.id === row.id ? {
      ...r,
      subscription: {
        ...(r.subscription ?? { subscription_tier: "Pro", subscription_end: null, stripe_customer_id: null }),
        subscribed: next,
        active: next && (!r.subscription?.subscription_end || new Date(r.subscription.subscription_end) > new Date()),
      } as any,
    } : r);
    setRows(optimistic);
    const { error } = await (supabase as any).functions.invoke("superadmin-users", {
      body: { user_id: row.id, email: row.email, subscribed: next, subscription_tier: next ? "Pro" : null },
    });
    if (error) {
      toast.error("Update failed");
      load();
    } else {
      toast.success(next ? "Premium granted" : "Premium revoked");
    }
  };

  const saveEditing = async (form: { subscribed: boolean; subscription_tier: string; subscription_end: string }) => {
    if (!editing) return;
    setSaving(true);
    const { error } = await (supabase as any).functions.invoke("superadmin-users", {
      body: {
        user_id: editing.id,
        email: editing.email,
        subscribed: form.subscribed,
        subscription_tier: form.subscription_tier || null,
        subscription_end: form.subscription_end ? new Date(form.subscription_end).toISOString() : null,
      },
    });
    setSaving(false);
    if (error) toast.error("Save failed", { description: error.message });
    else {
      toast.success("Subscription updated");
      setEditing(null);
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <span className="font-semibold">Super Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={busy}>
              <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${busy ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Users className="w-4 h-4" />} label="Total users" value={stats.total} />
          <StatCard icon={<Crown className="w-4 h-4 text-amber-500" />} label="Premium" value={stats.active} />
          <StatCard icon={<Users className="w-4 h-4 text-muted-foreground" />} label="Free" value={stats.free} />
        </div>

        <Card className="rounded-3xl">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage subscriptions — flip premium on or off, or set a custom end date.</CardDescription>
            </div>
            <div className="relative w-64 max-w-[40vw]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {busy ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No users found.</div>
              ) : filtered.map((r) => {
                const initials = (r.full_name || r.business_name || r.email || "?").trim()
                  .split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const active = !!r.subscription?.active;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-muted">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{r.full_name || r.business_name || r.email}</span>
                        {r.email === SUPER_ADMIN_EMAIL && <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-500">admin</Badge>}
                        {active ? (
                          <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 border-0">
                            <Crown className="w-3 h-3 mr-1" /> {r.subscription?.subscription_tier ?? "Pro"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="border-0">Free</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.email}
                        {r.subscription?.subscription_end ? ` · until ${new Date(r.subscription.subscription_end).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {active ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                        <Switch checked={!!r.subscription?.subscribed} onCheckedChange={(v) => quickToggle(r, v)} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <EditDialog row={editing} onClose={() => setEditing(null)} onSave={saveEditing} saving={saving} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function EditDialog({ row, onClose, onSave, saving }: {
  row: Row | null;
  onClose: () => void;
  onSave: (f: { subscribed: boolean; subscription_tier: string; subscription_end: string }) => void;
  saving: boolean;
}) {
  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState("Pro");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (row) {
      setSubscribed(!!row.subscription?.subscribed);
      setTier(row.subscription?.subscription_tier ?? "Pro");
      setEnd(row.subscription?.subscription_end ? new Date(row.subscription.subscription_end).toISOString().slice(0, 10) : "");
    }
  }, [row]);

  const setDuration = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEnd(d.toISOString().slice(0, 10));
    setSubscribed(true);
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage subscription</DialogTitle>
          <DialogDescription>{row?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium">Premium active</p>
              <p className="text-xs text-muted-foreground">Unlocks all gated pages.</p>
            </div>
            <Switch checked={subscribed} onCheckedChange={setSubscribed} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pro">Pro</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">End date</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setDuration(30)}>+1 month</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setDuration(90)}>+3 months</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setDuration(365)}>+1 year</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEnd("")}>No end</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ subscribed, subscription_tier: tier, subscription_end: end })} disabled={saving}>
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
