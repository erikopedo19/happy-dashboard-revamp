import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Film, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";

const MAX_SIZE = 20 * 1024 * 1024;

export function StoryUploader({ onDone }: { onDone?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (file) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("stories:open"));
      return () => {
        document.body.style.overflow = prev;
        window.dispatchEvent(new CustomEvent("stories:close"));
      };
    }
  }, [file]);

  useEffect(() => {
    if (!preview) return;
    return () => { URL.revokeObjectURL(preview); };
  }, [preview]);

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
        music_track_id: null,
        music_title: null,
        music_artist: null,
        music_preview_url: null,
        music_artwork_url: null,
        duration_seconds: mediaType === "video" ? 10 : 5,
      });
      if (error) throw error;
      toast({ title: "Story posted", description: "It will stay live for 24 hours." });
      reset();
      onDone?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const Editor = file ? (
    <motion.div
      key="editor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex items-end sm:items-center justify-center"
      style={{ height: "100dvh", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-sm bg-[#0E0E11] rounded-t-[32px] sm:rounded-[32px] overflow-hidden border border-white/10 flex flex-col h-[94dvh] sm:h-auto sm:max-h-[88dvh]"
      >
        {/* Grab handle + header */}
        <div className="shrink-0 pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <h3 className="text-[17px] font-semibold text-white leading-tight">New story</h3>
            <p className="text-[12px] text-white/40">Live for 24 hours</p>
          </div>
          <button
            onClick={reset}
            className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center active:scale-95 transition"
          >
            <X className="w-4.5 h-4.5 text-white/80" />
          </button>
        </div>

        {/* Media preview card */}
        <div className="flex-1 min-h-0 px-4 pb-3">
          <div className="relative h-full w-full rounded-[24px] overflow-hidden bg-black ring-1 ring-white/10">
            {file.type.startsWith("video") ? (
              <video src={preview!} className="absolute inset-0 w-full h-full object-contain" controls playsInline />
            ) : (
              <img src={preview!} alt="Story preview" className="absolute inset-0 w-full h-full object-contain" />
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-3 py-1.5">
              {file.type.startsWith("video") ? (
                <Film className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-white/80" />
              )}
              <span className="text-[11px] font-medium text-white/80 tabular-nums">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-3 right-3 rounded-full bg-white/90 text-black text-[12px] font-semibold px-3.5 py-2 active:scale-95 transition"
            >
              Replace
            </button>
          </div>
        </div>

        {/* Actions */}
        <div
          className="px-4 pt-1 pb-4 space-y-2.5 shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
          <Button
            onClick={publish}
            disabled={busy}
            className="w-full h-[52px] rounded-2xl bg-white text-black hover:bg-white/90 text-[16px] font-semibold"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share story"}
          </Button>
          <Button
            onClick={reset}
            disabled={busy}
            variant="ghost"
            className="w-full h-11 rounded-2xl text-white/60 hover:text-white hover:bg-white/[0.06] text-[15px] font-medium"
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  ) : null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center gap-1 shrink-0"
      >
        <div className="w-16 h-16 rounded-full bg-white/[0.06] border border-dashed border-white/25 flex items-center justify-center">
          <Plus className="w-6 h-6 text-white/70" />
        </div>
        <span className="text-[11px] text-white/60">Your story</span>
      </motion.button>
      {file && createPortal(Editor, document.body)}
    </>
  );
}

