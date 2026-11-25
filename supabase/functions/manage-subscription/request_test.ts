import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { MembershipRequest, MembershipRequestError, resolveMembershipTarget } from './request.ts';

const caller = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'admin@example.test' };
const member = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'member@example.test' };
const cancel = { action: 'cancel' as const, target_user_id: member.id };

Deno.test('only a server-verified Superadmin can cancel another member subscription', async () => {
  let lookedUp = false;
  await assertRejects(() => resolveMembershipTarget(caller, cancel, async () => false, async () => { lookedUp = true; return member; }), MembershipRequestError, 'not_authorized');
  assertEquals(lookedUp, false);
});
Deno.test('Superadmin cancellation uses the selected member and their verified email, never the administrator', async () => {
  assertEquals(await resolveMembershipTarget(caller, cancel, async () => true, async id => id === member.id ? member : null), member);
});
Deno.test('ordinary members can still cancel themselves without an admin grant', async () => {
  assertEquals(await resolveMembershipTarget(member, { action: 'cancel' }, async () => false, async () => null), member);
});
Deno.test('admin target cannot be used to resume another subscription or open their payment portal', async () => {
  for (const action of ['resume', 'portal', 'sync'] as const) {
    await assertRejects(() => resolveMembershipTarget(caller, { ...cancel, action }, async () => true, async () => member), MembershipRequestError, 'admin_cancel_only');
  }
});
Deno.test('invalid targets and caller-supplied billing identities are rejected', () => {
  assertEquals(MembershipRequest.safeParse({ ...cancel, target_user_id: 'not-a-user-id' }).success, false);
  assertEquals(MembershipRequest.safeParse({ ...cancel, email: 'someone-else@example.test' }).success, false);
  assertEquals(MembershipRequest.safeParse({ ...cancel, stripe_customer_id: 'cus_other' }).success, false);
});
Deno.test('missing target fails instead of cancelling the administrator plan', async () => {
  await assertRejects(() => resolveMembershipTarget(caller, cancel, async () => true, async () => null), MembershipRequestError, 'member_not_found');
});