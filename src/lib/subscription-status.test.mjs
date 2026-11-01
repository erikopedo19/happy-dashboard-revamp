import { expect, test } from "bun:test";
import { subscriptionStatus } from "./subscription-status.ts";
const row = { subscribed: true, subscription_end: "2026-12-23T00:00:00Z", stripe_subscription_id: null, auto_renew: false, cancel_at_period_end: true };
const now = Date.parse("2026-10-30T00:00:00Z");
test("non-recurring Pro is active, not a canceled recurring membership", () => {
  expect(subscriptionStatus(row, now)).toBe("active");
});
test("a stale Stripe id does not expose a canceled recurring state after provider confirms no subscription", () => {
  expect(subscriptionStatus({ ...row, stripe_subscription_id: "sub_old", has_recurring_subscription: false }, now)).toBe("active");
});
test("paid cancellation preserves ending status through its access end", () => {
  expect(subscriptionStatus({ ...row, stripe_subscription_id: "sub_paid" }, now)).toBe("canceling");
  expect(subscriptionStatus(row, Date.parse("2026-12-24T00:00:00Z"))).toBe("expired");
});