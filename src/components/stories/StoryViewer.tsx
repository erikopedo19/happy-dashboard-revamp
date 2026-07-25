import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react";

type Story = {
  id: string;
  media_path: string;
  media_type: "image" | "video";
  music_title: string | null;
  music_artist: string | null;
  music_preview_url: string | null;
  music_artwork_url: string | null;
  duration_seconds: number | null;
};

type Group = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  stories: Story[];
};

function publicUrl(path: string) {
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const group = groups[gIdx];
  const story = group?.stories[sIdx];
  const duration = (story?.duration_seconds ?? 5) * 1000;

  useEffect(() => {
    if (!story) return;
    const start = Date.now();
    const t = setTimeout(() => next(), duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gIdx, sIdx]);

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
  const src = useMemo(() => publicUrl(story.media_path), [story.media_path]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full h-full overflow-hidden bg-black"
      >
        {/* Progress */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
              <motion.div
                key={`${gIdx}-${sIdx}-${i}`}
                className="h-full bg-white"
                initial={{ width: i < sIdx ? "100%" : "0%" }}
                animate={{ width: i < sIdx ? "100%" : i === sIdx ? "100%" : "0%" }}
                transition={{ duration: i === sIdx ? duration / 1000 : 0, ease: "linear" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-3 right-3 flex items-center gap-2 z-20 mt-2">
          {group.avatar_url ? (
            <img src={group.avatar_url} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20" />
          )}
          <span className="text-white text-sm font-semibold flex-1 truncate">{group.name}</span>
          <button
            onClick={() => setMuted((m) => !m)}
            className="p-1.5 rounded-full bg-white/10 text-white"
            aria-label="mute"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 text-white" aria-label="close">
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
          >
            {story.media_type === "video" ? (
              <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-cover"
                autoPlay
                muted={muted}
                playsInline
              />
            ) : (
              <img src={src} className="w-full h-full object-cover" alt="" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Music badge */}
        {story.music_title && (
          <div className="absolute bottom-6 left-3 right-16 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 backdrop-blur">
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
          className="absolute inset-y-0 left-0 w-1/3 z-10 flex items-center justify-start pl-2 text-white/0 hover:text-white/70"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={next}
          className="absolute inset-y-0 right-0 w-1/3 z-10 flex items-center justify-end pr-2 text-white/0 hover:text-white/70"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </motion.div>
    </motion.div>
  );
}
