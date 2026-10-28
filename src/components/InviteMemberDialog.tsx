
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
import { Loader2, Mail, Copy } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { haptic } from "@/lib/haptics";
import { MEMBER_PAGES, DEFAULT_MEMBER_PAGES } from "@/lib/pageAccess";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inline?: boolean;
  onInvited?: () => void;
}

export function InviteMemberDialog({ open, onOpenChange, inline = false, onInvited }: InviteMemberDialogProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [pages, setPages] = useState<string[]>([...DEFAULT_MEMBER_PAGES]);
  const [loading, setLoading] = useState(false);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState("");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const inviteUrl = savedToken ? `https://cutzioo.com/onboarding?invite=${encodeURIComponent(savedToken)}` : "";

  const togglePage = (path: string) =>
    setPages((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const handleInvite = async () => {
    if (!validEmail || !organization || !user || loading) return;

    setLoading(true);
    try {
      const invitationToken = savedToken || crypto.randomUUID();
      setDeliveryError("");
      const allowedPages = role === "member" ? pages : null;

      // Persist the invitation so accept_invitation can create the membership
      // with the chosen page access. invitations.org_id is the owner's profile
      // id (the RLS policy requires org_id = auth.uid()).
      const row = {
        org_id: user.id,
        email: email.trim().toLowerCase(),
        role,
        token: invitationToken,
        allowed_pages: allowedPages,
        status: "pending",
      };
      let inviteError: { message?: string } | null = null;
      const invitations = (supabase as unknown as {
        from: (t: string) => { insert: (r: object) => Promise<{ error: { message?: string } | null }> };
      }).from("invitations");
      if (!savedToken) {
        ({ error: inviteError } = await invitations.insert(row));
        if (inviteError && /allowed_pages/.test(inviteError.message || "")) {
          const { allowed_pages: _omit, ...withoutPages } = row;
          ({ error: inviteError } = await invitations.insert(withoutPages));
        }
      }
      if (inviteError) throw inviteError;
      setSavedToken(invitationToken);

      const { data: result, error: fnError } = await supabase.functions.invoke("send-invitation", {
        body: {
          org_id: organization.id,
          org_name: organization.name,
          email: email.trim().toLowerCase(),
          token: invitationToken,
          role: role
        }
      });

      if (fnError) {
        const details = fnError instanceof FunctionsHttpError ? await fnError.context.json().catch(() => null) : null;
        setDeliveryError(details?.error || "Email could not be sent. Retry or copy the invitation link.");
        haptic("error");
        toast({
          title: "Invitation saved, email failed",
          description: "The invite was created but the email couldn't be sent. Share the link manually.",
          variant: "destructive",
        });
        return;
      } else if (result?.success) {
        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${email}`,
        });
      } else {
        throw new Error("Email delivery was not confirmed. Please retry.");
      }

      onOpenChange(false);
      setEmail("");
      setRole("member");
      setPages([...DEFAULT_MEMBER_PAGES]);
      setSavedToken(null);
      haptic("success");
      onInvited?.();
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

  const fields = <>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              placeholder="colleague@example.com"
              type="email"
              value={email}
              disabled={loading || !!savedToken}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading || !!savedToken}>
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
                      disabled={loading || !!savedToken}
                      onCheckedChange={() => togglePage(p.path)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              {pages.length === 0 && (
                <p className="text-xs text-destructive">Pick at least one page, or they'll only see Settings.</p>
              )}
            </div>
          )}
        </div>
        {deliveryError && <div className="space-y-2 pb-4"><p role="alert" className="text-sm text-destructive">{deliveryError}</p><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); toast({ title: "Invitation link copied" }); } catch { toast({ title: "Copy the link below" }); } }}><Copy className="mr-2 h-4 w-4" />Copy invitation link</Button><Input aria-label="Invitation link" readOnly value={inviteUrl} /></div>}
        <DialogFooter className="gap-2">
          {!inline && <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>}
          <Button className={inline ? "w-full" : undefined} onClick={handleInvite} disabled={!validEmail || !organization || loading || (role === "member" && pages.length === 0)}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            {savedToken ? "Retry email" : "Send invitation"}
          </Button>
        </DialogFooter>
  </>;
  if (inline) return fields;
  return <Dialog open={open} onOpenChange={(next) => { if (!loading) { onOpenChange(next); if (!next) { setSavedToken(null); setDeliveryError(""); setEmail(""); } } }}><DialogContent className="z-[90]"><DialogHeader><DialogTitle>Invite team member</DialogTitle><DialogDescription>Send an email invitation to join your organization.</DialogDescription></DialogHeader>{fields}</DialogContent></Dialog>;
}
