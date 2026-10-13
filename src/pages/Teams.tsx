import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@heroui/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InviteMemberDialog } from "@/components/InviteMemberDialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CutziooLoader } from "@/components/CutziooLoader";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, Edit, Trash2, UserPlus, Crown, Scissors, Calendar, Check } from "lucide-react";
import { Avatar } from "@heroui/react";
import { useOrganization } from "@/hooks/use-organization";
import { TeamSetupStepper } from "@/components/TeamSetupStepper";
import { sendOrgInvitation } from "@/lib/invitations";
import { MEMBER_PAGES, DEFAULT_MEMBER_PAGES } from "@/lib/pageAccess";

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
  const [createStep, setCreateStep] = useState(0);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitePages, setInvitePages] = useState<string[]>([...DEFAULT_MEMBER_PAGES]);
  const [inviteSending, setInviteSending] = useState(false);
  const [invitesSent, setInvitesSent] = useState(0);
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
    queryKey: ["stylists-team", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const userId = user.id;
        const result = await (db
          .from("stylists")
          .select("id, name, avatar_url, title") as any)
          .eq("user_id", userId)
          .is("deleted_at", null);
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

  // Create team mutation — returns the new row so the wizard can keep editing it
  const createTeamMutation = useMutation({
    mutationFn: async (data: typeof formData): Promise<{ id: string } | null> => {
      try {
        const userId = user?.id;
        if (!userId) throw new Error("User ID not available");
        const { data: row, error } = await (db.from("teams" as any) as any).insert({
          user_id: userId,
          org_id: organization?.id,
          name: data.name,
          description: data.description,
          color: data.color,
        }).select("id").single();
        if (error) throw error;
        return row;
      } catch (error: any) {
        if (error.message && error.message.includes("column") && error.message.includes("color")) {
          const userId = user?.id;
          if (!userId) throw new Error("User ID not available");

          const { data: row, error: fallbackError } = await (db.from("teams" as any) as any).insert({
            user_id: userId,
            org_id: organization?.id,
            name: data.name,
            description: data.description,
            color: data.color,
          }).select("id").single();
          if (fallbackError) throw fallbackError;
          return row;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
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

  const resetCreateWizard = () => {
    setCreateStep(0);
    setCreatedTeamId(null);
    setFormData({ name: "", description: "", color: "bg-blue-500" });
    setInviteEmail("");
    setInviteRole("member");
    setInvitePages([...DEFAULT_MEMBER_PAGES]);
    setInvitesSent(0);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) resetCreateWizard();
  };

  // Step 0 → creates the team the first time; stepping back edits the same row.
  const handleContinueDetails = () => {
    if (createdTeamId) {
      updateTeamMutation.mutate({ ...formData, id: createdTeamId }, { onSuccess: () => setCreateStep(1) });
    } else {
      createTeamMutation.mutate(formData, {
        onSuccess: (row) => {
          setCreatedTeamId(row?.id ?? null);
          setCreateStep(1);
        },
      });
    }
  };

  const toggleInvitePage = (path: string) =>
    setInvitePages((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const handleWizardInvite = async () => {
    if (!inviteEmail.trim() || !user || !organization) return;
    setInviteSending(true);
    try {
      const { emailSent } = await sendOrgInvitation({
        ownerId: user.id,
        orgId: organization.id,
        orgName: organization.name,
        email: inviteEmail,
        role: inviteRole,
        pages: inviteRole === "member" ? invitePages : null,
      });
      if (emailSent) {
        toast({ title: "Invitation sent", description: `An invitation has been sent to ${inviteEmail}` });
      } else {
        toast({
          title: "Invitation saved, email failed",
          description: "The invite was created but the email couldn't be sent. Share the link manually.",
          variant: "destructive",
        });
      }
      setInvitesSent((c) => c + 1);
      setInviteEmail("");
    } catch (error: any) {
      toast({
        title: "Failed to invite member",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setInviteSending(false);
    }
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
    { value: "bg-blue-500", label: "Blue", dot: "#007AFF" },
    { value: "bg-purple-500", label: "Purple", dot: "#AF52DE" },
    { value: "bg-green-500", label: "Green", dot: "#34C759" },
    { value: "bg-orange-500", label: "Orange", dot: "#FF9500" },
    { value: "bg-pink-500", label: "Pink", dot: "#E0152F" },
    { value: "bg-indigo-500", label: "Indigo", dot: "#5856D6" },
  ];

  if (orgLoading) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
            <CutziooLoader variant="loop" size="64px" wordmark={false} />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-[#0A0A0C] text-white">
        <AppSidebar />
        <main className="flex-1">
          <div className="sticky top-0 z-10 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#2C2C2E] p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-[#1C1C1E] dark:text-white" />
              <h1 className="text-lg font-semibold text-[#1C1C1E] dark:text-white">Teams</h1>
              <div />
            </div>
          </div>

          <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#8E8E93]">
                  Organization
                </p>
                <h1 className="text-[34px] font-semibold tracking-tight text-[#1C1C1E] dark:text-white leading-none mt-1">
                  Teams
                </h1>
                <p className="text-sm text-[#8E8E93] mt-2">
                  {teams.length}/{maxTeams} teams · organize stylists into squads
                </p>
              </div>
              <Button
                onPress={() => setIsCreateDialogOpen(true)}
                className="h-10 rounded-full bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] hover:bg-[#1C1C1E]/90 dark:hover:bg-white/90 px-5 font-medium text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                New team
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-16 text-sm text-[#8E8E93]">Loading teams…</div>
            ) : teams.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-12 text-center">
                <div className="h-12 w-12 mx-auto rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-[#1C1C1E] dark:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1C1E] dark:text-white">
                  No teams yet
                </h3>
                <p className="text-sm text-[#8E8E93] mt-1 max-w-sm mx-auto">
                  Create a team to group stylists, share schedules, and track performance together.
                </p>
                <Button
                  onPress={() => setIsCreateDialogOpen(true)}
                  className="mt-6 h-10 rounded-full bg-[#E0152F] hover:bg-[#E0152F]/90 text-white px-5"
                >
                  <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                  Create your first team
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teams.map((team) => {
                  const colorScheme = team.color ? colorOptions.find((c) => c.value === team.color) || colorOptions[0] : colorOptions[0];
                  const memberCount = allTeamMembers.filter(member => member.team_id === team.id).length;
                  const teamMembers = allTeamMembers.filter(m => m.team_id === team.id).slice(0, 4);
                  return (
                    <Card
                      key={team.id}
                      className="group bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${colorScheme.dot}1A` }}
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: colorScheme.dot }}
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-white truncate">
                                {team.name}
                              </h3>
                              <p className="text-xs text-[#8E8E93] truncate">
                                {team.description || "No description"}
                              </p>
                            </div>
                          </div>
                          <button
                            className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-all"
                            onClick={() => {
                              if (confirm("Delete this team?")) {
                                deleteTeamMutation.mutate(team.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-[#8E8E93]" />
                          </button>
                        </div>

                        {/* Members preview */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {teamMembers.length > 0 ? (
                              <div className="flex -space-x-2">
                                {teamMembers.map((m) => (
                                  <Avatar
                                    key={m.id}
                                    src={m.stylist?.avatar_url || undefined}
                                    name={m.stylist?.name?.slice(0, 2).toUpperCase() || "?"}
                                    className="h-7 w-7"
                                    isBordered
                                  />
                                ))}
                                {memberCount > teamMembers.length && (
                                  <div className="h-7 w-7 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border-2 border-white dark:border-[#1C1C1E] flex items-center justify-center text-[10px] font-semibold text-[#8E8E93]">
                                    +{memberCount - teamMembers.length}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#8E8E93]">No members yet</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            className="h-8 rounded-full text-xs font-medium text-[#1C1C1E] dark:text-white hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]"
                            onPress={() => {
                              setSelectedTeam(team);
                              setIsAddMemberDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            Add
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
              <Button variant="bordered" size="sm" onPress={() => setIsInviteDialogOpen(true)}>
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
                      <Avatar
                        src={stylist.avatar_url || undefined}
                        name={stylist.name?.slice(0, 2).toUpperCase()}
                        className="h-8 w-8"
                      />
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
            <Button variant="bordered" onPress={() => setIsAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onPress={handleAddMembers} isDisabled={!selectedTeam || selectedStylistIds.length === 0 || addMembersMutation.isPending}>
              {addMembersMutation.isPending ? "Adding..." : "Add selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog (email) */}
      <InviteMemberDialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen} />

      {/* Create Team Dialog — stepped popup: details → invite → ready */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createStep === 0 ? "Create New Team" : createStep === 1 ? "Invite your team" : "You're all set"}
            </DialogTitle>
            <DialogDescription>
              {createStep === 0
                ? "Add a new team to organize your stylists"
                : createStep === 1
                  ? "Email an invitation to join your organization"
                  : `${formData.name || "Your team"} is ready`}
            </DialogDescription>
          </DialogHeader>
          <TeamSetupStepper current={createStep} onStepSelect={setCreateStep} />

          {createStep === 0 && (
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
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.dot }} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-4">
              {organization ? (
                <>
                  <div>
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member (Limited Access)</SelectItem>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteRole === "member" && (
                    <div>
                      <Label>Pages they can see</Label>
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border p-3 max-h-36 overflow-y-auto">
                        {MEMBER_PAGES.map((p) => (
                          <label key={p.path} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                            <Checkbox
                              checked={invitePages.includes(p.path)}
                              onCheckedChange={() => toggleInvitePage(p.path)}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                      {invitePages.length === 0 && (
                        <p className="mt-1 text-xs text-[#E0152F]">Pick at least one page, or they'll only see Settings.</p>
                      )}
                    </div>
                  )}
                  <Button
                    variant="bordered"
                    className="w-full"
                    onPress={handleWizardInvite}
                    isLoading={inviteSending}
                    isDisabled={!inviteEmail.trim() || (inviteRole === "member" && invitePages.length === 0)}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Send invitation
                  </Button>
                  {invitesSent > 0 && (
                    <p className="text-xs text-center text-muted-foreground">
                      {invitesSent} invitation{invitesSent > 1 ? "s" : ""} sent
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set up an organization first to invite members — you can always invite later from the team card.
                </p>
              )}
            </div>
          )}

          {createStep === 2 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#34C759]/15">
                <Check className="h-6 w-6 text-[#34C759]" />
              </div>
              <p className="text-base font-semibold">{formData.name || "Your team"} is ready</p>
              <p className="text-sm text-muted-foreground">
                {invitesSent > 0 ? `${invitesSent} invitation${invitesSent > 1 ? "s" : ""} sent. ` : ""}
                Add stylists to the team from its card anytime.
              </p>
            </div>
          )}

          <DialogFooter>
            {createStep === 0 && (
              <>
                <Button variant="bordered" onPress={() => handleCreateDialogChange(false)}>
                  Cancel
                </Button>
                <Button
                  onPress={handleContinueDetails}
                  isDisabled={!formData.name || createTeamMutation.isPending || updateTeamMutation.isPending}
                >
                  {createTeamMutation.isPending || updateTeamMutation.isPending ? "Saving..." : "Continue"}
                </Button>
              </>
            )}
            {createStep === 1 && (
              <Button onPress={() => setCreateStep(2)}>
                {invitesSent > 0 ? "Continue" : "Skip for now"}
              </Button>
            )}
            {createStep === 2 && (
              <Button onPress={() => handleCreateDialogChange(false)}>Done</Button>
            )}
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
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.dot }} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="bordered" onPress={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onPress={handleUpdateTeam} isDisabled={!formData.name}>
              Update Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Teams;
