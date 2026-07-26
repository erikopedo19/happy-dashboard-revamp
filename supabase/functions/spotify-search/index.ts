/* eslint-disable */
declare const Deno: { env: { get(key: string): string | undefined } };
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedToken: { value: string; expires: number } | null = null;

async function getToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 30000) return cachedToken.value;
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Spotify credentials not configured");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${id}:${secret}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

function mapTrack(t: any) {
  return {
    id: t.id,
    title: t.name,
    artist: (t.artists || []).map((a: any) => a.name).join(", "),
    preview_url: t.preview_url,
    artwork_url: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null,
    duration_ms: t.duration_ms,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let q = url.searchParams.get("q")?.trim() ?? "";
    if (req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        if (body?.q) q = String(body.q).trim();
      } catch { /* keep URL param */ }
    }
    const token = await getToken();

    // Spotify deprecated Client-Credentials access to editorial playlists,
    // so trending is served via a search query that returns fresh popular tracks.
    const query = q.length > 0 ? q : "top hits 2026";
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=40&market=US&q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Spotify search failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const all = (data.tracks?.items || []).map(mapTrack);
    // Prefer tracks with a preview, but fall back to any track so the list is never empty.
    const withPreview = all.filter((t: any) => t.preview_url);
    let tracks = withPreview.length >= 6 ? withPreview : all;
    // Order by popularity-ish (Spotify already sorts by relevance).
    tracks = tracks.slice(0, 30);

    return new Response(JSON.stringify({ tracks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("spotify-search error", e);
    return new Response(JSON.stringify({ tracks: [], error: e?.message ?? "error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // keep 200 so client shows "no music available" gracefully
    });
  }
});
