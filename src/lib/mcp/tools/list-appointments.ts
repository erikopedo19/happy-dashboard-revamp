import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sbForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_appointments",
  title: "List appointments",
  description:
    "List the signed-in barber's appointments within an optional date range (YYYY-MM-DD).",
  inputSchema: {
    from: z.string().optional().describe("Start date, YYYY-MM-DD"),
    to: z.string().optional().describe("End date inclusive, YYYY-MM-DD"),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sbForUser(ctx)
      .from("appointments")
      .select("id,appointment_date,appointment_time,status,customer:customers(name,phone),service:services(name,price)")
      .eq("user_id", ctx.getUserId())
      .order("appointment_date")
      .order("appointment_time")
      .limit(limit);
    if (from) q = q.gte("appointment_date", from);
    if (to) q = q.lte("appointment_date", to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { appointments: data ?? [] },
    };
  },
});
