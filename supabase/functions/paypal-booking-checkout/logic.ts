// Pure helpers for PayPal booking payments (unit-tested in logic_test.ts).

/** Currencies PayPal Orders accept that Cutzioo businesses use. */
export const PAYPAL_CURRENCIES = new Set([
  "EUR", "USD", "GBP", "PLN", "CHF", "SEK", "NOK", "DKK", "CZK", "HUF", "CAD", "AUD",
]);

const ZERO_DECIMAL = new Set(["HUF", "JPY", "TWD"]);

/** PayPal wants amounts as strings with the currency's decimals, e.g. "10.00". */
export function toPayPalAmount(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return String(Math.round(amount));
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/** Amount stored in our payments table (minor units). */
export function toMinor(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}

/** Only our own sites may receive the buyer back from PayPal. */
export function isAllowedReturnOrigin(origin: string): boolean {
  return ["https://cutzioo.com", "https://www.cutzioo.com", "https://happy-ios-dash.lovable.app", "http://localhost:8080"].includes(origin)
    || /^https:\/\/[a-zA-Z0-9-]+\.lovable\.app$/.test(origin);
}

type CaptureCheck = {
  status?: string;
  purchase_units?: Array<{
    payee?: { email_address?: string };
    payments?: { captures?: Array<{ id: string; status: string; amount?: { value: string; currency_code: string } }> };
  }>;
};

/**
 * A booking only counts as paid when PayPal completed the capture, for the exact
 * amount and currency we asked for, into the barber's own PayPal account.
 */
export function verifyCapture(order: CaptureCheck, expected: { value: string; currency: string; payeeEmail: string }) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.find((c) => c.status === "COMPLETED");
  if (order.status !== "COMPLETED" || !capture) return { ok: false as const, reason: "not_completed" };
  if (capture.amount?.value !== expected.value || capture.amount?.currency_code !== expected.currency.toUpperCase()) {
    return { ok: false as const, reason: "amount_mismatch" };
  }
  const payee = unit?.payee?.email_address?.toLowerCase();
  if (payee && payee !== expected.payeeEmail.toLowerCase()) return { ok: false as const, reason: "payee_mismatch" };
  return { ok: true as const, captureId: capture.id };
}
