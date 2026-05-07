
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { Loader2, Mail } from "lucide-react";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email || !organization) return;

    setLoading(true);
    try {
      // Generate a unique invitation token
      const invitationToken = crypto.randomUUID();
      
      // For now, we'll just call the Edge Function directly with the invitation data
      // Once the invitations table is created, we can store the invitation in the database first
      const { error: fnError } = await supabase.functions.invoke("send-invitation", {
        body: {
          org_id: organization.id,
          org_name: organization.name,
          email: email,
          token: invitationToken,
          role: role
        }
      });

      if (fnError) {
        console.error("Failed to send email:", fnError);
        toast({
          title: "Failed to send invitation",
          description: "Unable to send invitation email. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${email}`,
        });
        
        onOpenChange(false);
        setEmail("");
        setRole("member");
      }
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
              Members can only view their schedule and assigned customers. Admins can manage everything.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={!email || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
