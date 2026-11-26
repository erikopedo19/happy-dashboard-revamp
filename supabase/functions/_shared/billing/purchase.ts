export const SUBSCRIPTION_TERMS_VERSION = '2026-11-01';
export function hasPurchaseConsent(body: { terms_accepted?: unknown; terms_version?: unknown }) {
  return body.terms_accepted === true && body.terms_version === SUBSCRIPTION_TERMS_VERSION;
}
export function blocksNewCheckout(status: string) {
  return ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(status);
}
// An ended plan only changes the membership it is linked to. It must not overwrite
// another live subscription, or remove gifted Pro from a member with no linked plan.
export function shouldApplySubscription(storedSubscriptionId: string | null | undefined, incoming: { id: string; status: string }) {
  return storedSubscriptionId === incoming.id || ['active', 'trialing', 'past_due'].includes(incoming.status);
}