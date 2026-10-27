import { ReactNode, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { CutziooLoader } from "./CutziooLoader";

const CLIENT_PREFIXES = [
  "/find-barber",
  "/find-barbershop",
  "/my-bookings",
  "/favorites",
  "/me",
];

const ADMIN_PREFIXES = [
  "/admin",
  "/agenda",
  "/customers",
  "/services",
  "/settings",
  "/reports",
  "/stylists",
  "/teams",
  "/products",
  "/booking-forms",
  "/brand",
  "/booking-page",
  "/microsite",
  "/pricing",
];

type RouteKind = "client" | "admin" | "other";

function routeType(path: string): RouteKind {
  if (CLIENT_PREFIXES.some((p) => path.startsWith(p))) return "client";
  if (ADMIN_PREFIXES.some((p) => path.startsWith(p))) return "admin";
  return "other";
}

/**
 * Fast GSAP page transition.
 * Switching between client and barber mode shows the loader, which then fades
 * up and away over 1.5s while the new page rises in; everything else gets a quick fade/slide so there is no loading feel.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const container = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const prevType = useRef<RouteKind | null>(null);
  const didMount = useRef(false);

  useLayoutEffect(() => {
    const type = routeType(pathname);

    if (!didMount.current) {
      didMount.current = true;
      prevType.current = type;
      return;
    }

    const fromType = prevType.current ?? "other";
    prevType.current = type;
    const modeSwitch =
      (fromType === "admin" && type === "client") || (fromType === "client" && type === "admin");
    const sameKind = fromType === type;

    const el = container.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(el, { clearProps: "transform,opacity,filter" });
      return;
    }

    // A leftover transform turns this wrapper into the containing block for
    // every `position: fixed` page (full-screen map, sheets), collapsing them.
    const clear = "transform,opacity,filter";

    if (modeSwitch) {
      const v = veil.current;
      const tl = gsap.timeline();
      if (v) {
        const tint = type === "client" ? "255,45,70" : "168,85,247";
        v.style.background = `radial-gradient(120% 70% at 50% 100%, rgba(${tint},0.28) 0%, rgba(${tint},0) 60%), radial-gradient(circle at 50% 40%, hsl(var(--muted) / 0.5), transparent 55%), hsl(var(--background))`;
        tl.set(v, { display: "grid", opacity: 1, yPercent: 0 })
          .fromTo(v.firstElementChild, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, 0)
          .to(v, { yPercent: -100, opacity: 0, duration: 1.5, ease: "power3.inOut" }, 0.9)
          .set(v, { display: "none", clearProps: "transform,opacity" });
      }
      gsap.set(el, { opacity: 0, y: 48 });
      tl.to(el, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", clearProps: clear }, 1.0);
      return () => {
        tl.kill();
        gsap.set(el, { clearProps: clear });
        if (v) gsap.set(v, { display: "none", clearProps: "transform,opacity" });
      };
    }

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: sameKind ? 0.22 : 0.32,
        ease: "power2.out",
        clearProps: clear,
      }
    );
    return () => {
      tween.kill();
      gsap.set(el, { clearProps: clear });
    };
  }, [pathname]);

  return (
    <>
      <div ref={container}>{children}</div>
      {typeof document !== "undefined" &&
        createPortal(
          <div
            ref={veil}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[350] place-items-center"
            style={{ display: "none" }}
          >
            <div>
              <CutziooLoader variant="loop" size="72px" wordmark={false} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PageTransition;
