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
    const q = url.searchParams.get("q")?.trim();
    const token = await getToken();

    let tracks: any[] = [];
    if (q) {
      const res = await fetch(
        `https://api.spotify.com/v1/search?type=track&limit=25&q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      tracks = (data.tracks?.items || []).map(mapTrack).filter((t: any) => t.preview_url);
    } else {
      // Trending — Spotify's editorial "Today's Top Hits" playlist
      const res = await fetch(
        "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks?limit=30",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      tracks = (data.items || [])
        .map((it: any) => it.track)
        .filter(Boolean)
        .map(mapTrack)
        .filter((t: any) => t.preview_url);
    }

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
