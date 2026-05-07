import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InviteMemberDialog } from "@/components/InviteMemberDialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, Edit, Trash2, UserPlus, Crown, Scissors } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrganization } from "@/hooks/use-organization";

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface Stylist {
  id: string;
  name: string;
  avatar_url: string | null;
  title: string | null;
}

interface TeamMember {
  id: string;
  team_id: string;
  stylist_id: string;
  role: string;
  stylist: Stylist;
}

const db = supabase as any;

const Teams = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organization, loading: orgLoading } = useOrganization();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", color: "bg-blue-500" });
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([]);
  const isPremium = true; // placeholder plan flag
  const maxTeams = isPremium ? 3 : 1;

  // Fetch teams
  const { data: teams = [], isLoading, error: teamsError } = useQuery<Team[]>({
    queryKey: ["teams", user?.id],
    queryFn: async (): Promise<Team[]> => {
      if (!user) return [];
      try {
        const { data, error } = await (db
          .from("teams" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }) as any);
        
        if (error) {
          console.error("Error fetching teams:", error.message);
          throw error;
        }
        return (data || []) as Team[];
      } catch (error) {
        console.error("Failed to fetch teams:", error);
        toast({
          title: "Error loading teams",
          description: "There was a problem loading your teams. Please try again later.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch stylists
  const { data: stylists = [] } = useQuery<Stylist[]>({
    queryKey: ["stylists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const userId = user.id;
        const result = await (db
          .from("stylists")
          .select("id, name, avatar_url, title") as any)
          .eq("user_id", userId);
        const { data, error } = result as any;
        
        if (error) {
          console.error("Error fetching stylists:", error.message);
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error("Failed to fetch stylists:", error);
        toast({
          title: "Error loading stylists",
          description: "There was a problem loading your stylists. Please try again later.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch team members for all teams
  const { data: allTeamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["team_members", user?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!user) return [];
      const { data, error } = await (db
        .from("team_members" as any)
        .select("*, stylist:stylists(id, name, avatar_url, title)") as any);
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
    enabled: !!user,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      try {
        const userId = user?.id;
        if (!userId) throw new Error("User ID not available");
        const { error } = await (db.from("teams" as any) as any).insert({
          user_id: userId,
          org_id: organization?.id,
          name: data.name,
          description: data.description,
          color: data.color,
        });
        if (error) throw error;
      } catch (error: any) {
        if (error.message && error.message.includes("column") && error.message.includes("color")) {
          const userId = user?.id;
          if (!userId) throw new Error("User ID not available");
          
          const { error: fallbackError } = await (db.from("teams" as any) as any).insert({
            user_id: userId,
            org_id: organization?.id,
            name: data.name,
            description: data.description,
            color: data.color,
          });
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", color: "bg-blue-500" });
      toast({ title: "Team created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create team";
      toast({ 
        title: "Failed to create team", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      try {
        const userId = user?.id;
        if (!userId) throw new Error("User ID not available");
        const { error } = await (db
          .from("teams" as any)
          .update({ 
            name: data.name, 
            description: data.description, 
            user_id: userId,
            color: data.color,
          }) as any)
          .eq("id", data.id) as any;
        if (error) throw error;
      } catch (error: any) {
        // Check if the error is related to the color column
        if (error.message && error.message.includes("column") && error.message.includes("color")) {
          // Try to update without the color field
          const userId = user?.id;
          if (!userId) throw new Error("User ID not available");
          
          const { error: fallbackError } = await (db
            .from("teams" as any)
            .update({ 
              name: data.name, 
              description: data.description,
              user_id: userId,
              color: data.color,
            }) as any)
            .eq("id", data.id) as any;
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setIsEditDialogOpen(false);
      setSelectedTeam(null);
      toast({ title: "Team updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update team", variant: "destructive" });
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await db.from("teams" as any).delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
    },
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async ({ teamId, stylistIds }: { teamId: string; stylistIds: string[] }) => {
      if (!teamId || stylistIds.length === 0) return;
      const rows = stylistIds.map((id) => ({
        team_id: teamId,
        stylist_id: id,
        role: "member",
      }));
      const { error } = await (db.from("team_members" as any) as any).upsert(rows, {
        onConflict: "team_id,stylist_id",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (selectedTeam?.id) {
        queryClient.invalidateQueries({ queryKey: ["team_members", user?.id] });
      }
      setSelectedStylistIds([]);
      setIsAddMemberDialogOpen(false);
      toast({ title: "Members added to team" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add members",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleCreateTeam = () => {
    createTeamMutation.mutate(formData);
  };

  const handleUpdateTeam = () => {
    if (selectedTeam) {
      updateTeamMutation.mutate({ ...formData, id: selectedTeam.id });
    }
  };

  const handleEditClick = (team: Team) => {
    setSelectedTeam(team);
    setFormData({ name: team.name, description: team.description || "", color: team.color });
    setIsEditDialogOpen(true);
  };

  const handleAddMembers = () => {
    if (!selectedTeam) return;
    const existingIds = new Set(allTeamMembers.map((m) => m.stylist_id));
    const newIds = selectedStylistIds.filter((id) => !existingIds.has(id));
    if (newIds.length === 0) {
      toast({
        title: "No stylists selected",
        description: "Select at least one stylist that is not already in the team.",
        variant: "destructive",
      });
      return;
    }
    addMembersMutation.mutate({ teamId: selectedTeam.id, stylistIds: newIds });
  };

  const colorOptions = [
    { value: "bg-blue-500", label: "Blue", gradient: "from-blue-500 to-cyan-500" },
    { value: "bg-purple-500", label: "Purple", gradient: "from-purple-500 to-pink-500" },
    { value: "bg-green-500", label: "Green", gradient: "from-green-500 to-emerald-500" },
    { value: "bg-orange-500", label: "Orange", gradient: "from-orange-500 to-red-500" },
    { value: "bg-pink-500", label: "Pink", gradient: "from-pink-500 to-rose-500" },
    { value: "bg-indigo-500", label: "Indigo", gradient: "from-indigo-500 to-purple-500" },
  ];

  if (orgLoading) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-10 w-10 border-4 border-muted rounded-full border-t-primary animate-spin" />
              <p className="text-sm">Loading organization…</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/30">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 p-4 lg:hidden shadow-sm">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-muted/80 transition-colors" />
              <h1 className="text-lg font-semibold">Teams</h1>
              <div></div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Teams</h1>
                <p className="text-muted-foreground mt-1">Organize your stylists into teams</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="gap-2"
                  disabled={teams.length >= maxTeams}
                >
                  <Plus className="h-4 w-4" />
                  Create Team
                </Button>
                <div className="text-xs text-muted-foreground">
                  {teams.length}/{maxTeams} teams used (premium)
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Loading teams...</div>
            ) : teams.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-dashed bg-gradient-to-br from-blue-50 to-blue-100/30 backdrop-blur-md shadow-lg hover:shadow-xl transition-all overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-sm z-0"></div>
                  <CardContent className="flex flex-col items-center justify-center py-12 relative z-10">
                    <div className="bg-blue-100 p-4 rounded-full mb-4 shadow-inner">
                      <Users className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Create Your First Team</h3>
                    <p className="text-muted-foreground mb-6 text-center max-w-md">Teams help you organize your stylists and manage their schedules more efficiently</p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-lg hover:shadow-xl transition-all">
                      <Plus className="h-4 w-4" />
                      Create Team
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-dashed bg-gradient-to-br from-purple-50 to-purple-100/30 backdrop-blur-md shadow-lg hover:shadow-xl transition-all overflow-hidden">
                  <div className="absolute inset-0 bg-purple-500/5 backdrop-blur-sm z-0"></div>
                  <CardContent className="flex flex-col items-center justify-center py-12 relative z-10">
                    <div className="bg-purple-100 p-4 rounded-full mb-4 shadow-inner">
                      <Scissors className="h-12 w-12 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Team Benefits</h3>
                    <ul className="space-y-3 text-sm text-muted-foreground mb-4">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                        <span>Organize stylists by specialization</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                        <span>Manage team schedules efficiently</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                        <span>Track team performance metrics</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                        <span>Assign clients to specific teams</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => {
                  // Handle missing color value gracefully
                  const colorScheme = team.color ? colorOptions.find((c) => c.value === team.color) || colorOptions[0] : colorOptions[0];
                  // Calculate actual member count for this team
                  const memberCount = allTeamMembers.filter(member => member.team_id === team.id).length;
                  return (
                    <Card key={team.id} className="overflow-hidden border-0 hover:shadow-xl transition-all">
                      <div className={`h-2 bg-gradient-to-r ${colorScheme?.gradient || 'from-blue-500 to-cyan-500'}`} />
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{team.name}</CardTitle>
                            <CardDescription className="mt-1">{team.description || "No description"}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(team)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this team?")) {
                                  deleteTeamMutation.mutate(team.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{memberCount} members</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTeam(team);
                              setIsAddMemberDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Member
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Members Dialog */}
      <Dialog
        open={isAddMemberDialogOpen}
        onOpenChange={(open) => {
          setIsAddMemberDialogOpen(open);
          if (!open) setSelectedStylistIds([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add members to team</DialogTitle>
            <DialogDescription>Select existing stylists or invite by email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedTeam?.name || "Select a team"}</p>
                <p className="text-xs text-muted-foreground">Pending invites will show in Settings → Notifications.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsInviteDialogOpen(true)}>
                Invite by email
              </Button>
            </div>
            <Separator />
            {stylists.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No stylists yet. Invite a stylist to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {stylists.map((stylist) => {
                  const memberIds = new Set(allTeamMembers.map((m) => m.stylist_id));
                  const alreadyMember = memberIds.has(stylist.id);
                  const checked = selectedStylistIds.includes(stylist.id);
                  return (
                    <div
                      key={stylist.id}
                      className={`flex items-center gap-3 p-2 rounded-md border ${alreadyMember ? "opacity-60" : ""}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={alreadyMember}
                        onCheckedChange={(checked) => {
                          setSelectedStylistIds((prev) =>
                            checked ? [...prev, stylist.id] : prev.filter((id) => id !== stylist.id)
                          );
                        }}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={stylist.avatar_url || undefined} alt={stylist.name} />
                        <AvatarFallback>{stylist.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{stylist.name}</p>
                        <p className="text-xs text-muted-foreground">{stylist.title || "Stylist"}</p>
                      </div>
                      {alreadyMember && (
                        <Badge variant="secondary" className="text-xs">
                          Already in team
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMembers} disabled={!selectedTeam || selectedStylistIds.length === 0 || addMembersMutation.isPending}>
              {addMembersMutation.isPending ? "Adding..." : "Add selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog (email) */}
      <InviteMemberDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} />

      {/* Create Team Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>Add a new team to organize your stylists</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Senior Stylists"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the team"
              />
            </div>
            <div>
              <Label htmlFor="color">Color Theme</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${color.gradient}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={!formData.name}>
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update team information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color Theme</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${color.gradient}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam} disabled={!formData.name}>
              Update Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Teams;
