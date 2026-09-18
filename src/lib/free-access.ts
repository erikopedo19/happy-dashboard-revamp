/**
 * Temporary "everything is free" period.
 *
 * While FREE_ACCESS_ENABLED is true:
 *  - the app does not sell subscriptions or the one-off boost
 *  - every account gets full Pro features until FREE_ACCESS_UNTIL
 *
 * Nothing about existing paid subscriptions is deleted — the `subscribers`
 * data stays intact and simply takes over again once this flag is false.
 */
export const FREE_ACCESS_ENABLED = false;

/** End of the gifted period (2 months). */
export const FREE_ACCESS_UNTIL = new Date("2026-11-09T00:00:00Z");

export const FREE_ACCESS_MONTHS = 2;

export function freeAccessUntilLabel(locale?: string) {
  return FREE_ACCESS_UNTIL.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
