import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
  const [viewed, setViewed] = useState<Set<string>>(() => getViewedStories());

  useEffect(() => {
    const onChange = () => setViewed(getViewedStories());
    window.addEventListener("stories:viewed", onChange);
    return () => window.removeEventListener("stories:viewed", onChange);
  }, []);

  const { data: groups = [] } = useQuery({
    queryKey: ["stories-active"],
    queryFn: async (): Promise<Group[]> => {
      const { data } = await supabase.rpc("list_active_stories");
      return (data as Group[]) || [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });


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
              </button>
            );
          })}
          {groups.length === 0 && !isBarber && (
            <div className="text-xs text-white/40 py-4">No stories yet — check back soon.</div>
          )}
        </div>
      </div>

      {openUser && (
        <StoryViewer
          groups={groups}
          startUserId={openUser}
          onClose={() => setOpenUser(null)}
        />
      )}
    </>
  );
}
