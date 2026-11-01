import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { AccessRequest, type AccessRequester } from "@/components/ui/access-request";

interface PendingInvite {
  id: string;
  email: string;
  role: string | null;
  token: string;
  expires_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- invitations.status/token columns are missing from generated types
const db = supabase as any;

const expiryLabel = (iso: string | null) => {
  if (!iso) return "";
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return " · expired";
  return days === 1 ? " · expires tomorrow" : ` · expires in ${days} days`;
};

/** Owner-side list of pending team invitations: resend the email or revoke the invite. */
export function SentInvitations({ className }: { className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState(false);
  const queryKey = ["sent-invitations", user?.id];

  const { data: invites = [] } = useQuery<PendingInvite[]>({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("invitations")
        .select("id, email, role, token, expires_at")
        .eq("org_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const byId = useMemo(() => new Map(invites.map((i) => [i.id, i])), [invites]);
  const requests = useMemo<AccessRequester[]>(
    () =>
      invites.map((i) => ({
        id: i.id,
        name: i.email,
        description: `${i.role === "admin" ? "Admin" : "Member"}${expiryLabel(i.expires_at)}`,
      })),
    [invites]
  );

  if (hidden || invites.length === 0) return null;

  return (
    <AccessRequest
      className={"!w-full " + (className ?? "")}
      requests={requests}
      labels={{
        heading: "Sent invitations",
        subtitle: invites.length === 1 ? "invite waiting to be accepted" : "invites waiting to be accepted",
        approve: "Resend",
        decline: "Revoke",
        approved: "Sent",
        declined: "Revoked",
        empty: "No pending invitations.",
      }}
      errorMessage="Couldn't update this invitation. Please try again."
      onDecision={async (person, decision) => {
        const invite = byId.get(person.id);
        if (!invite) throw new Error("Invitation not found");
        if (decision === "approved") {
          const { data, error } = await supabase.functions.invoke("send-invitation", {
            body: { token: invite.token, email: invite.email, role: invite.role },
          });
          if (error || !data?.success) {
            const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
            haptic("error");
            toast({
              title: "Email couldn't be sent",
              description: details?.error || "Retry or share the invitation link.",
              variant: "destructive",
            });
            throw error ?? new Error("Email delivery was not confirmed");
          }
          haptic("success");
          return;
        }
        const { error } = await db.from("invitations").delete().eq("id", invite.id);
        if (error) throw error;
        haptic("light");
      }}
      onResolved={(person, decision) => {
        if (decision === "declined") {
          queryClient.setQueryData<PendingInvite[]>(queryKey, (prev) => prev?.filter((i) => i.id !== person.id));
          queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
        }
      }}
      onDismiss={() => setHidden(true)}
    />
  );
}

export default SentInvitations;
