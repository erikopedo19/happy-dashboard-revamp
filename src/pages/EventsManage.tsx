import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Edit, Trash2, ArrowLeft, CalendarDays, MapPin, Clock, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

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
  published: boolean;
}

export default function EventsManage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    cover_url: "",
    short_description: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    organizer: "",
    map_url: "",
    registration_url: "",
    category: "seminar",
    featured: false,
    published: false,
  });

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });
    
    if (error) {
      toast({ title: "Error loading events", description: error.message, variant: "destructive" });
    } else {
      setEvents((data ?? []) as unknown as EventRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      cover_url: "",
      short_description: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
      organizer: "",
      map_url: "",
      registration_url: "",
      category: "seminar",
      featured: false,
      published: false,
    });
    setShowForm(true);
  };

  const handleEdit = (event: EventRow) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      cover_url: event.cover_url || "",
      short_description: event.short_description || "",
      description: event.description || "",
      event_date: event.event_date,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      location: event.location || "",
      organizer: event.organizer || "",
      map_url: event.map_url || "",
      registration_url: event.registration_url || "",
      category: event.category,
      featured: event.featured,
      published: event.published,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting event", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event deleted successfully" });
      loadEvents();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const eventData = {
        ...formData,
        event_date: formData.event_date || new Date().toISOString().slice(0, 10),
      };

      let error;
      if (editingEvent) {
        ({ error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id));
      } else {
        ({ error } = await supabase.from("events").insert(eventData).select());
      }

      if (error) {
        toast({ title: "Error saving event", description: error.message, variant: "destructive" });
      } else {
        toast({ title: editingEvent ? "Event updated successfully" : "Event created successfully" });
        setShowForm(false);
        loadEvents();
      }
    } catch (err) {
      toast({ title: "Error saving event", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const categories = ["seminar", "workshop", "competition", "networking", "other"];

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c] text-[#1C1C1E] dark:text-[#F2F2F7] overflow-hidden relative">
        <AppSidebar />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="sticky top-0 z-20 border-b border-white/40 dark:border-white/5 bg-white/90 dark:bg-[#1C1C1E]/90">
            <div className="px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="lg:hidden text-[#1C1C1E] dark:text-[#F2F2F7]" />
                <h1 className="text-xl md:text-2xl font-bold truncate">Event Management</h1>
              </div>
              <Button
                onClick={handleCreate}
                className="rounded-full h-9 px-4 bg-[#0A84FF] text-white font-semibold border-0 hover:bg-[#0066d6]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative">
            <div className="max-w-6xl mx-auto p-4 md:p-6">
              {showForm ? (
                <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[#1C1C1E] dark:text-[#F2F2F7]">
                          {editingEvent ? "Edit Event" : "Create New Event"}
                        </CardTitle>
                        <CardDescription className="text-[#8E8E93] dark:text-gray-500">
                          {editingEvent ? "Update event details" : "Add a new event to your calendar"}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowForm(false)}
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Event Title *</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Barber Seminar 2024"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat} className="capitalize">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cover Image URL</Label>
                      <Input
                        value={formData.cover_url}
                        onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                        placeholder="https://example.com/event-image.jpg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Short Description</Label>
                      <Input
                        value={formData.short_description}
                        onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                        placeholder="A brief summary of the event"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Full Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detailed description of the event..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Event Date *</Label>
                        <Input
                          type="date"
                          value={formData.event_date}
                          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Event venue or address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Organizer</Label>
                      <Input
                        value={formData.organizer}
                        onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                        placeholder="Event organizer name"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Map URL</Label>
                        <Input
                          value={formData.map_url}
                          onChange={(e) => setFormData({ ...formData, map_url: e.target.value })}
                          placeholder="Google Maps link"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Registration URL</Label>
                        <Input
                          value={formData.registration_url}
                          onChange={(e) => setFormData({ ...formData, registration_url: e.target.value })}
                          placeholder="Registration link"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.featured}
                          onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                        />
                        <Label>Featured Event</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.published}
                          onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                        />
                        <Label>Published</Label>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-full h-9 px-6 bg-[#0A84FF] text-white font-semibold border-0 hover:bg-[#0066d6]"
                      >
                        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-2" /> Save Event</>}
                      </Button>
                      <Button
                        onClick={() => setShowForm(false)}
                        variant="outline"
                        className="rounded-full"
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : events.length === 0 ? (
                    <Card className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarDays className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create your first event to get started
                        </p>
                        <Button onClick={handleCreate} className="rounded-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Event
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {events.map((event) => (
                        <Card key={event.id} className="rounded-3xl border-[#C6C6C8] dark:border-[#2C2C2E] shadow-sm bg-white dark:bg-[#1C1C1E]">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                    {event.category}
                                  </span>
                                  {event.featured && (
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                      Featured
                                    </span>
                                  )}
                                  {!event.published && (
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{event.short_description}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <CalendarDays className="w-4 h-4" />
                                {new Date(event.event_date).toLocaleDateString()}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  {event.location}
                                </div>
                              )}
                              {event.start_time && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  {event.start_time.slice(0, 5)}
                                  {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                onClick={() => handleEdit(event)}
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-full"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDelete(event.id)}
                                variant="outline"
                                size="sm"
                                className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}