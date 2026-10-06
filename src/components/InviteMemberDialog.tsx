
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Mail } from "lucide-react";
import { MEMBER_PAGES, DEFAULT_MEMBER_PAGES } from "@/lib/pageAccess";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [pages, setPages] = useState<string[]>([...DEFAULT_MEMBER_PAGES]);
  const [loading, setLoading] = useState(false);

  const togglePage = (path: string) =>
    setPages((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const handleInvite = async () => {
    if (!email || !organization || !user) return;

    setLoading(true);
    try {
      const invitationToken = crypto.randomUUID();
      const allowedPages = role === "member" ? pages : null;

      // Persist the invitation so accept_invitation can create the membership
      // with the chosen page access. invitations.org_id is the owner's profile
      // id (the RLS policy requires org_id = auth.uid()).
      const { error: inviteError } = await (supabase as any).from("invitations").insert({
        org_id: user.id,
        email: email.trim().toLowerCase(),
        role,
        token: invitationToken,
        allowed_pages: allowedPages,
        status: "pending",
      });
      if (inviteError) throw inviteError;

      const { error: fnError } = await supabase.functions.invoke("send-invitation", {
        body: {
          org_id: organization.id,
          org_name: organization.name,
          email: email.trim().toLowerCase(),
          token: invitationToken,
          role: role
        }
      });

      if (fnError) {
        console.error("Failed to send email:", fnError);
        toast({
          title: "Invitation saved, email failed",
          description: "The invite was created but the email couldn't be sent. Share the link manually.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${email}`,
        });
      }

      onOpenChange(false);
      setEmail("");
      setRole("member");
      setPages([...DEFAULT_MEMBER_PAGES]);
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast({
        title: "Failed to invite member",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an email invitation to join your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              placeholder="colleague@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member (Limited Access)</SelectItem>
                <SelectItem value="admin">Admin (Full Access)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admins can manage everything. Members only see the pages you pick below.
            </p>
          </div>
          {role === "member" && (
            <div className="space-y-2">
              <Label>Pages they can see</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border p-3">
                {MEMBER_PAGES.map((p) => (
                  <label key={p.path} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                    <Checkbox
                      checked={pages.includes(p.path)}
                      onCheckedChange={() => togglePage(p.path)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              {pages.length === 0 && (
                <p className="text-xs text-[#E0152F]">Pick at least one page, or they'll only see Settings.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={!email || loading || (role === "member" && pages.length === 0)}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
