import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";

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

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.button
            key="trigger"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center ring-2 ring-white/10">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] text-white/70">Your story</span>
          </motion.button>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-4"
            style={{ height: "100dvh" }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="w-full sm:max-w-sm bg-[#141418] rounded-3xl overflow-hidden border border-white/10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90dvh]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <h3 className="text-sm font-semibold text-white">New story</h3>
                <button onClick={reset} className="p-1 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden min-h-0 bg-black">
                <div className="w-full h-full flex items-center justify-center bg-black">
                  {file.type.startsWith("video") ? (
                    <video src={preview!} className="w-full h-full object-contain" controls playsInline />
                  ) : (
                    <img src={preview!} alt="preview" className="w-full h-full object-contain" />
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3 shrink-0 bg-[#141418] border-t border-white/10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={reset}
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={publish}
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish story"}
                  </Button>
                </div>
                <p className="text-center text-[11px] text-white/40">Max 20 MB · Auto-deletes in 24 hours</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
