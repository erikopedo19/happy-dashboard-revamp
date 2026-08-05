import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { Heart, Loader2, Scissors, Star, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { Button } from "@heroui/react";

const Favorites = () => {
  const { user, loading } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("favoriteBarbers") || "[]"));
    } catch {}
  }, []);

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ["public-barbers"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_public_profiles");
      if (error) throw error;
      return data || [];
    },
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c]">
      <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace state={{ from: "/favorites" }} />;

  const items = barbers.filter((b: any) => favorites.includes(b.id));

  const remove = (id: string) => {
    const next = favorites.filter((x) => x !== id);
    setFavorites(next);
    localStorage.setItem("favoriteBarbers", JSON.stringify(next));
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0c0c0c] pb-28">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-4">
          <h1 className="text-[28px] leading-tight font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">Favorites</h1>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Your saved barbers</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          <div className="h-24 rounded-3xl bg-white/60 dark:bg-[#1C1C1E]/60 animate-pulse" />
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-[#FF2D55]" />
            </div>
            <p className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">No favorites yet</p>
            <p className="text-[13px] text-[#8E8E93] mt-1 mb-5">Tap the heart on a barber to save them</p>
            <Link to="/find-barber">
              <Button className="bg-[#007AFF] hover:bg-[#0066D6] rounded-2xl h-11 px-6">Explore</Button>
            </Link>
          </div>
        ) : (
          items.map((b: any, i: number) => {
            const accent = b.brand_color || "#007AFF";
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 30 }}
                className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 flex items-center gap-3"
              >
                {b.avatar_url ? (
                  <img src={b.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                  >
                    <Scissors className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                    {b.business_name || b.full_name || "Barber"}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-[#FFB800] text-[#FFB800]" />
                    <span className="text-[12px] text-[#1C1C1E] dark:text-[#F2F2F7]">
                      {Number(b.rating ?? 5).toFixed(1)}
                    </span>
                    <span className="text-[12px] text-[#8E8E93]">({b.rating_count ?? 0})</span>
                  </div>
                </div>
                <button
                  onClick={() => remove(b.id)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition"
                >
                  <Heart className="w-5 h-5 fill-[#FF2D55] text-[#FF2D55]" />
                </button>
                {b.booking_link && (
                  <Link to={`/book/${b.booking_link}`}>
                    <Button size="icon" className="rounded-2xl h-10 w-10" style={{ background: accent }}>
                      <Calendar className="w-4 h-4 text-white" />
                    </Button>
                  </Link>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <ClientMobileDock />
    </div>
  );
};

export default Favorites;
