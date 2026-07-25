import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Music, Plus, X } from "lucide-react";
import { SpotifyMusicPicker, type SpotifyTrack } from "./SpotifyMusicPicker";

const MAX_SIZE = 20 * 1024 * 1024;

export function StoryUploader({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Max 20 MB.", variant: "destructive" });
      return;
    }
    if (!/^image\/|^video\//.test(f.type)) {
      toast({ title: "Unsupported file", description: "Use an image or video.", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setTrack(null);
  };

  const publish = async () => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || (file.type.includes("video") ? "mp4" : "jpg");
      const path = `${user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("stories").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) throw up.error;
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_path: path,
        media_type: mediaType,
        music_track_id: track?.id ?? null,
        music_title: track?.title ?? null,
        music_artist: track?.artist ?? null,
        music_preview_url: track?.preview_url ?? null,
        music_artwork_url: track?.artwork_url ?? null,
        duration_seconds: mediaType === "video" ? 10 : 5,
      });
      if (error) throw error;
      toast({ title: "Story posted", description: "It will stay live for 10 days." });
      reset();
      onDone?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!file) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center ring-2 ring-white/10">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] text-white/70">Your story</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full max-w-sm max-h-[90vh] bg-[#15151a] rounded-3xl overflow-hidden border border-white/10 flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <h3 className="text-sm font-semibold text-white">New story</h3>
            <button onClick={reset} className="p-1 rounded-full hover:bg-white/10">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
              {file.type.startsWith("video") ? (
                <video src={preview!} className="w-full max-h-[60vh] object-contain" controls playsInline />
              ) : (
                <img src={preview!} alt="preview" className="w-full max-h-[60vh] object-contain" />
              )}
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => setPicking(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-left"
              >
                {track?.artwork_url ? (
                  <img src={track.artwork_url} className="w-9 h-9 rounded-md" />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center">
                    <Music className="w-4 h-4 text-white/70" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {track ? track.title : "Add music"}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {track ? track.artist : "Preview 30s trending clips"}
                  </div>
                </div>
              </button>
              <Button
                onClick={publish}
                disabled={busy}
                className="w-full h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish story"}
              </Button>
              <p className="text-center text-[11px] text-white/40">Max 20 MB · Auto-deletes in 10 days</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <SpotifyMusicPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(t) => {
          setTrack(t);
          setPicking(false);
        }}
      />
    </>
  );
}
