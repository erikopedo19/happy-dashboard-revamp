/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Clock, Scissors, ChevronRight } from "lucide-react";
import { IconPicker, getIconByName } from "@/components/IconPicker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const db = supabase as any;

interface Appointment { id: string; service_id: string; status: string; appointment_date: string; appointment_time: string; }
interface Service {
  id: string; name: string; duration: number;
  color: string; text_color: string; border_color: string;
  user_id: string; price?: number; icon?: string;
  deleted_at?: string | null;
}

const ROSE = "#e11d48";
const PALETTE = [
  { value: "rose",    hex: "#e11d48", label: "Rose" },
  { value: "pink",    hex: "#ec4899", label: "Pink" },
  { value: "amber",   hex: "#f59e0b", label: "Amber" },
  { value: "emerald", hex: "#10b981", label: "Emerald" },
  { value: "teal",    hex: "#14b8a6", label: "Teal" },
  { value: "sky",     hex: "#0ea5e9", label: "Sky" },
  { value: "violet",  hex: "#8b5cf6", label: "Violet" },
  { value: "slate",   hex: "#64748b", label: "Slate" },
];

const hexFor = (key: string) =>
  PALETTE.find((c) => c.value === key || c.label.toLowerCase() === key.toLowerCase())?.hex
  ?? (key?.startsWith("#") ? key : ROSE);

