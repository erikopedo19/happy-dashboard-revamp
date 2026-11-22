import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isAllowedReturnOrigin, toPayPalAmount, verifyCapture } from "./logic.ts";

const paid = (value: string, currency = "EUR", email = "barber@example.com") => ({
  status: "COMPLETED",
  purchase_units: [{ payee: { email_address: email }, payments: { captures: [{ id: "CAP1", status: "COMPLETED", amount: { value, currency_code: currency } }] } }],
});
const expected = { value: "25.00", currency: "EUR", payeeEmail: "Barber@Example.com" };

Deno.test("formats PayPal amounts with two decimals", () => {
  assertEquals(toPayPalAmount(25, "EUR"), "25.00");
  assertEquals(toPayPalAmount(12.5, "eur"), "12.50");
});

Deno.test("a full capture into the barber's PayPal marks the booking paid", () => {
  assertEquals(verifyCapture(paid("25.00"), expected), { ok: true, captureId: "CAP1" });
});

Deno.test("a smaller captured amount is not accepted as paid", () => {
  assertEquals(verifyCapture(paid("1.00"), expected).ok, false);
});

Deno.test("money sent to a different PayPal account is not accepted", () => {
  assertEquals(verifyCapture(paid("25.00", "EUR", "someone-else@example.com"), expected).ok, false);
});

Deno.test("an unfinished order is not accepted", () => {
  assertEquals(verifyCapture({ status: "APPROVED", purchase_units: [] }, expected).ok, false);
});

Deno.test("only Cutzioo sites can receive buyers back", () => {
  assertEquals(isAllowedReturnOrigin("https://cutzioo.com"), true);
  assertEquals(isAllowedReturnOrigin("https://evil.example"), false);
});
