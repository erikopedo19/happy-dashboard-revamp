export type SeasonalTheme = "minimal" | "halloween" | "christmas" | "newyear";

export const SEASONAL_THEMES: SeasonalTheme[] = ["minimal", "halloween", "christmas", "newyear"];

/** The year the upcoming New Year celebrates — rolls over once December starts. */
export function newYearYear(now = new Date()) {
  return now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
}

/**
 * Which seasonal event (if any) is live for a date.
 *  - New Year:   Dec 27 → Jan 5
 *  - Christmas:  Nov 10 → Dec 26
 *  - Halloween:  Oct 15 → Nov 2
 */
export function pickSeasonalTheme(now = new Date()): SeasonalTheme {
  if (typeof window !== "undefined") {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced && (SEASONAL_THEMES as string[]).includes(forced)) return forced as SeasonalTheme;
  }
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if ((m === 12 && d >= 27) || (m === 1 && d <= 5)) return "newyear";
  if ((m === 11 && d >= 10) || (m === 12 && d <= 26)) return "christmas";
  if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) return "halloween";
  return "minimal";
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
