/* eslint-disable */
declare const Deno: { env: { get(key: string): string | undefined } };
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE);

    const { data: expired } = await supabase
      .from("stories")
      .select("id, media_path")
      .lt("expires_at", new Date().toISOString());

    if (expired && expired.length > 0) {
      const paths = expired.map((s: any) => s.media_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("stories").remove(paths);
      }
      const ids = expired.map((s: any) => s.id);
      await supabase.from("stories").delete().in("id", ids);
    }

    return new Response(JSON.stringify({ removed: expired?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("cleanup-expired-stories error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
