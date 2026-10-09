import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Seo } from "@/components/Seo";
import { EventsManagePanel } from "@/components/EventsManagePanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, Plus, Trash2, Pencil, AlertCircle, RefreshCw,
  KeyRound, Briefcase, MapPin, ChevronDown, Phone, User, Inbox,
} from "lucide-react";

interface ListingRow {
  id: string;
  kind: "rent" | "job";
  title: string;
  short_description: string | null;
  description: string | null;
  location: string | null;
  price_text: string | null;
  cover_url: string | null;
  contact_phone: string | null;
  featured: boolean;
  published: boolean;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  listing_id: string;
  full_name: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
}

const emptyListing = {
  kind: "rent" as "rent" | "job",
  title: "", location: "", price_text: "", contact_phone: "",
  cover_url: "", short_description: "", description: "",
  featured: false, published: true,
};

export default function AggeliesManage() {
  const [tab, setTab] = useState<"listings" | "events">("listings");

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-28">
      <Seo title="Manage Aggelies | Cutzioo" description="Post rental spaces and staff openings." path="/aggelies/manage" />
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Aggelies</h1>
          <p className="text-sm text-muted-foreground mt-1">Post a space for rent or a staff opening — clients see and apply instantly.</p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-1">
          {([
            { key: "listings", label: "Rent & Jobs", icon: KeyRound },
            { key: "events", label: "Events", icon: Inbox },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-full text-[13.5px] font-semibold transition-colors",
                tab === t.key ? "bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E]" : "text-muted-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "listings" ? <ListingsManagePanel /> : <EventsManagePanel />}
      </div>
    </div>
  );
}

function ListingsManagePanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyListing);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedApps, setExpandedApps] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    const { data, error: err } = await (supabase as any)
      .from("listings").select("*").eq("created_by", user.id).order("created_at", { ascending: false });
    if (err) { setError("We couldn't load your listings."); setLoading(false); return; }
    const list = (data ?? []) as unknown as ListingRow[];
    setRows(list);
    if (list.length) {
      const { data: apps } = await (supabase as any)
        .from("listing_applications")
        .select("id, listing_id, full_name, phone, message, created_at")
        .in("listing_id", list.map((l) => l.id))
        .order("created_at", { ascending: false });
      setApplications((apps ?? []) as ApplicationRow[]);
    } else {
      setApplications([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const appsFor = (id: string) => applications.filter((a) => a.listing_id === id);

  async function save() {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Title is required.");
    setSaving(true);
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      location: form.location || null,
      price_text: form.price_text || null,
      contact_phone: form.contact_phone || null,
      cover_url: form.cover_url || null,
      short_description: form.short_description || null,
      description: form.description || null,
      featured: form.featured,
      published: form.published,
      created_by: user.id,
    };
    const { error: err } = editingId
      ? await (supabase as any).from("listings").update(payload).eq("id", editingId)
      : await (supabase as any).from("listings").insert(payload);
    setSaving(false);
    if (err) return toast.error("Couldn't save the listing. Please try again.");
    toast.success(editingId ? "Listing updated" : "Listing published");
    setForm(emptyListing); setEditingId(null); load();
  }

  async function remove(id: string) {
    const { error: err } = await (supabase as any).from("listings").delete().eq("id", id);
    if (err) return toast.error("Couldn't delete the listing.");
    toast.success("Listing deleted");
    load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-5 space-y-3">
        <p className="font-semibold">{editingId ? "Edit listing" : "New listing"}</p>

        <div className="grid grid-cols-2 gap-2">
          {([
            { key: "rent", label: "Space for rent", icon: KeyRound, hint: "Chair, room, shop" },
            { key: "job", label: "Staff opening", icon: Briefcase, hint: "Hiring barbers" },
          ] as const).map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => set("kind", k.key)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                form.kind === k.key
                  ? "border-rose-500/50 bg-rose-500/[0.08]"
                  : "border-[#E5E5EA] dark:border-[#2C2C2E] bg-muted/30"
              )}
            >
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                form.kind === k.key ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                <k.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">{k.label}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{k.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <Input
          placeholder={form.kind === "rent" ? "e.g. Barber chair in downtown salon" : "e.g. Barber wanted, part-time"}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="rounded-2xl"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Location / area" value={form.location} onChange={(e) => set("location", e.target.value)} className="rounded-2xl" />
          <Input
            placeholder={form.kind === "rent" ? "Price (e.g. €450/mo)" : "Pay (e.g. €1,400/mo)"}
            value={form.price_text}
            onChange={(e) => set("price_text", e.target.value)}
            className="rounded-2xl"
          />
        </div>
        <Input placeholder="Contact phone (optional)" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="rounded-2xl" />
        <Input placeholder="Cover image URL (optional)" value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} className="rounded-2xl" />
        <Input placeholder="Short description" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} className="rounded-2xl" />
        <Textarea
          placeholder={form.kind === "rent" ? "Details — size, utilities, what's included…" : "Details — schedule, pay terms, what you're looking for…"}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="rounded-2xl min-h-[96px]"
        />
        <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
          <Label>Featured</Label>
          <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
          <Label>Published</Label>
          <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="rounded-full h-11 flex-1 bg-rose-500 hover:bg-rose-600 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />{editingId ? "Save changes" : "Publish listing"}</>}
          </Button>
          {editingId && (
            <Button variant="outline" className="rounded-full h-11" onClick={() => { setEditingId(null); setForm(emptyListing); }}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      )}
      {error && (
        <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border p-5 text-center">
          <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button onClick={load} variant="outline" className="mt-3 rounded-full"><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No listings yet — publish a space for rent or a staff opening above.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((l) => {
          const apps = appsFor(l.id);
          const open = expandedApps === l.id;
          return (
            <div key={l.id} className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <span className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
                  l.kind === "rent" ? "bg-[#0A84FF]" : "bg-[#AF52DE]"
                )}>
                  {l.kind === "rent" ? <KeyRound className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.kind === "rent" ? "For rent" : "Job"}
                    {l.price_text ? ` · ${l.price_text}` : ""}
                    {l.location ? ` · ${l.location}` : ""}
                    {!l.published && " · Draft"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setEditingId(l.id); setForm({ ...emptyListing, ...l }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="rounded-full text-red-500" onClick={() => remove(l.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setExpandedApps(open ? null : l.id)}
                className="flex w-full items-center justify-between border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-muted/30 px-4 py-2.5 text-[12.5px] font-medium text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <Inbox className="h-3.5 w-3.5" />
                  {apps.length} {apps.length === 1 ? "application" : "applications"}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              </button>

              {open && (
                <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                  {apps.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground">No applications yet.</p>
                  ) : (
                    apps.map((a) => (
                      <div key={a.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {a.full_name || "Unnamed applicant"}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {a.phone && (
                          <a href={`tel:${a.phone}`} className="flex items-center gap-1.5 text-[12.5px] text-rose-500 font-medium">
                            <Phone className="h-3.5 w-3.5" /> {a.phone}
                          </a>
                        )}
                        {a.message && <p className="text-[12.5px] text-muted-foreground whitespace-pre-wrap">{a.message}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
