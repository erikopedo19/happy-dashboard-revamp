/** Money formatting for Reports, in the shop's own currency (profiles.currency, EUR by default). */
let code = "EUR";
let fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 });

/** Call once at the top of the Reports tree, before any child formats an amount. */
export function setReportsCurrency(next?: string | null) {
  const wanted = (next || "EUR").toUpperCase();
  if (wanted === code) return;
  try {
    fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: wanted, maximumFractionDigits: 0 });
    code = wanted;
  } catch {
    /* unknown code: keep the current formatter */
  }
}

export const money = (n: number) => fmt.format(Number.isFinite(n) ? n : 0);

/** Currency sign on its own ("€", "$"), for components that take a symbol. */
export const moneySymbol = () => fmt.formatToParts(0).find((p) => p.type === "currency")?.value ?? "€";
