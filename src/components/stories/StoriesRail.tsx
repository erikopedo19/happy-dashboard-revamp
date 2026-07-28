import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StoryUploader } from "./StoryUploader";
import { StoryViewer, getViewedStories } from "./StoryViewer";


type Group = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  booking_link: string | null;
  latest: string;
  stories: any[];
};

export function StoriesRail() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(() => getViewedStories());
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    const onChange = () => setViewed(getViewedStories());
    window.addEventListener("stories:viewed", onChange);
    return () => window.removeEventListener("stories:viewed", onChange);
  }, []);

  useEffect(() => {
    if (openUser) {
      window.dispatchEvent(new CustomEvent("stories:open"));
      return () => {
        window.dispatchEvent(new CustomEvent("stories:close"));
      };
    }
  }, [openUser]);

  const { data: groups = [] } = useQuery({
    queryKey: ["stories-active"],
    queryFn: async (): Promise<Group[]> => {
      const { data } = await supabase.rpc("list_active_stories");
      return (data as Group[]) || [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (groups.length === 0) return;
    const seen = localStorage.getItem("cutzio.stories.explainer.v1");
    if (!seen) setShowExplainer(true);
  }, [groups]);

  const dismissExplainer = () => {
    localStorage.setItem("cutzio.stories.explainer.v1", "1");
    setShowExplainer(false);
  };


  const isBarber = !!user;

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 dark:text-white/60">Stories</span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-[1px] rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-[0_1px_6px_rgba(244,63,94,0.5)]">
            Beta
          </span>
        </div>
        <div className="flex items-start gap-4 py-2">
          {isBarber && (
            <StoryUploader onDone={() => qc.invalidateQueries({ queryKey: ["stories-active"] })} />
          )}
          {groups.map((g) => {
            const allViewed = g.stories?.every((s: any) => viewed.has(s.id));
            return (
              <button
                key={g.user_id}
                onClick={() => setOpenUser(g.user_id)}
                className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition-transform"
              >
                <div
                  className={
                    allViewed
                      ? "p-[2px] rounded-full bg-white/15"
                      : "p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 via-fuchsia-500 to-amber-400"
                  }
                >
                  <div className="bg-black p-[2px] rounded-full">
                    {g.avatar_url ? (
                      <img
                        src={g.avatar_url}
                        alt={g.name}
                        className={`w-[60px] h-[60px] rounded-full object-cover ${allViewed ? "opacity-80" : ""}`}
                      />
                    ) : (
                      <div className="w-[60px] h-[60px] rounded-full bg-white/10 flex items-center justify-center text-white/60 text-lg font-semibold">
                        {g.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-white/70 max-w-[68px] truncate">{g.name}</span>
                <span className="text-[10px] text-white/50">
                  {g.latest
                    ? (() => {
                        const expiresAt = new Date(Date.parse(g.latest) + 24 * 60 * 60 * 1000);
                        return `${formatDistanceToNow(expiresAt)} left`;
                      })()
                    : ""}
                </span>
              </button>
            );
          })}
          {groups.length === 0 && !isBarber && (
            <div className="text-xs text-white/40 py-4">No stories yet — check back soon.</div>
          )}
        </div>
      </div>

      {showExplainer && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
          <div className="rounded-[22px] bg-[#1C1C1E] border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.35)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Stories</p>
                <p className="text-[12px] text-white/60 mt-1 leading-relaxed">
                  Tap any avatar to watch 24h clips. Swipe up to close, or minimize to keep browsing while it plays.
                </p>
              </div>
              <button
                onClick={dismissExplainer}
                className="p-1 rounded-full text-white/40 hover:text-white/80 transition"
                aria-label="close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={dismissExplainer}
              className="mt-3 w-full h-10 rounded-[14px] bg-rose-500 text-white text-sm font-semibold active:scale-[0.98] transition"
            >
              I understand
            </button>
          </div>
        </div>
      )}

      {openUser && (
        <StoryViewer
          groups={groups}
          startUserId={openUser}
          minimized={minimized}
          onToggle={() => setMinimized((m) => !m)}
          onClose={() => { setOpenUser(null); setMinimized(false); }}
        />
      )}
    </>
  );
}
