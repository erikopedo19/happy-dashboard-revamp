import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { briefingDates, localDayRangeUtc, shouldSendNow } from "./logic.ts";

Deno.test("sends at 9:00 Athens in winter (07:00 UTC)", () => {
  assertEquals(shouldSendNow(new Date("2026-11-18T07:00:00Z")), true);
  assertEquals(shouldSendNow(new Date("2026-11-18T06:00:00Z")), false);
});

Deno.test("sends at 9:00 Athens in summer (06:00 UTC)", () => {
  assertEquals(shouldSendNow(new Date("2026-07-10T06:00:00Z")), true);
  assertEquals(shouldSendNow(new Date("2026-07-10T07:00:00Z")), false);
});

Deno.test("manual run always sends", () => {
  assertEquals(shouldSendNow(new Date("2026-11-18T15:00:00Z"), true), true);
});

Deno.test("yesterday is the previous Athens day", () => {
  // 23:30 UTC on the 17th is already the 18th in Athens.
  assertEquals(briefingDates(new Date("2026-11-17T23:30:00Z")).yesterday, "2026-11-17");
  assertEquals(briefingDates(new Date("2026-11-18T07:00:00Z")).yesterday, "2026-11-17");
});

Deno.test("Athens day maps to the right UTC range", () => {
  assertEquals(localDayRangeUtc("2026-11-17"), { start: "2026-11-16T22:00:00.000Z", end: "2026-11-17T22:00:00.000Z" });
  assertEquals(localDayRangeUtc("2026-07-10"), { start: "2026-07-09T21:00:00.000Z", end: "2026-07-10T21:00:00.000Z" });
});
