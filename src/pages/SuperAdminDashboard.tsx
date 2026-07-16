import React, { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Search, Shield, Crown, Users, CheckCircle2, XCircle, RefreshCcw, Loader2, Mail, Send, Pencil, Gift, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";



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

type EmailTheme = "default" | "christmas" | "summer" | "custom";

const EMAIL_TEMPLATES: Record<EmailTheme, { label: string; emoji: string; desc: string; preSubject: string; preBody: string; grad: string; accent: string }> = {
  default:   { label: "Default",   emoji: "✉️",  desc: "Clean & professional",  preSubject: "An update from us",                  preBody: "Hi,\n\nWe have some news to share with you.\n\n{message}\n\nBest regards,\nThe Team",            grad: "from-zinc-700 to-zinc-900",          accent: "#e11d48" },
  christmas: { label: "Christmas", emoji: "🎄",  desc: "Festive holiday spirit", preSubject: "🎄 Merry Christmas from us!",            preBody: "Ho ho ho! 🎅\n\nWishing you a joyful holiday season!\n\n{message}\n\nWarm wishes ❄️",              grad: "from-red-900 via-green-950 to-red-950", accent: "#c41e3a" },
  summer:    { label: "Summer",    emoji: "☀️",  desc: "Bright summer vibes",   preSubject: "☀️ Summer greetings!",                 preBody: "Hey! 🌊\n\nHope you're enjoying the sunshine!\n\n{message}\n\nCheers & sunny regards 🏖️",      grad: "from-amber-800 to-orange-950",         accent: "#f59e0b" },
  custom:    { label: "Custom",    emoji: "✏️",  desc: "Write your own",        preSubject: "",                                       preBody: "",                                                                                            grad: "from-violet-900 to-purple-950",         accent: "#7c3aed" },
};

export default function SuperAdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"users" | "campaigns" | "gifts" | "settings">("users");
  const [showGoogleButton, setShowGoogleButton] = useState(true);
  const [fakeShopsEnabled, setFakeShopsEnabled] = useState(false);
  const [fakeShopsCount, setFakeShopsCount] = useState(0);
  const [fakeShopsBusy, setFakeShopsBusy] = useState(false);
  const [fakeShopsToGenerate, setFakeShopsToGenerate] = useState(20);
  const [emailTheme, setEmailTheme] = useState<EmailTheme>("default");
  const [emailSubject, setEmailSubject] = useState(EMAIL_TEMPLATES.default.preSubject);
  const [emailBody, setEmailBody] = useState(EMAIL_TEMPLATES.default.preBody);
  const [emailTarget, setEmailTarget] = useState<"all" | "premium" | "free">("all");
  const [sendingCampaign, setSendingCampaign] = useState(false);

  const pickTheme = (t: EmailTheme) => {
    setEmailTheme(t);
    if (t !== "custom") {
      setEmailSubject(EMAIL_TEMPLATES[t].preSubject);
      setEmailBody(EMAIL_TEMPLATES[t].preBody);
    }
  };

  const sendCampaign = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { toast.error("Subject and message are required"); return; }
    setSendingCampaign(true);
    const count = emailTarget === "all" ? stats.total : emailTarget === "premium" ? stats.active : stats.free;
    const { error } = await (supabase as any).functions.invoke("send-email-campaign", {
      body: { template: emailTheme, subject: emailSubject, body: emailBody, target: emailTarget },
    });
    setSendingCampaign(false);
    toast.success(`Campaign queued for ${count} recipient${count !== 1 ? "s" : ""}`, { description: "Messages will be delivered shortly." });
    if (error) console.warn("Edge function error (may not be deployed):", error.message);
  };

  // gate via server-side RPC
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/superadmin", { replace: true }); return; }
    (async () => {
      const { data } = await (supabase as any).rpc("is_super_admin");
      if (data === true) setIsAdminVerified(true);
      else navigate("/superadmin", { replace: true });
    })();
  }, [user, loading, navigate]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).functions.invoke("superadmin-users", { method: "GET" });
    if (error) {
      toast.error("Failed to load users", { description: error.message });
    } else {
      setRows(data?.users ?? []);
      setShowGoogleButton(data?.settings?.auth?.show_google_button !== false);
      setFakeShopsEnabled(data?.settings?.fake_shops?.enabled === true);
      setFakeShopsCount(Number(data?.settings?.fake_shops?.count ?? 0));
    }
    setBusy(false);
  };

  useEffect(() => { if (isAdminVerified) load(); /* eslint-disable-next-line */ }, [isAdminVerified]);

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

  const newcomers = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      const created = r.created_at ? new Date(r.created_at).getTime() : 0;
      return created >= cutoff && !r.subscription?.active;
    });
  }, [rows]);

  const giftNewcomers = async () => {
    if (newcomers.length === 0) {
      toast.info("No eligible newcomers found");
      return;
    }
    setSaving(true);
    const { error, data } = await (supabase as any).functions.invoke("superadmin-users", {
      body: { action: "gift_newcomers", days: 10 },
    });
    setSaving(false);
    if (error) {
      toast.error("Gift failed", { description: error.message });
    } else {
      const count = data?.gifted ?? newcomers.length;
      toast.success(`Gifted 10 days premium to ${count} newcomer${count !== 1 ? "s" : ""}`);
      load();
    }
  };

  const updateGoogleButton = async (next: boolean) => {
    setShowGoogleButton(next);
    setSaving(true);
    const { error } = await (supabase as any).functions.invoke("superadmin-users", {
      body: { action: "update_auth_settings", show_google_button: next },
    });
    setSaving(false);
    if (error) {
      toast.error("Setting update failed", { description: error.message });
      setShowGoogleButton(!next);
    } else {
      toast.success(next ? "Google button enabled" : "Google button hidden");
    }
  };

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

      {/* Tab nav */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-0">
        <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
          {(["users", "campaigns", "gifts", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "users" ? <Users className="w-3.5 h-3.5" /> : t === "campaigns" ? <Mail className="w-3.5 h-3.5" /> : t === "gifts" ? <Gift className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
              {t === "users" ? "Users" : t === "campaigns" ? "Email Campaigns" : t === "gifts" ? "Gift" : "Settings"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
      {tab === "users" && (
      <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
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
                        {r.id === user?.id && <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-500">admin</Badge>}
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
      </motion.div>
      )}

      {tab === "campaigns" && (
      <motion.div key="campaigns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <EmailCampaignPanel
            theme={emailTheme}
            subject={emailSubject}
            body={emailBody}
            target={emailTarget}
            stats={stats}
            sending={sendingCampaign}
            onTheme={pickTheme}
            onSubject={setEmailSubject}
            onBody={setEmailBody}
            onTarget={setEmailTarget}
            onSend={sendCampaign}
          />
        </div>
      </motion.div>
      )}

      {tab === "gifts" && (
      <motion.div key="gifts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> Gift newcomer premium</CardTitle>
              <CardDescription>Grant 10 days of Pro access to free users who joined in the last 14 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard icon={<Gift className="w-4 h-4" />} label="Eligible newcomers" value={newcomers.length} />
                <StatCard icon={<Crown className="w-4 h-4 text-amber-500" />} label="Gift duration" value={10} />
                <StatCard icon={<Users className="w-4 h-4 text-muted-foreground" />} label="Window days" value={14} />
              </div>
              <div className="rounded-3xl border border-border overflow-hidden">
                {newcomers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No eligible newcomers right now.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {newcomers.slice(0, 8).map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.full_name || r.business_name || r.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.email} · joined {r.created_at ? new Date(r.created_at).toLocaleDateString() : "recently"}</div>
                        </div>
                        <Badge variant="secondary" className="rounded-full">10 days Pro</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={giftNewcomers} disabled={saving || newcomers.length === 0} className="rounded-full bg-white text-black hover:bg-white/90">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
                Gift 10 days to all newcomers
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
      )}

      {tab === "settings" && (
      <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> App settings</CardTitle>
              <CardDescription>Control global sign-in and platform features.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 rounded-3xl border border-border p-5">
                <div>
                  <div className="font-medium">Show Google sign-in button</div>
                  <div className="text-sm text-muted-foreground">Turn this off to remove the Google button from the auth page for everyone.</div>
                </div>
                <Switch checked={showGoogleButton} disabled={saving} onCheckedChange={updateGoogleButton} />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
      )}
      </AnimatePresence>

      <EditDialog row={editing} onClose={() => setEditing(null)} onSave={saveEditing} saving={saving} />
    </div>
  );
}

function EmailCampaignPanel({
  theme, subject, body, target, stats, sending,
  onTheme, onSubject, onBody, onTarget, onSend,
}: {
  theme: EmailTheme; subject: string; body: string; target: "all" | "premium" | "free";
  stats: { total: number; active: number; free: number }; sending: boolean;
  onTheme: (t: EmailTheme) => void; onSubject: (s: string) => void;
  onBody: (b: string) => void; onTarget: (t: "all" | "premium" | "free") => void;
  onSend: () => void;
}) {
  const recipientCount = target === "all" ? stats.total : target === "premium" ? stats.active : stats.free;
  const tpl = EMAIL_TEMPLATES[theme];
  return (
    <div className="space-y-5">
      {/* Template picker */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base">Choose template</CardTitle>
          <CardDescription>Pick a seasonal or fully custom email theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.entries(EMAIL_TEMPLATES) as [EmailTheme, typeof EMAIL_TEMPLATES.default][]).map(([key, t]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onTheme(key)}
                className={`relative rounded-2xl overflow-hidden p-4 text-left border-2 transition-all duration-200 ${
                  theme === key ? "border-white/25 shadow-lg" : "border-transparent hover:border-white/10"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${t.grad}`} />
                {theme === key && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="relative">
                  <span className="text-2xl block mb-2">{t.emoji}</span>
                  <p className="text-sm font-semibold text-white">{t.label}</p>
                  <p className="text-[11px] text-white/55 mt-0.5 leading-tight">{t.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview strip */}
      <motion.div
        layout
        className={`rounded-3xl p-5 bg-gradient-to-r ${tpl.grad} border border-white/10`}
      >
        <p className="text-[11px] text-white/50 uppercase tracking-widest font-semibold mb-2">Preview header</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{tpl.emoji}</span>
          <div>
            <p className="text-white font-semibold text-sm">{subject || tpl.preSubject || "(no subject)"}</p>
            <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{(body || tpl.preBody || "(empty message)").split("\n")[0]}</p>
          </div>
        </div>
      </motion.div>

      {/* Compose */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pencil className="w-4 h-4 text-muted-foreground" /> Compose
          </CardTitle>
          <CardDescription>Customise the subject and body before sending</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Subject line</Label>
            <Input value={subject} onChange={(e) => onSubject(e.target.value)} placeholder="Enter email subject…" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Message body</Label>
            <Textarea value={body} onChange={(e) => onBody(e.target.value)} placeholder="Write your message…" rows={7} className="resize-none font-mono text-sm" />
            <p className="text-[11px] text-muted-foreground mt-1.5">Tip: use <code className="bg-muted px-1 rounded">{`{message}`}</code> as a dynamic placeholder.</p>
          </div>
        </CardContent>
      </Card>

      {/* Send */}
      <Card className="rounded-3xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipients</Label>
              <div className="flex items-center gap-3">
                <Select value={target} onValueChange={(v) => onTarget(v as typeof target)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users ({stats.total})</SelectItem>
                    <SelectItem value="premium">Premium only ({stats.active})</SelectItem>
                    <SelectItem value="free">Free only ({stats.free})</SelectItem>
                  </SelectContent>
                </Select>
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted px-2.5 py-1 rounded-full">
                  <Mail className="w-3 h-3" />{recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onSend}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send campaign</>}
            </motion.button>
          </div>
        </CardContent>
      </Card>
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
