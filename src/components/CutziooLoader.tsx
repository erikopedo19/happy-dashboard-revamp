import { cn } from "@/lib/utils";

/**
 * Cutzioo tick loader — a check that draws itself via a masked stroke.
 * "intro" plays the sequence once (app splash) with a rose glow blooming in
 * just before the splash hands off to the content; "loop" redraws the tick
 * on repeat (inline loading states).
 */
export function CutziooLoader({
  variant = "intro",
  size,
  wordmark = true,
  className,
}: {
  variant?: "intro" | "loop";
  /** CSS size of the SVG tile, e.g. "120px". Defaults to ~42vmin / 240px. */
  size?: string;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("cz-loader", variant === "intro" ? "cz-intro" : "cz-loop", className)}
      style={size ? ({ "--cz-size": size } as React.CSSProperties) : undefined}
      role="status"
      aria-label="Loading Cutzioo"
    >
      <div className="cz-glow" aria-hidden="true" />
      <svg viewBox="0 0 512 512" aria-hidden="true">
        <defs>
          <mask id="cz-tick-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <path className="cz-draw" pathLength="1" d="M52 202 L240 390 L458 112" />
          </mask>
        </defs>
        <path
          className="cz-tick"
          mask="url(#cz-tick-mask)"
          d="M105,223 L107,226 L153,253 L157,252 L135,222 L124,221Z M58,210 L68,227 L94,261 L147,259 L149,257 L148,255 L119,239 L100,231 L60,209Z M437,127 L360,127 L234,331 L227,337 L222,337 L217,333 L174,273 L166,266 L158,264 L99,267 L97,268 L96,273 L191,406 L197,409 L263,408 L269,403 L443,144 L443,133Z"
        />
      </svg>
      {wordmark && <p className="cz-wm" style={{ fontSize: "calc(var(--cz-size, min(42vmin, 240px)) * 0.16)" }}>Cutzioo</p>}
    </div>
  );
}
