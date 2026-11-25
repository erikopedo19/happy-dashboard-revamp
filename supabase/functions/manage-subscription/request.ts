import { z } from 'npm:zod@3.23.8';

export const MembershipRequest = z.object({
  action: z.enum(['cancel', 'resume', 'sync', 'portal']),
  target_user_id: z.string().uuid().optional(),
  session_id: z.string().regex(/^cs_[a-zA-Z0-9_]+$/).max(255).optional(),
}).strict();

type Member = { id: string; email?: string | null };
export class MembershipRequestError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

// Resolve the member only after checking the caller's server-verified permission.
// Never accept an email, Stripe customer, or provider subscription from the browser.
export async function resolveMembershipTarget(
  caller: Member,
  body: z.infer<typeof MembershipRequest>,
  verifyAdmin: () => Promise<boolean>,
  lookupMember: (id: string) => Promise<Member | null>,
): Promise<Member & { email: string }> {
  let member = caller;
  if (body.target_user_id) {
    if (body.action !== 'cancel' || body.session_id) throw new MembershipRequestError('admin_cancel_only', 400);
    if (!await verifyAdmin()) throw new MembershipRequestError('not_authorized', 403);
    const target = await lookupMember(body.target_user_id);
    if (!target || target.id !== body.target_user_id) throw new MembershipRequestError('member_not_found', 404);
    member = target;
  }
  if (!member.email) throw new MembershipRequestError('member_email_missing', 400);
  return { id: member.id, email: member.email };
}