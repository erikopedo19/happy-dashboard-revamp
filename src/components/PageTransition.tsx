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
  const veilTl = useRef<gsap.core.Timeline | null>(null);

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
      const logo = v?.firstElementChild ?? null;
      // The veil runs to completion even if the route changes again mid-way
      // (redirects, quick taps), so the switch never cuts off abruptly.
      if (v && logo && !veilTl.current?.isActive()) {
        // Mode switch (either direction): a red curtain wipes up from the bottom,
        // the Cutzioo logo settles, then the curtain lifts off the top.
        v.style.background = "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 50%,#C70F28 100%)";
        veilTl.current = gsap
          .timeline()
          .set(v, { display: "grid", opacity: 1, clipPath: "inset(100% 0% 0% 0% round 0px)" })
          .to(v, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 0.55, ease: "power3.inOut" }, 0)
          .fromTo(logo, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, 0.3)
          .to(logo, { y: -40, opacity: 0, duration: 0.5, ease: "power2.in" }, 1.1)
          .to(v, { clipPath: "inset(0% 0% 100% 0% round 0px 0px 40px 40px)", duration: 0.8, ease: "power3.inOut" }, 1.2)
          .set(v, { display: "none", clearProps: "clipPath,opacity" })
          .set(logo, { clearProps: "transform,opacity" });
      }
      const tween = gsap.fromTo(el, { opacity: 0, scale: 0.96, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 1.25, clearProps: clear });
      return () => {
        tween.kill();
        gsap.set(el, { clearProps: clear });
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
            <div className="flex flex-col items-center gap-3">
              <div className="cz-curtain-logo grid h-[92px] w-[92px] place-items-center rounded-[26px] bg-white shadow-[0_18px_40px_-12px_rgba(120,0,20,0.55)]">
                <CutziooLoader variant="loop" size="62px" wordmark={false} />
              </div>
              <span className="text-[22px] font-extrabold tracking-[-0.02em] text-white">Cutzioo</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PageTransition;
