import { cn } from "@/lib/utils";

/**
 * The shop's public link as a banner: dark, grid behind, glow rising from the bottom edge.
 * `generateShareBanner` draws the same thing to a PNG for sharing.
 */
export function ShareBanner({
  displayUrl,
  shopName,
  className,
}: {
  displayUrl: string;
  shopName?: string | null;
  className?: string;
}) {
  const slash = displayUrl.indexOf("/");
  const host = slash < 0 ? displayUrl : displayUrl.slice(0, slash);
  const path = slash < 0 ? "" : displayUrl.slice(slash);
  const z = host.search(/z/i);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0A0A0C]",
        "flex min-h-[168px] flex-col items-center justify-center px-5 py-9 text-center sm:min-h-[220px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          backgroundPosition: "center bottom",
          maskImage: "radial-gradient(ellipse 75% 100% at 50% 100%, #000 10%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 100% at 50% 100%, #000 10%, transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 62% at 50% 108%, rgba(255,45,70,0.6) 0%, rgba(224,21,47,0.2) 46%, transparent 74%)",
        }}
      />
      {shopName && <p className="mb-2 max-w-full truncate text-[12px] font-medium text-white/50">{shopName}</p>}
      <p className="font-cal max-w-full break-all text-[clamp(20px,6.2vw,40px)] leading-[1.1] text-white">
        {displayUrl ? (
          <>
            <span className="text-white/60">
              {z < 0 ? host : (
                <>
                  {host.slice(0, z)}
                  <span className="text-[#FF2D46]">{host[z]}</span>
                  {host.slice(z + 1)}
                </>
              )}
            </span>
            {path}
          </>
        ) : (
          <span className="text-white/30">Set a name below</span>
        )}
      </p>
      <p className="mt-3 text-[12px] font-medium text-white/70">Book online, any time</p>
    </div>
  );
}
