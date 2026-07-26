import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      const search = q.trim() || "trending";
      let list: SpotifyTrack[] = [];
      try {
        const { data } = await supabase.functions.invoke("spotify-search", {
          body: { q: search },
        });
        list = (data as any)?.tracks || [];
      } catch {
        list = [];
      }
      if (list.length === 0 && SUPABASE_URL) {
        try {
          const url = new URL(`${SUPABASE_URL}/functions/v1/spotify-search`);
          url.searchParams.set("q", search);
          const res = await fetch(url.toString(), {
            signal: ctrl.signal,
            headers: {
              apikey: SUPABASE_KEY || "",
              Authorization: `Bearer ${SUPABASE_KEY || ""}`,
            },
          });
          const json = await res.json().catch(() => ({}));
          list = json.tracks || [];
        } catch {
          list = [];
        }
      }
      setTracks(list);
      setLoading(false);
    }, q ? 300 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

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
    <AnimatePresence>
      {open &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-[#141418] text-white rounded-3xl overflow-hidden border border-white/10 h-auto max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold">Add music</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-white/10 shrink-0">
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
        <div className="overflow-y-auto flex-1 min-h-0 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center text-white/50 text-sm py-12 px-6">
              No tracks found. Try another search.
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {tracks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 active:bg-white/[0.06]">
                  {t.artwork_url ? (
                    <img src={t.artwork_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/10" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-white/50 truncate">{t.artist}</div>
                  </div>
                  {t.preview_url && (
                    <button
                      onClick={() => togglePlay(t)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0"
                      aria-label="Preview"
                    >
                      {playingId === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      audioRef.current?.pause();
                      setPlayingId(null);
                      onPick(t);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs h-8 shrink-0"
                  >
                    Use
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )}
</AnimatePresence>
  );
}
