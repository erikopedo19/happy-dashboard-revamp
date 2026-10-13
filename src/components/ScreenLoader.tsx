import { cn } from "@/lib/utils";
import { CutziooLoader } from "@/components/CutziooLoader";

/**
 * Full-screen loading state — the Cutzioo tick loop, consistent with the app
 * splash. Use for early-return "loading" screens.
 */
export function ScreenLoader({ className, size = "72px" }: { className?: string; size?: string }) {
  return (
    <div className={cn("grid min-h-dvh place-items-center bg-[#0A0A0C]", className)}>
      <CutziooLoader variant="loop" size={size} wordmark={false} />
    </div>
  );
}
