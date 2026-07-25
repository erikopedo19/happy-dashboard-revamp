import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Music, Pause, Play, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SpotifyTrack = {
  id: string;
  title: string;
  artist: string;
  preview_url: string | null;
  artwork_url: string | null;
};

export function SpotifyMusicPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (t: SpotifyTrack) => void;
}) {
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("spotify-search", {
          body: {},
          method: "GET" as any,
          headers: q ? { "x-q": q } : undefined,
        } as any);
        // fallback: call via fetch to append query string reliably
        const url = new URL(
          `${(supabase as any).functionsUrl || ""}/spotify-search`,
        );
        if (q) url.searchParams.set("q", q);
        const res = await fetch(url.toString(), {
          headers: { apikey: (supabase as any).supabaseKey || "" },
        });
        const json = await res.json();
        setTracks(json.tracks || (data as any)?.tracks || []);
      } catch {
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
  }, [open]);

  if (!open) return null;

  const togglePlay = (t: SpotifyTrack) => {
    if (!t.preview_url) return;
    if (playingId === t.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = t.preview_url;
    audioRef.current.play().catch(() => {});
    setPlayingId(t.id);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-[#1a1a1f] text-white rounded-t-3xl sm:rounded-3xl overflow-hidden border border-white/10 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold">Add music</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a song or artist"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          {!q && (
            <p className="text-[11px] text-white/40 mt-2 uppercase tracking-wider">Trending now</p>
          )}
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-white/5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center text-white/50 text-sm py-12 px-6">
              No previewable tracks. Try another search.
            </div>
          ) : (
            tracks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                {t.artwork_url ? (
                  <img src={t.artwork_url} alt="" className="w-11 h-11 rounded-lg object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{t.title}</div>
                  <div className="text-xs text-white/50 truncate">{t.artist}</div>
                </div>
                <button
                  onClick={() => togglePlay(t)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  aria-label="Preview"
                >
                  {playingId === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <Button
                  size="sm"
                  onClick={() => {
                    audioRef.current?.pause();
                    setPlayingId(null);
                    onPick(t);
                  }}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-xs h-8"
                >
                  Use
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