const Services = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "", duration: 30, color: "rose", price: 0, icon: "Scissors",
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services", user?.id],
    queryFn: async (): Promise<Service[]> => {
      if (!user) return [];
      const { data, error } = await db.from("services").select("*").eq("user_id", user.id).order("name");
      if (error) throw error;
      return (data || []) as Service[];
    },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments-count", user?.id],
    queryFn: async (): Promise<Appointment[]> => {
      if (!user) return [];
      const { data, error } = await db.from("appointments")
        .select("id, service_id, status, appointment_date, appointment_time").eq("user_id", user.id).neq("status", "cancelled");
      if (error) throw error;
      return (data || []) as Appointment[];
    },
    enabled: !!user, staleTime: 30000,
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const futureCountFor = (sid: string) =>
    appointments.filter((a) =>
      a.service_id === sid &&
      a.status !== "completed" &&
      a.status !== "cancelled" &&
      a.appointment_date >= todayStr
    ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const dur = Number(formData.duration);
      const duration = Number.isFinite(dur) && dur > 0 ? dur : 30;
      const pr = Number(formData.price);
      const price = Number.isFinite(pr) && pr >= 0 ? pr : null;
      const payload = {
        name: formData.name, duration, price,
        color: formData.color, icon: formData.icon,
        text_color: "text-foreground", border_color: "border-border",
        user_id: user.id,
      };
      if (editingService) {
        const { error } = await db.from("services").update(payload).eq("id", editingService.id);
        if (error) throw error;
        toast({ title: "Service updated" });
      } else {
        const { error } = await db.from("services").insert([payload]);
        if (error) throw error;
        toast({ title: "Service created" });
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      closeDialog();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save", variant: "destructive" });
    }
  };

  const handleEdit = (s: Service) => {
    setEditingService(s);
    setFormData({
      name: s.name, duration: s.duration,
      color: PALETTE.some(p => p.value === s.color) ? s.color : "rose",
      price: s.price || 0, icon: s.icon || "Scissors",
    });
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      const pending = futureCountFor(serviceToDelete);
      if (pending > 0) {
        // Soft delete — auto-purges once last booking is past
        const { error } = await db.from("services")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", serviceToDelete);
        if (error) throw error;
        toast({
          title: "Marked for deletion",
          description: `Service will be removed after ${pending} pending booking${pending === 1 ? "" : "s"} complete.`,
        });
      } else {
        const { error } = await db.from("services").delete().eq("id", serviceToDelete);
        if (error) throw error;
        toast({ title: "Service deleted" });
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false); setServiceToDelete(null);
    }
  };

  const restoreService = async (id: string) => {
    try {
      const { error } = await db.from("services").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
      toast({ title: "Service restored" });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    } catch {
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" });
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false); setEditingService(null);
    setFormData({ name: "", duration: 30, color: "rose", price: 0, icon: "Scissors" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c]">
        <AppSidebar />
        <main className="flex-1 pb-28">
          <div className="max-w-3xl mx-auto px-4 pt-6 md:px-8 md:pt-10">
            {/* Header */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">
                  Services
                </h1>
                <p className="text-[15px] text-[#8E8E93] mt-1">
                  {services.length} {services.length === 1 ? "service" : "services"}
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(o) => (o ? setIsDialogOpen(true) : closeDialog())}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setEditingService(null)}
                    className="h-10 rounded-full px-4 text-white border-0 shadow-sm"
                    style={{ background: ROSE }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[440px] rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingService ? "Edit Service" : "New Service"}</DialogTitle>
                    <DialogDescription>
                      {editingService ? "Update your service details." : "Add a new service to your menu."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Haircut" required className="h-11 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="duration">Duration (min)</Label>
                        <Input id="duration" type="number" min={5} max={480} step={5}
                          value={formData.duration}
                          onChange={(e) => setFormData((p) => ({ ...p, duration: parseInt(e.target.value) || 30 }))}
                          required className="h-11 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input id="price" type="number" min={0} step={0.5}
                          value={formData.price}
                          onChange={(e) => setFormData((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                          className="h-11 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Icon</Label>
                      <IconPicker value={formData.icon}
                        onChange={(icon) => setFormData((p) => ({ ...p, icon }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {PALETTE.map((c) => (
                          <button key={c.value} type="button"
                            onClick={() => setFormData((p) => ({ ...p, color: c.value }))}
                            aria-label={c.label}
                            className={cn(
                              "w-9 h-9 rounded-full transition-transform",
                              formData.color === c.value ? "ring-2 ring-offset-2 ring-[#1C1C1E] dark:ring-white scale-105" : "hover:scale-105"
                            )}
                            style={{ background: c.hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="button" variant="outline" onClick={closeDialog} className="rounded-full">
                        Cancel
                      </Button>
                      <Button type="submit" className="rounded-full text-white border-0" style={{ background: ROSE }}>
                        {editingService ? "Save" : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Empty state */}
            {!isLoading && services.length === 0 && (
              <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-10 text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: `${ROSE}15` }}>
                  <Scissors className="h-6 w-6" style={{ color: ROSE }} />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-white mb-1">
                  No services yet
                </h3>
                <p className="text-sm text-[#8E8E93] mb-5">
                  Create your first service to start taking bookings.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}
                  className="rounded-full text-white border-0" style={{ background: ROSE }}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Service
                </Button>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#1C1C1E] animate-pulse" />
                ))}
              </div>
            )}

            {/* Services list — iOS grouped style */}
            {!isLoading && services.length > 0 && (
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E]">
                {services.map((s) => {
                  const Icon = getIconByName(s.icon || "Scissors");
                  const tint = hexFor(s.color);
                  const count = appointments.filter((a) => a.service_id === s.id).length;
                  return (
                    <div key={s.id} className="group flex items-center gap-3 px-4 py-3.5 active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition-colors">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${tint}18` }}>
                        <Icon className="h-5 w-5" style={{ color: tint }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-white truncate">
                            {s.name}
                          </p>
                          {count > 0 && (
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: `${ROSE}15`, color: ROSE }}>
                              {count}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[13px] text-[#8E8E93]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.duration}m
                          </span>
                          {s.price ? <span>${s.price}</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(s)}
                          className="w-9 h-9 rounded-full hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93]">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setServiceToDelete(s.id); setIsDeleteDialogOpen(true); }}
                          className="w-9 h-9 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                          style={{ color: ROSE }}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-[#C7C7CC] ml-1 hidden md:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete service?</AlertDialogTitle>
              <AlertDialogDescription>
                This action can't be undone. Existing appointments are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}
                className="rounded-full text-white border-0" style={{ background: ROSE }}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
};

export default Services;
