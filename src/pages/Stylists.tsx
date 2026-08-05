import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Edit, Trash2, UserCheck, X, Star, Clock, Briefcase, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stylist {
  id: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  status: string | null;
  satisfaction: number | null;
  bookings_today: number | null;
  next_availability: string | null;
  user_id: string;
  created_at: string;
  deleted_at?: string | null;
}

const Stylists = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    specialties: "",
    status: "available",
    avatar_url: "" as string,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; stylist: Stylist } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Stylist | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch stylists (including soft-deleted — we filter them below).
  const { data: allStylists = [], isLoading } = useQuery<Stylist[]>({
    queryKey: ["stylists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("stylists")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Stylist ids that still have an upcoming (non-cancelled) appointment.
  // A soft-deleted stylist stays visible on the team until this is empty.
  const { data: busyStylistIds = [] } = useQuery<string[]>({
    queryKey: ["stylists-busy", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("stylist_id")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .not("stylist_id", "is", null)
        .gte("appointment_date", today);
      if (error) return [];
      return Array.from(new Set((data || []).map((a: any) => a.stylist_id).filter(Boolean)));
    },
    enabled: !!user,
  });

  // Active stylists + soft-deleted ones that still have upcoming appointments.
  const stylists = allStylists.filter(
    (s) => !s.deleted_at || busyStylistIds.includes(s.id)
  );
  const isLeaving = (s: Stylist) => !!s.deleted_at;

  // Create stylist mutation
  const createStylistMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("User not authenticated");
      
      const specialtiesArray = data.specialties
        ? data.specialties.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      
      const { error } = await (supabase as any).from("stylists").insert({
        user_id: user.id,
        name: data.name,
        title: data.title || null,
        specialties: specialtiesArray,
        status: data.status,
        avatar_url: data.avatar_url || null,
        is_public: true,
        satisfaction: 5.0,
        bookings_today: 0
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stylists"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", title: "", specialties: "", status: "available", avatar_url: "" });
      toast({ title: "Stylist created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create stylist";
      toast({ 
        title: "Failed to create stylist", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  // Update stylist mutation
  const updateStylistMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const specialtiesArray = data.specialties
        ? data.specialties.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      
      const { error } = await (supabase as any)
        .from("stylists")
        .update({
          name: data.name,
          title: data.title || null,
          specialties: specialtiesArray,
          status: data.status,
          avatar_url: data.avatar_url || null,
        })
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stylists"] });
      setIsEditDialogOpen(false);
      setSelectedStylist(null);
      toast({ title: "Stylist updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update stylist";
      toast({ 
        title: "Failed to update stylist", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  // Delete stylist mutation (soft delete).
  // Hides the stylist from booking/public immediately. The row is kept until
  // their last appointment passes, then cleanup_pending_stylists() removes it.
  const deleteStylistMutation = useMutation({
    mutationFn: async (stylistId: string) => {
      const { error } = await (supabase as any)
        .from("stylists")
        .update({ deleted_at: new Date().toISOString(), is_public: false })
        .eq("id", stylistId);
      if (error) throw error;
    },
    onMutate: (stylistId: string) => {
      setDeletingId(stylistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stylists"] });
      queryClient.invalidateQueries({ queryKey: ["stylists-busy"] });
      setDeleteTarget(null);
      setDeletingId(null);
      toast({ title: "Stylist removed" });
    },
    onError: (error: any) => {
      setDeletingId(null);
      const errorMessage = error?.message || "Failed to delete stylist";
      toast({ 
        title: "Failed to delete stylist", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const handleCreateStylist = () => {
    if (!requireAuth("Sign in to add stylists")) return;
    createStylistMutation.mutate(formData);
  };

  const handleUpdateStylist = () => {
    if (!requireAuth("Sign in to edit stylists")) return;
    if (selectedStylist) {
      updateStylistMutation.mutate({ ...formData, id: selectedStylist.id });
    }
  };

  const handleEditClick = (stylist: Stylist) => {
    setSelectedStylist(stylist);
    setFormData({
      name: stylist.name,
      title: stylist.title || "",
      specialties: stylist.specialties ? stylist.specialties.join(", ") : "",
      status: stylist.status || "available",
      avatar_url: stylist.avatar_url || "",
    });
    setIsEditDialogOpen(true);
  };

  // Upload stylist avatar to the shared brand-images bucket
  const handleAvatarUpload = async (file: File) => {
    if (!user || !file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/stylists/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await (supabase as any).storage
        .from("brand-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = (supabase as any).storage.from("brand-images").getPublicUrl(path);
      setFormData((f) => ({ ...f, avatar_url: pub.publicUrl }));
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || "Try another image", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteClick = (stylist: Stylist) => {
    setDeleteTarget(stylist);
  };

  const confirmDelete = () => {
    if (!requireAuth("Sign in to remove stylists")) return;
    if (deleteTarget) deleteStylistMutation.mutate(deleteTarget.id);
  };

  const filteredStylists = stylists.filter(stylist => 
    stylist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stylist.title && stylist.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (stylist.status && stylist.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusDot = (s?: string | null) => {
    const v = (s ?? "").toLowerCase();
    if (v === "available") return "bg-emerald-500";
    if (v === "booked") return "bg-amber-500";
    if (v === "off") return "bg-rose-500";
    return "bg-zinc-400";
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#0A0A0C] text-white overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-10 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/5 dark:border-white/5 p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-[#1C1C1E] dark:text-[#F2F2F7]" />
              <h1 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Stylists</h1>
              <div className="w-9" />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {/* Hero header */}
            <div className="px-4 sm:px-8 pt-6 sm:pt-10 pb-4">
              <div className="hidden lg:flex items-end justify-between gap-6 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8E8E93] mb-2">Team</p>
                  <h1 className="text-4xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">Stylists</h1>
                  <p className="text-[#8E8E93] mt-1.5">Manage your team, schedules, and specialties.</p>
                </div>
                <Button onPress={() => setIsCreateDialogOpen(true)} className="rounded-full px-5 h-10 bg-[#FF2D6F] hover:bg-[#e0205e] text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> Add stylist
                </Button>
              </div>

              <div className="flex lg:hidden items-center justify-between gap-4 mb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">Stylists</h1>
                <Button onPress={() => setIsCreateDialogOpen(true)} className="rounded-full px-4 h-9 bg-[#FF2D6F] hover:bg-[#e0205e] text-white text-sm">
                  <Plus className="h-4 w-4 mr-1.5" /> Add stylist
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatPill label="Total" value={stylists.length} />
                <StatPill label="Available" value={stylists.filter(s => (s.status ?? '').toLowerCase() === 'available').length} accent="emerald" />
                <StatPill label="Booked" value={stylists.filter(s => (s.status ?? '').toLowerCase() === 'booked').length} accent="amber" />
              </div>

              {/* Search */}
              <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                <Input
                  placeholder="Search stylists, titles, specialties…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 shadow-sm focus-visible:ring-2 focus-visible:ring-[#1C1C1E]/10 text-[#1C1C1E] dark:text-[#F2F2F7]"
                />
              </div>
            </div>

            <div className="px-4 sm:px-8 pb-32 sm:pb-10">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.06] p-5 h-44 animate-pulse" />
                  ))}
                </div>
              ) : filteredStylists.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-dashed border-black/[0.08] dark:border-white/[0.08] p-10 text-center"
                >
                  <div className="w-14 h-14 rounded-[18px] bg-black/[0.04] dark:bg-white/[0.06] mx-auto flex items-center justify-center mb-3">
                    <UserCheck className="h-6 w-6 text-[#8E8E93]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">No stylists yet</h3>
                  <p className="text-sm text-[#8E8E93] mt-1 mb-4">Add your first teammate to start assigning bookings.</p>
                  <Button onPress={() => setIsCreateDialogOpen(true)} className="rounded-full bg-[#FF2D6F] hover:bg-[#e0205e] text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> Add stylist
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                >
                  <AnimatePresence mode="popLayout">
                  {filteredStylists.map((stylist, index) => {
                    const initials = stylist.name
                      .split(/\s+/).map((w) => w.charAt(0)).filter(Boolean).join("").slice(0, 2).toUpperCase() || "S";
                    const isBeingDeleted = deletingId === stylist.id;
                    const leaving = isLeaving(stylist);
                    return (
                      <motion.div
                        key={stylist.id}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={isBeingDeleted
                          ? { opacity: 0.4, scale: 0.93, filter: "blur(2px)" }
                          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                        }
                        exit={{ opacity: 0, scale: 0.88, y: -8, filter: "blur(4px)", transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
                        transition={{ delay: isBeingDeleted ? 0 : index * 0.05, type: "spring", stiffness: 380, damping: 30 }}
                        whileTap={{ scale: isBeingDeleted ? 1 : 0.98 }}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, stylist }); }}
                        className="group relative rounded-[24px] bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow p-5"
                      >
                        {/* Deleting overlay */}
                        {isBeingDeleted && (
                          <div className="absolute inset-0 rounded-[24px] flex items-center justify-center bg-white/70 dark:bg-[#1C1C1E]/70 z-10">
                            <Loader2 className="w-5 h-5 text-[#8E8E93] animate-spin" />
                          </div>
                        )}

                        <div className="flex items-start gap-3.5">
                          <div className="relative">
                            <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-[#1C1C1E] shadow-sm">
                              <AvatarImage src={stylist.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-[#2C2C2E] dark:to-[#1C1C1E] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#1C1C1E]", statusDot(stylist.status))} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{stylist.name}</h3>
                              {leaving && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Leaving</span>
                              )}
                            </div>
                            <p className="text-xs text-[#8E8E93] truncate">{leaving ? "Removed · finishing booked appointments" : (stylist.title || "Stylist")}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{stylist.satisfaction?.toFixed(1) || "5.0"}</span>
                              <span className="text-xs text-[#8E8E93] ml-2">· {stylist.bookings_today || 0} today</span>
                            </div>
                          </div>
                          {!leaving && (
                            <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleEditClick(stylist)}
                                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5 text-[#1C1C1E] dark:text-[#F2F2F7]" />
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteClick(stylist)}
                                className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </motion.button>
                            </div>
                          )}
                        </div>

                        {stylist.specialties && stylist.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-4">
                            {stylist.specialties.slice(0, 4).map((s, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7]/80">
                                {s}
                              </span>
                            ))}
                            {stylist.specialties.length > 4 && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] text-[#8E8E93]">+{stylist.specialties.length - 4}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>


      {/* Right-Click Context Menu - Stylist Info */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed z-[101] w-[19rem] bg-white dark:bg-[#1C1C1E] rounded-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.22)] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 320),
              top: Math.min(contextMenu.y, window.innerHeight - 400),
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-black/[0.05] dark:ring-white/[0.08]">
                  <AvatarImage src={contextMenu.stylist.avatar_url || undefined} />
                  <AvatarFallback className="bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-lg">
                    {contextMenu.stylist.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{contextMenu.stylist.name}</h3>
                  {contextMenu.stylist.title && (
                    <p className="text-xs text-[#8E8E93] mt-0.5 truncate">{contextMenu.stylist.title}</p>
                  )}
                </div>
                <button onClick={() => setContextMenu(null)} className="w-7 h-7 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-colors">
                  <X className="w-3.5 h-3.5 text-[#1C1C1E] dark:text-[#F2F2F7]" />
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-[16px] p-2.5 text-center">
                  <p className="text-[9px] font-medium text-[#8E8E93] uppercase tracking-wider">Status</p>
                  <p className={cn(
                    "text-[13px] font-semibold mt-0.5 capitalize",
                    contextMenu.stylist.status === 'available' ? 'text-emerald-600' :
                    contextMenu.stylist.status === 'booked' ? 'text-amber-600' : 'text-[#8E8E93]'
                  )}>{contextMenu.stylist.status || 'Unknown'}</p>
                </div>
                <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-[16px] p-2.5 text-center">
                  <p className="text-[9px] font-medium text-[#8E8E93] uppercase tracking-wider">Today</p>
                  <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mt-0.5">{contextMenu.stylist.bookings_today || 0}</p>
                </div>
                <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-[16px] p-2.5 text-center">
                  <p className="text-[9px] font-medium text-[#8E8E93] uppercase tracking-wider">Rating</p>
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{contextMenu.stylist.satisfaction?.toFixed(1) || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {contextMenu.stylist.next_availability && (
                  <div className="flex items-center gap-2.5 text-sm text-[#1C1C1E] dark:text-[#F2F2F7]">
                    <div className="w-7 h-7 rounded-[10px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 text-[#8E8E93]" />
                    </div>
                    <span className="text-[13px]">Next: {contextMenu.stylist.next_availability}</span>
                  </div>
                )}
                {contextMenu.stylist.specialties && contextMenu.stylist.specialties.length > 0 && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-[10px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-3.5 w-3.5 text-[#8E8E93]" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {contextMenu.stylist.specialties.map((spec, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7]/80">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const s = contextMenu.stylist;
                    setContextMenu(null);
                    handleEditClick(s);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[13px] font-medium bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    const s = contextMenu.stylist;
                    setContextMenu(null);
                    handleDeleteClick(s);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[13px] font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ── Delete confirmation sheet ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            {/* Backdrop */}
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm"
              onClick={() => !deleteStylistMutation.isPending && setDeleteTarget(null)}
            />
            {/* Sheet */}
            <motion.div
              key="delete-sheet"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="fixed z-[121] left-0 right-0 bottom-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto -translate-x-0 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-auto sm:max-w-sm"
            >
              <div className="rounded-t-[28px] sm:rounded-[28px] pb-[env(safe-area-inset-bottom,0px)] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.22)] overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[16px] bg-rose-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" strokeWidth={2.3} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tracking-tight truncate">Remove {deleteTarget.name}?</p>
                    <p className="text-[12px] text-[#8E8E93] mt-0.5">This will unassign them from future bookings.</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 pb-4">
                  <p className="text-[13px] text-[#8E8E93] leading-relaxed">
                    Past appointments will not be affected. You can always add this stylist again later.
                  </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex flex-col gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDelete}
                    disabled={deleteStylistMutation.isPending}
                    className="w-full h-12 rounded-[14px] bg-rose-500 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {deleteStylistMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Removing…</>
                    ) : (
                      <><Trash2 className="w-4 h-4" strokeWidth={2.3} /> Remove</>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleteStylistMutation.isPending}
                    className="w-full h-12 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-[15px] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Stylist Sheet */}
      <Sheet open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-[32px] bg-[#1C1C1E] border border-white/[0.08] border-b-0 border-t-0 p-0 max-h-[90vh] overflow-y-auto">
          <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/20" />
          <SheetHeader className="px-6 pt-4 pb-2">
            <SheetTitle className="text-white text-lg">Add New Stylist</SheetTitle>
            <SheetDescription className="text-white/60">Add a new stylist to your salon team</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6">
            <AvatarUploader value={formData.avatar_url} onFile={handleAvatarUpload} uploading={uploadingAvatar} name={formData.name} />
            <div>
              <Label htmlFor="name" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Stylist Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Smith"
                className="rounded-[12px] h-12"
              />
            </div>
            <div>
              <Label htmlFor="title" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Title/Position</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior Stylist"
                className="rounded-[12px] h-12"
              />
            </div>
            <div>
              <Label htmlFor="specialties" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Specialties</Label>
              <Input
                id="specialties"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                placeholder="e.g., Coloring, Cutting, Styling (comma separated)"
                className="rounded-[12px] h-12"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="rounded-[12px] h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="px-6 pb-8 pt-2 gap-2">
            <Button variant="bordered" onPress={() => setIsCreateDialogOpen(false)} className="rounded-[14px] h-12 flex-1 border-white/[0.12] bg-transparent text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button onPress={handleCreateStylist} isDisabled={!formData.name || createStylistMutation.isPending} className="rounded-[14px] h-12 flex-1 bg-[#FF2D6F] hover:bg-[#e0205e] text-white">
              {createStylistMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Stylist"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Stylist Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-md rounded-t-[32px] bg-[#1C1C1E] border border-white/[0.08] border-b-0 border-t-0 p-0 max-h-[90vh] overflow-y-auto">
          <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/20" />
          <SheetHeader className="px-6 pt-4 pb-2">
            <SheetTitle className="text-white text-lg">Edit Stylist</SheetTitle>
            <SheetDescription className="text-white/60">Update stylist information</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6">
            <AvatarUploader value={formData.avatar_url} onFile={handleAvatarUpload} uploading={uploadingAvatar} name={formData.name} />
            <div>
              <Label htmlFor="edit-name" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Stylist Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-[12px] h-12"
              />
            </div>
            <div>
              <Label htmlFor="edit-title" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Title/Position</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-[12px] h-12"
              />
            </div>
            <div>
              <Label htmlFor="edit-specialties" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Specialties</Label>
              <Input
                id="edit-specialties"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                placeholder="Comma separated list"
                className="rounded-[12px] h-12"
              />
            </div>
            <div>
              <Label htmlFor="edit-status" className="text-[#1C1C1E] dark:text-[#F2F2F7]">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="rounded-[12px] h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="px-6 pb-8 pt-2 gap-2">
            <Button variant="bordered" onPress={() => setIsEditDialogOpen(false)} className="rounded-[14px] h-12 flex-1 border-white/[0.12] bg-transparent text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button onPress={handleUpdateStylist} isDisabled={!formData.name || updateStylistMutation.isPending} className="rounded-[14px] h-12 flex-1 bg-[#FF2D6F] hover:bg-[#e0205e] text-white">
              {updateStylistMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Update Stylist"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
};

function StatPill({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "amber" }) {
  const color = accent === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : accent === "amber"
    ? "text-amber-600 dark:text-amber-400"
    : "text-[#1C1C1E] dark:text-[#F2F2F7]";
  return (
    <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.06] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[#8E8E93]">{label}</p>
      <p className={cn("text-[19px] font-semibold mt-0.5", color)}>{value}</p>
    </div>
  );
}

function AvatarUploader({
  value,
  onFile,
  uploading,
  name,
}: {
  value: string;
  onFile: (file: File) => void;
  uploading: boolean;
  name: string;
}) {
  const initials = (name || "S")
    .split(/\s+/).map((w) => w.charAt(0)).filter(Boolean).join("").slice(0, 2).toUpperCase() || "S";
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-16 w-16 ring-2 ring-black/[0.05] dark:ring-white/10">
          <AvatarImage src={value || undefined} />
          <AvatarFallback className="bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <Label className="text-[#1C1C1E] dark:text-[#F2F2F7]">Profile photo</Label>
        <p className="text-[11px] text-[#8E8E93] mb-2">PNG or JPG, up to 5MB</p>
        <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#FF2D6F] hover:bg-[#e0205e] text-[13px] font-medium text-white cursor-pointer transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.currentTarget.value = "";
            }}
          />
          {value ? "Change photo" : "Upload photo"}
        </label>
      </div>
    </div>
  );
}

export default Stylists;
