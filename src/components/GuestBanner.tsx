import { Link } from "react-router-dom";
import { LogIn, Eye } from "lucide-react";

export const GuestBanner = () => {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs sm:text-sm">You're browsing as a guest</span>
        </div>
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition-all hover:bg-white/90 active:scale-95"
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign in
        </Link>
      </div>
    </div>
  );
};
