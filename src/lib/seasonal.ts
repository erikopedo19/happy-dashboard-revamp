export type SeasonalTheme = "minimal" | "halloween" | "christmas" | "newyear";

export const SEASONAL_THEMES: SeasonalTheme[] = ["minimal", "halloween", "christmas", "newyear"];

/** The year the upcoming New Year celebrates — rolls over once December starts. */
export function newYearYear(now = new Date()) {
  return now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
}

/**
 * Which seasonal event (if any) is live for a date.
 *  - New Year:   Dec 27 → Jan 5
 *  - Christmas:  40 days before → Dec 25
 *  - Halloween:  40 days before → Oct 31
 * Once an event has passed the invite page falls back to the simple theme.
 */
export function pickSeasonalTheme(now = new Date()): SeasonalTheme {
  if (typeof window !== "undefined") {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced && (SEASONAL_THEMES as string[]).includes(forced)) return forced as SeasonalTheme;
  }
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if ((m === 12 && d >= 27) || (m === 1 && d <= 5)) return "newyear";
  if (inLeadUp(now, 11, 25)) return "christmas";
  if (inLeadUp(now, 9, 31)) return "halloween";
  return "minimal";
}

const LEAD_DAYS = 40;

/** True from LEAD_DAYS before the event (month is 0-based) through the event day. */
function inLeadUp(now: Date, month: number, day: number) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const event = new Date(now.getFullYear(), month, day);
  const diff = Math.round((event.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 && diff <= LEAD_DAYS;
}

export interface SeasonalCopy {
  eyebrow: string;
  /** Headline lines, rendered one per row. */
  headline: [string, string];
  lead: string;
}

export function seasonalCopy(theme: SeasonalTheme, now = new Date()): SeasonalCopy {
  switch (theme) {
    case "halloween":
      return {
        eyebrow: "Trick or treat",
        headline: ["TELL A", "FRIEND"],
        lead: "Tell someone about Cutzioo — no tricks, just treats. You could win a month of Premium.",
      };
    case "christmas":
      return {
        eyebrow: "Holiday gift",
        headline: ["Tell a", "friend"],
        lead: "Share the gift of a fresh cut. Tell someone about Cutzioo and you could win a month of Premium.",
      };
    case "newyear":
      return {
        eyebrow: `Hello ${newYearYear(now)}`,
        headline: ["Tell a", "friend"],
        lead: "New year, fresh cut. Tell someone about Cutzioo and you could win a month of Premium.",
      };
    default:
      return {
        eyebrow: "Invite & win",
        headline: ["Tell a", "friend."],
        lead: "Tell someone about Cutzioo and you could win a month of Premium — on us.",
      };
  }
}
