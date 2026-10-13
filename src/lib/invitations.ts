import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a pending org invitation and asks the edge function to email it.
 * `invitations.org_id` must be the owner's profile id — the RLS policy
 * requires org_id = auth.uid() — while the edge function wants the real
 * organization id for the email body.
 */
export async function sendOrgInvitation(opts: {
  ownerId: string;
  orgId?: string;
  orgName?: string;
  email: string;
  role: string;
  /** Allowed pages for member invites; ignored for other roles. */
  pages?: string[] | null;
}): Promise<{ emailSent: boolean }> {
  const token = crypto.randomUUID();
  const email = opts.email.trim().toLowerCase();

  const { error: inviteError } = await (supabase as any).from("invitations").insert({
    org_id: opts.ownerId,
    email,
    role: opts.role,
    token,
    allowed_pages: opts.role === "member" ? opts.pages ?? null : null,
    status: "pending",
  });
  if (inviteError) throw inviteError;

  const { error: fnError } = await supabase.functions.invoke("send-invitation", {
    body: {
      org_id: opts.orgId,
      org_name: opts.orgName,
      email,
      token,
      role: opts.role,
    },
  });

  return { emailSent: !fnError };
}
