import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canSendInvitation } from "./logic.ts";

const now = Date.parse("2026-10-13T09:16:00Z");
const invite = { org_id: "owner", status: "pending", expires_at: "2026-10-20T09:16:00Z", role: "member" };
Deno.test("only the invitation owner can send its email", () => {
  assertEquals(canSendInvitation(invite, "owner", now), true);
  assertEquals(canSendInvitation(invite, "other", now), false);
});
Deno.test("expired or accepted invitations cannot send email", () => {
  assertEquals(canSendInvitation({ ...invite, expires_at: "2026-10-12T09:16:00Z" }, "owner", now), false);
  assertEquals(canSendInvitation({ ...invite, status: "accepted" }, "owner", now), false);
});