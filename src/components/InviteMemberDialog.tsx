
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Mail, Copy, Check, UserPlus, Shield, User } from "lucide-react";
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
        if (inviteError && /allowed_pages|PGRST204|schema cache/i.test(inviteError.message || "")) {
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
    } catch (error) {
      console.error("Error inviting member:", error);
      toast({
        title: "Failed to invite member",
        description: (error as { message?: string })?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const locked = loading || !!savedToken;
  const canSend = validEmail && !!organization && !loading && !(role === "member" && pages.length === 0);
  const ROLES = [
    { value: "member", label: "Member", hint: "Only the pages you pick", icon: User },
    { value: "admin", label: "Admin", hint: "Full access", icon: Shield },
  ];

  const fields = (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</div>
        <div className="flex h-[52px] items-center gap-2.5 rounded-[14px] bg-muted/60 px-4 ring-1 ring-inset ring-border/60 transition focus-within:ring-2 focus-within:ring-[#FF2D46]/60">
          <Mail className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <Input
            id="email"
            placeholder="colleague@example.com"
            type="email"
            inputMode="email"
            value={email}
            disabled={locked}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="h-full border-0 bg-transparent p-0 text-[16px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {validEmail && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
        </div>
      </div>

      <div>
        <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</div>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-muted/60 p-1 ring-1 ring-inset ring-border/60">
          {ROLES.map(({ value, label, hint, icon: Icon }) => {
            const on = role === value;
            return (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => { haptic("light"); setRole(value); }}
                className={
                  "flex flex-col items-start rounded-[11px] px-3 py-2.5 text-left transition-all duration-200 disabled:opacity-60 " +
                  (on ? "bg-background shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-border/60" : "text-muted-foreground")
                }
              >
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  <Icon className={"h-3.5 w-3.5 " + (on ? "text-[#FF2D46]" : "")} /> {label}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {role === "member" && (
        <div>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pages they can see</span>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{pages.length}/{MEMBER_PAGES.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MEMBER_PAGES.map((pg) => {
              const on = pages.includes(pg.path);
              return (
                <button
                  key={pg.path}
                  type="button"
                  disabled={locked}
                  onClick={() => { haptic("light"); togglePage(pg.path); }}
                  className={
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 ring-inset transition-all duration-200 active:scale-95 disabled:opacity-60 " +
                    (on ? "bg-[#FF2D46]/10 text-[#FF2D46] ring-[#FF2D46]/35" : "bg-muted/60 text-foreground/80 ring-border/60")
                  }
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {pg.label}
                </button>
              );
            })}
          </div>
          {pages.length === 0 && (
            <p className="mt-2 px-1 text-[12px] text-destructive">Pick at least one page, or they'll only see Settings.</p>
          )}
        </div>
      )}

      {deliveryError && (
        <div className="space-y-2 rounded-[14px] bg-destructive/10 p-3">
          <p role="alert" className="text-[13px] text-destructive">{deliveryError}</p>
          <button
            type="button"
            onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); toast({ title: "Invitation link copied" }); } catch { toast({ title: "Copy the link below" }); } }}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-background text-[14px] font-semibold ring-1 ring-border"
          >
            <Copy className="h-4 w-4" /> Copy invitation link
          </button>
          <Input aria-label="Invitation link" readOnly value={inviteUrl} className="rounded-[12px] text-[12px]" />
        </div>
      )}

      <div className="space-y-1 pt-1">
        <button
          type="button"
          onClick={handleInvite}
          disabled={!canSend}
          className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(180deg,#FF5A6E_0%,#FF2D46_55%,#E0152F_100%)] text-[16px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {savedToken ? "Retry email" : "Send invitation"}
        </button>
        {!inline && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-[14px] text-[15px] font-medium text-muted-foreground transition active:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
  if (inline) return fields;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) { onOpenChange(next); if (!next) { setSavedToken(null); setDeliveryError(""); setEmail(""); } } }}>
      <DialogContent className="z-[90] gap-0 sm:max-w-[420px] sm:rounded-[24px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#FF2D46]/10 text-[#FF2D46]">
            <UserPlus className="h-[22px] w-[22px]" />
          </div>
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.02em]">Invite team member</DialogTitle>
          <DialogDescription className="mt-1 text-[13px]">They'll get an email with a link to join.</DialogDescription>
        </div>
        {fields}
      </DialogContent>
    </Dialog>
  );
}
