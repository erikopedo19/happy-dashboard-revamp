import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Edit, Trash2, UserCheck, MoreHorizontal, X, Star, Calendar, Clock, Briefcase } from "lucide-react";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stylists"] });
      toast({ title: "Stylist deleted successfully" });
    },
    onError: (error: any) => {
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
    if (confirm(`Are you sure you want to delete ${stylist.name}?`)) {
      deleteStylistMutation.mutate(stylist.id);
    }
  };

  const filteredStylists = stylists.filter(stylist => 
    stylist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stylist.title && stylist.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (stylist.status && stylist.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 bg-gradient-to-br from-[#F2F2F7] dark:from-[#0c0c0c] via-[#F2F2F7] dark:via-[#0c0c0c] to-[#E5E5EA]/30 dark:to-[#1C1C1E]/30 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border-b border-[#C6C6C8] dark:border-[#2C2C2E] p-4 lg:hidden shadow-sm">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors text-[#1C1C1E] dark:text-[#F2F2F7]" />
              <h1 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Stylists</h1>
              <div></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">Stylists</h1>
                <p className="text-[#8E8E93] dark:text-gray-500 mt-1">Manage your salon's stylists</p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 bg-[#007AFF] hover:bg-[#0062CC]">
                <Plus className="h-4 w-4" />
                Add Stylist
              </Button>
            </div>

            <div className="mb-6">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#8E8E93] dark:text-gray-500" />
                <Input 
                  placeholder="Search stylists..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white dark:bg-[#1C1C1E] border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]" 
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-[#8E8E93] dark:text-gray-500">Loading stylists...</div>
            ) : filteredStylists.length === 0 ? (
              <Card className="border-dashed border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserCheck className="h-12 w-12 text-[#8E8E93] dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] mb-2">No stylists yet</h3>
                  <p className="text-[#8E8E93] dark:text-gray-500 mb-4">Add your first stylist to get started</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#007AFF] hover:bg-[#0062CC]">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stylist
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStylists.map((stylist) => {
                  const initials = stylist.name
                    .split(/\s+/)
                    .map((word) => word.charAt(0))
                    .filter(Boolean)
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "S";
                    
                  return (
                    <Card 
                      key={stylist.id} 
                      className="overflow-hidden hover:shadow-lg transition-all duration-200 border-[#C6C6C8] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E]"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, stylist });
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-[#C6C6C8] dark:border-[#2C2C2E]">
                              <AvatarImage src={stylist.avatar_url || undefined} />
                              <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg text-[#1C1C1E] dark:text-[#F2F2F7]">{stylist.name}</CardTitle>
                              {stylist.title && (
                                <p className="text-sm text-[#8E8E93] dark:text-gray-500">{stylist.title}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(stylist)} className="text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(stylist)} className="text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#8E8E93] dark:text-gray-500">Status:</span>
                            <Badge className={cn(
                              "font-normal capitalize",
                              stylist.status?.toLowerCase() === 'available' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" : 
                              stylist.status?.toLowerCase() === 'booked' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30" : 
                              "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]/80 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]"
                            )}>
                              {stylist.status || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#8E8E93] dark:text-gray-500">Bookings today:</span>
                            <span className="font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{stylist.bookings_today || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#8E8E93] dark:text-gray-500">Satisfaction:</span>
                            <span className="font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{stylist.satisfaction?.toFixed(1) || 'N/A'}</span>
                          </div>
                          {stylist.specialties && stylist.specialties.length > 0 && (
                            <div className="pt-2">
                              <p className="text-xs text-[#8E8E93] dark:text-gray-500 mb-1">Specialties:</p>
                              <div className="flex flex-wrap gap-1">
                                {stylist.specialties.map((specialty, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-normal border-[#C6C6C8] dark:border-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <MobileDock />
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

      {/* Create Stylist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Stylist</DialogTitle>
            <DialogDescription>Add a new stylist to your salon team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Stylist Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>
            <div>
              <Label htmlFor="title">Title/Position</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior Stylist"
              />
            </div>
            <div>
              <Label htmlFor="specialties">Specialties</Label>
              <Input
                id="specialties"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                placeholder="e.g., Coloring, Cutting, Styling (comma separated)"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStylist} disabled={!formData.name}>
              Add Stylist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stylist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stylist</DialogTitle>
            <DialogDescription>Update stylist information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Stylist Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-title">Title/Position</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-specialties">Specialties</Label>
              <Input
                id="edit-specialties"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                placeholder="Comma separated list"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStylist} disabled={!formData.name}>
              Update Stylist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Stylists;
