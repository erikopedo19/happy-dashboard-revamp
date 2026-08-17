import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, AlertCircle, RefreshCw } from "lucide-react";
import type { EventRow } from "@/pages/Events";

const empty = {
  title: "", cover_url: "", short_description: "", description: "", event_date: "",
  start_time: "", end_time: "", location: "", organizer: "", map_url: "",
  registration_url: "", category: "seminar", featured: false, published: true,
};

export default function EventsManage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("events").select("*").eq("created_by", user.id).order("event_date", { ascending: true });
    if (err) setError("We couldn't load your events.");
    else setRows((data ?? []) as unknown as EventRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function save() {
    if (!user) return;
    if (!form.title.trim() || !form.event_date) return toast.error("Title and date are required.");
    setSaving(true);
    const payload = {
      ...form,
      created_by: user.id,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      cover_url: form.cover_url || null,
      map_url: form.map_url || null,
      registration_url: form.registration_url || null,
    };
    const { error: err } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);
    setSaving(false);
    if (err) return toast.error("Couldn't save the event. Please try again.");
    toast.success(editingId ? "Event updated" : "Event created");
    setForm(empty); setEditingId(null); load();
  }

  async function remove(id: string) {
    const { error: err } = await supabase.from("events").delete().eq("id", id);
    if (err) return toast.error("Couldn't delete the event.");
    toast.success("Event deleted");
    load();
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-28">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        <h1 className="text-[26px] font-bold tracking-tight">Manage events</h1>

        <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-5 space-y-3">
          <p className="font-semibold">{editingId ? "Edit event" : "New event"}</p>
          <Input placeholder="Event title" value={form.title} onChange={(e) => set("title", e.target.value)} className="rounded-2xl" />
          <Input placeholder="Cover image URL" value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} className="rounded-2xl" />
          <Input placeholder="Short description" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} className="rounded-2xl" />
          <Textarea placeholder="Full description / what this event is about" value={form.description} onChange={(e) => set("description", e.target.value)} className="rounded-2xl min-h-[110px]" />
          <div className="grid grid-cols-3 gap-2">
            <Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} className="rounded-2xl" />
            <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="rounded-2xl" />
            <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="rounded-2xl" />
          </div>
          <Input placeholder="Location" value={form.location} onChange={(e) => set("location", e.target.value)} className="rounded-2xl" />
          <Input placeholder="Organizer" value={form.organizer} onChange={(e) => set("organizer", e.target.value)} className="rounded-2xl" />
          <Input placeholder="Map / directions link" value={form.map_url} onChange={(e) => set("map_url", e.target.value)} className="rounded-2xl" />
          <Input placeholder="Registration link (optional)" value={form.registration_url} onChange={(e) => set("registration_url", e.target.value)} className="rounded-2xl" />
          <Input placeholder="Category (seminar, workshop, education…)" value={form.category} onChange={(e) => set("category", e.target.value)} className="rounded-2xl" />
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />{editingId ? "Save changes" : "Create event"}</>}
            </Button>
            {editingId && (
              <Button variant="outline" className="rounded-full h-11" onClick={() => { setEditingId(null); setForm(empty); }}>
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
          <p className="text-sm text-muted-foreground text-center py-6">You haven't created any events yet.</p>
        )}

        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.event_date} · {e.location || "—"}</p>
              </div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setEditingId(e.id); setForm({ ...empty, ...e }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full text-red-500" onClick={() => remove(e.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
