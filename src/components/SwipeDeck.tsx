import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { X, Heart, Star, Calendar, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

export interface SwipeBarber {
  id: string;
  brandName: string;
  avatar_url: string | null;
  banner_url: string | null;
  rating: number | null;
  description: string | null;
  booking_link: string | null;
}

const spring = { type: "spring" as const, stiffness: 320, damping: 30 };

function Card({ barber, onSwipe, isTop, depth }: { barber: SwipeBarber; onSwipe: (dir: 1 | -1) => void; isTop: boolean; depth: number }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0]);
  const img = barber.avatar_url || barber.banner_url;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110 || info.velocity.x > 600) onSwipe(1);
    else if (info.offset.x < -110 || info.velocity.x < -600) onSwipe(-1);
  };

  return (
    <motion.div
      className="absolute inset-0 rounded-[32px] overflow-hidden shadow-2xl bg-neutral-900 touch-none select-none"
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * -14, opacity: depth > 2 ? 0 : 1 }}
      variants={{ out: (dir: number) => ({ x: dir * 480, rotate: dir * 22, opacity: 0, transition: { duration: 0.35 } }) }}
      exit="out"
      transition={spring}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
    >
      {img ? (
        <img src={img} alt={barber.brandName} className="h-full w-full object-cover pointer-events-none" draggable={false} />
      ) : (
        <div className="h-full w-full grid place-items-center bg-gradient-to-br from-[#FF375F] to-[#FF9F0A] text-white text-7xl font-bold">
          {barber.brandName.charAt(0)}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />
      {isTop && (
        <>
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 -rotate-12 rounded-xl border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400">LIKE</motion.div>
          <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 rotate-12 rounded-xl border-4 border-[#FF375F] px-3 py-1 text-2xl font-black text-[#FF375F]">NOPE</motion.div>
        </>
      )}
      <div className="absolute bottom-0 inset-x-0 p-6 text-white">
        <motion.h3 key={barber.id} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.1, duration: 0.45 }} className="text-[28px] font-bold leading-tight">
          {barber.brandName}
        </motion.h3>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 0.75, y: 0 }} transition={{ delay: 0.2, duration: 0.45 }} className="mt-1 text-sm line-clamp-2">
          {barber.description || "Barber"}
        </motion.p>
        {barber.rating ? (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-sm font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" /> {Number(barber.rating).toFixed(1)}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

export function SwipeDeck({ barbers, onClose, onLike }: { barbers: SwipeBarber[]; onClose: () => void; onLike: (id: string) => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const visible = barbers.slice(index, index + 3);
  const current = barbers[index];

  const swipe = (d: 1 | -1) => {
    if (!current) return;
    haptic(d === 1 ? "success" : "light");
    setDir(d);
    if (d === 1) onLike(current.id);
    setIndex((i) => i + 1);
  };

  return (
    <motion.div
      className="fixed inset-x-0 top-0 bottom-[88px] z-40 flex flex-col bg-[#0A0A0C] text-white px-5 pt-[max(env(safe-area-inset-top),1rem)]"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={spring}
    >
      <div className="flex items-center justify-between py-3">
        <div>
          <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 0.6, x: 0 }} className="text-xs uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> New
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 10, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.5 }} className="text-[26px] font-bold">
            Swipe your barber
          </motion.h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="h-10 w-10 grid place-items-center rounded-full bg-white/10 active:scale-90 transition">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 my-3">
        <AnimatePresence custom={dir}>
          {visible.map((b, i) => (
            <Card key={b.id} barber={b} isTop={i === 0} depth={i} onSwipe={swipe} />
          )).reverse()}
        </AnimatePresence>
        {!current && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xl font-semibold">You've seen everyone</p>
              <button onClick={() => setIndex(0)} className="mt-4 rounded-full bg-white text-black px-6 py-3 font-semibold active:scale-95 transition">Start again</button>
            </div>
          </motion.div>
        )}
      </div>

      {current && (
        <div className="flex items-center justify-center gap-5 pb-4">
          <button onClick={() => swipe(-1)} aria-label="Skip" className="h-14 w-14 grid place-items-center rounded-full bg-white/10 active:scale-90 transition">
            <X className="h-6 w-6 text-[#FF375F]" />
          </button>
          <button
            disabled={!current.booking_link}
            onClick={() => current.booking_link && navigate(`/book/${current.booking_link}`)}
            className="h-14 px-7 rounded-full bg-white text-black font-semibold flex items-center gap-2 active:scale-95 transition disabled:opacity-40"
          >
            <Calendar className="h-4 w-4" /> Book now
          </button>
          <button onClick={() => swipe(1)} aria-label="Like" className="h-14 w-14 grid place-items-center rounded-full bg-[#FF375F] active:scale-90 transition">
            <Heart className="h-6 w-6 fill-current" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
