import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Loader2, Trash2, Volume2, VolumeX, X } from "lucide-react";

type Story = {
  id: string;
  media_path: string;
  media_type: "image" | "video";
  music_title: string | null;
  music_artist: string | null;
  music_preview_url: string | null;
  music_artwork_url: string | null;
  duration_seconds: number | null;
  views_count?: number | null;
};

type Group = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  stories: Story[];
};

const VIEWED_KEY = "cutzio.stories.viewed.v1";

export function markStoryViewed(storyId: string): boolean {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    if (set.has(storyId)) return false;
    set.add(storyId);
    localStorage.setItem(VIEWED_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event("stories:viewed"));
    return true;
  } catch {
    return false;
  }
}

export function getViewedStories(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function publicUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { data } = supabase.storage.from("stories").getPublicUrl(path);
  return data.publicUrl;
}

export function StoryViewer({
  groups,
  startUserId,
  onClose,
}: {
  groups: Group[];
  startUserId: string;
  onClose: () => void;
}) {
  const startIdx = Math.max(0, groups.findIndex((g) => g.user_id === startUserId));
  const [gIdx, setGIdx] = useState(startIdx);
  const [sIdx, setSIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [signedSrc, setSignedSrc] = useState<string | null>(null);
  const [triedSigned, setTriedSigned] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const group = groups[gIdx];
  const story = group?.stories[sIdx];
  const duration = (story?.duration_seconds ?? 5) * 1000;

  // Track and display view count
  useEffect(() => {
    if (!story) return;
    const initial = story.views_count ?? 0;
    setViewCount(initial);
    const newly = markStoryViewed(story.id);
    if (newly) {
      supabase.rpc("increment_story_views", { _story_id: story.id }).then(({ data, error }) => {
        const res = data as { views_count?: number } | null;
        if (!error && res?.views_count != null) {
          setViewCount(res.views_count);
        } else {
          setViewCount((c) => c + 1);
        }
      });
    }
  }, [story?.id]);

  // Advance only after media loaded
  useEffect(() => {
    if (!story || !loaded) return;
    const t = setTimeout(() => next(), duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gIdx, sIdx, loaded]);

  // Preload next story image for snappy transitions
  useEffect(() => {
    const nextStory =
      group?.stories[sIdx + 1] ||
      groups[gIdx + 1]?.stories[0];
    if (nextStory && nextStory.media_type === "image") {
      const img = new Image();
      img.src = publicUrl(nextStory.media_path);
    }
  }, [gIdx, sIdx, group, groups]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (story?.music_preview_url && !muted) {
      const a = new Audio(story.music_preview_url);
      a.loop = true;
      audioRef.current = a;
      a.play().catch(() => {});
    }
    return () => {
      audioRef.current?.pause();
    };
  }, [story?.id, muted]);

  const next = () => {
    if (!group) return;
    if (sIdx < group.stories.length - 1) setSIdx(sIdx + 1);
    else if (gIdx < groups.length - 1) {
      setGIdx(gIdx + 1);
      setSIdx(0);
    } else onClose();
  };
  const prev = () => {
    if (sIdx > 0) setSIdx(sIdx - 1);
    else if (gIdx > 0) {
      setGIdx(gIdx - 1);
      setSIdx(0);
    }
  };

  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!story || !user || !confirm("Delete this story?")) return;
    setBusy(true);
    try {
      const { error: dbError } = await supabase.from("stories").delete().eq("id", story.id);
      if (dbError) throw dbError;
      if (story.media_path) {
        await supabase.storage.from("stories").remove([story.media_path]);
      }
      await qc.invalidateQueries({ queryKey: ["stories-active"] });
      toast({ title: "Story deleted" });
      onClose();
    } catch (e: any) {
      toast({ title: "Could not delete story", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleMediaError = async () => {
    if (!triedSigned && story?.media_path) {
      const { data } = await supabase.storage.from("stories").createSignedUrl(story.media_path, 60 * 60);
      if (data?.signedUrl) {
        setSignedSrc(data.signedUrl);
        setTriedSigned(true);
        return;
      }
    }
    next();
  };

  useEffect(() => {
    setSignedSrc(null);
    setTriedSigned(false);
    setLoaded(false);
  }, [story?.id]);

  useEffect(() => {
    document.body.classList.add("stories-open");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("stories-open");
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!story) return null;
  const mediaSrc = signedSrc ?? publicUrl(story.media_path);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black"
      style={{ height: "100dvh" }}
    >
      <div className="relative w-full h-full overflow-hidden bg-black">
        {/* Progress */}
        <div
          className="absolute left-2 right-2 flex gap-1 z-30"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
        >
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
              <motion.div
                key={`${gIdx}-${sIdx}-${i}-${loaded ? 1 : 0}`}
                className="h-full bg-white"
                initial={{ width: i < sIdx ? "100%" : "0%" }}
                animate={{
                  width:
                    i < sIdx
                      ? "100%"
                      : i === sIdx
                        ? loaded
                          ? "100%"
                          : "0%"
                        : "0%",
                }}
                transition={{ duration: i === sIdx && loaded ? duration / 1000 : 0, ease: "linear" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div
          className="absolute left-3 right-3 flex items-center gap-2 z-30"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
        >
          {group.avatar_url ? (
            <img src={group.avatar_url} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20" />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-white text-sm font-semibold truncate drop-shadow block">{group.name}</span>
            <span className="text-white/60 text-[11px]">{viewCount} view{viewCount !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className="p-1.5 rounded-full bg-white/10 text-white backdrop-blur"
            aria-label="mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {user?.id === group?.user_id && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="p-1.5 rounded-full bg-white/10 text-white backdrop-blur disabled:opacity-50"
              aria-label="Delete story"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 text-white backdrop-blur"
            aria-label="close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media */}
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {story.media_type === "video" ? (
              <video
                ref={videoRef}
                src={mediaSrc}
                className="w-full h-full object-contain"
                autoPlay
                muted={muted}
                playsInline
                onLoadedData={() => setLoaded(true)}
                onError={handleMediaError}
              />
            ) : (
              <img
                src={mediaSrc}
                className="w-full h-full object-contain"
                alt=""
                onLoad={() => setLoaded(true)}
                onError={handleMediaError}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Loading overlay */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Loader2 className="w-7 h-7 animate-spin text-white/80" />
          </div>
        )}

        {/* Music badge */}
        {story.music_title && (
          <div
            className="absolute left-3 right-16 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 backdrop-blur"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
          >
            {story.music_artwork_url && (
              <img src={story.music_artwork_url} className="w-7 h-7 rounded" />
            )}
            <div className="text-xs text-white truncate">
              <span className="font-semibold">{story.music_title}</span>
              <span className="text-white/60"> · {story.music_artist}</span>
            </div>
          </div>
        )}

        {/* Tap zones */}
        <button
          onClick={prev}
          className="absolute inset-y-0 left-0 w-1/3 z-20 flex items-center justify-start pl-2 text-white/0 hover:text-white/70"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={next}
          className="absolute inset-y-0 right-0 w-1/3 z-20 flex items-center justify-end pr-2 text-white/0 hover:text-white/70"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </motion.div>,
    document.body
  );
}
