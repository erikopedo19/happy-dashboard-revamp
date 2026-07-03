import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
}

const Stylists = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
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
    status: "available"
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; stylist: Stylist } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Stylist | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch stylists
  const { data: stylists = [], isLoading } = useQuery<Stylist[]>({
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
        is_public: true,
        satisfaction: 5.0,
        bookings_today: 0
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stylists"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", title: "", specialties: "", status: "available" });
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
          status: data.status
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

  // Delete stylist mutation
  const deleteStylistMutation = useMutation({
    mutationFn: async (stylistId: string) => {
      const { error } = await (supabase as any).from("stylists").delete().eq("id", stylistId);
      if (error) throw error;
    },
    onMutate: (stylistId: string) => {
      setDeletingId(stylistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stylists"] });
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
    createStylistMutation.mutate(formData);
  };

  const handleUpdateStylist = () => {
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
      status: stylist.status || "available"
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (stylist: Stylist) => {
    setDeleteTarget(stylist);
  };

  const confirmDelete = () => {
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
      <div className="h-screen flex w-full bg-[#F5F5F7] dark:bg-[#0a0a0a] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-10 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/5 dark:border-white/5 p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-[#1C1C1E] dark:text-[#F2F2F7]" />
              <h1 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Stylists</h1>
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-9 h-9 rounded-full bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] flex items-center justify-center active:scale-95 transition"
                aria-label="Add stylist"
              >
                <Plus className="w-4 h-4" />
              </button>
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
                <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-full px-5 h-10 bg-[#1C1C1E] hover:bg-[#1C1C1E]/90 text-white dark:bg-white dark:text-[#1C1C1E] dark:hover:bg-white/90">
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
                    <div key={i} className="rounded-3xl bg-white dark:bg-[#1C1C1E] p-5 h-44 animate-pulse" />
                  ))}
                </div>
              ) : filteredStylists.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-dashed border-black/10 dark:border-white/10 p-10 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] mx-auto flex items-center justify-center mb-3">
                    <UserCheck className="h-6 w-6 text-[#8E8E93]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">No stylists yet</h3>
                  <p className="text-sm text-[#8E8E93] mt-1 mb-4">Add your first teammate to start assigning bookings.</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-full bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E]">
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
                        className="group relative rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow p-5"
                      >
                        {/* Deleting overlay */}
                        {isBeingDeleted && (
                          <div className="absolute inset-0 rounded-3xl flex items-center justify-center bg-white/60 dark:bg-[#1C1C1E]/60 z-10">
                            <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
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
                            <h3 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{stylist.name}</h3>
                            <p className="text-xs text-[#8E8E93] truncate">{stylist.title || "Stylist"}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{stylist.satisfaction?.toFixed(1) || "5.0"}</span>
                              <span className="text-xs text-[#8E8E93] ml-2">· {stylist.bookings_today || 0} today</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
                        </div>

                        {stylist.specialties && stylist.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-4">
                            {stylist.specialties.slice(0, 4).map((s, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]/80">
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
          <div
            className="fixed z-[101] w-80 bg-card dark:bg-gray-900 rounded-2xl shadow-2xl border border-border dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 340),
              top: Math.min(contextMenu.y, window.innerHeight - 420),
            }}
          >
            {/* Header */}
            <div className="relative p-4 pb-3 bg-gradient-to-r from-blue-500 to-indigo-600">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10 flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white/30">
                  <AvatarImage src={contextMenu.stylist.avatar_url || undefined} />
                  <AvatarFallback className="bg-card/20 text-white font-semibold text-lg">
                    {contextMenu.stylist.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-base">{contextMenu.stylist.name}</h3>
                  {contextMenu.stylist.title && (
                    <p className="text-white/80 text-xs mt-0.5">{contextMenu.stylist.title}</p>
                  )}
                </div>
                <button onClick={() => setContextMenu(null)} className="w-7 h-7 rounded-full bg-card/20 flex items-center justify-center hover:bg-card/30 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/40 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className={cn(
                    "text-sm font-semibold mt-0.5 capitalize",
                    contextMenu.stylist.status === 'available' ? 'text-green-600' :
                    contextMenu.stylist.status === 'booked' ? 'text-amber-600' : 'text-muted-foreground'
                  )}>{contextMenu.stylist.status || 'Unknown'}</p>
                </div>
                <div className="bg-secondary/40 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Today</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{contextMenu.stylist.bookings_today || 0}</p>
                </div>
                <div className="bg-secondary/40 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rating</p>
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{contextMenu.stylist.satisfaction?.toFixed(1) || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {contextMenu.stylist.next_availability && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <span className="text-foreground/80 dark:text-gray-300">Next: {contextMenu.stylist.next_availability}</span>
                  </div>
                )}
                {contextMenu.stylist.specialties && contextMenu.stylist.specialties.length > 0 && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {contextMenu.stylist.specialties.map((spec, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                          {spec}
                        </Badge>
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
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
              className="fixed z-[121] left-1/2 bottom-6 sm:bottom-auto sm:top-1/2 -translate-x-1/2 sm:-translate-y-1/2 w-[calc(100%-2rem)] max-w-sm"
            >
              <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.28)] overflow-hidden">
                {/* Destructive header */}
                <div className="bg-rose-50 dark:bg-rose-950/40 px-6 pt-6 pb-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" strokeWidth={2.3} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-rose-500">Remove stylist</p>
                    <p className="text-[17px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] tracking-tight truncate">{deleteTarget.name}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                  {/* Stylist mini-card */}
                  <div className="flex items-center gap-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-3 mb-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={deleteTarget.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-white dark:bg-[#3A3A3C]">
                        {deleteTarget.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{deleteTarget.name}</p>
                      <p className="text-[12px] text-[#8E8E93] truncate">{deleteTarget.title || "Stylist"}</p>
                    </div>
                    <span className={cn("ml-auto w-2 h-2 rounded-full shrink-0", statusDot(deleteTarget.status))} />
                  </div>
                  <p className="text-[13px] text-[#8E8E93] leading-relaxed">
                    This will permanently remove this stylist and unassign them from future bookings.
                    Past appointments will not be affected.
                  </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex flex-col gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={confirmDelete}
                    disabled={deleteStylistMutation.isPending}
                    className="w-full h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {deleteStylistMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Removing…</>
                    ) : (
                      <><Trash2 className="w-4 h-4" strokeWidth={2.3} /> Remove {deleteTarget.name.split(" ")[0]}</>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleteStylistMutation.isPending}
                    className="w-full h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1C1C1E] dark:text-[#F2F2F7] font-semibold text-[15px] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Stylist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] sm:rounded-[24px] p-0 border-0 bg-white dark:bg-[#1C1C1E] shadow-2xl data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-4">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-[#1C1C1E] dark:text-[#F2F2F7] text-lg">Add New Stylist</DialogTitle>
            <DialogDescription className="text-[#8E8E93]">Add a new stylist to your salon team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6">
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
          <DialogFooter className="px-6 pb-6 pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-[12px] h-12 flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreateStylist} disabled={!formData.name || createStylistMutation.isPending} className="rounded-[12px] h-12 flex-1 bg-[#0A84FF] hover:bg-[#0066d6] text-white">
              {createStylistMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Stylist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stylist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] sm:rounded-[24px] p-0 border-0 bg-white dark:bg-[#1C1C1E] shadow-2xl data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-4">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-[#1C1C1E] dark:text-[#F2F2F7] text-lg">Edit Stylist</DialogTitle>
            <DialogDescription className="text-[#8E8E93]">Update stylist information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6">
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
          <DialogFooter className="px-6 pb-6 pt-2 gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-[12px] h-12 flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpdateStylist} disabled={!formData.name || updateStylistMutation.isPending} className="rounded-[12px] h-12 flex-1 bg-[#0A84FF] hover:bg-[#0066d6] text-white">
              {updateStylistMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Update Stylist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[#8E8E93]">{label}</p>
      <p className={cn("text-xl font-semibold mt-0.5", color)}>{value}</p>
    </div>
  );
}

export default Stylists;
