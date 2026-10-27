import { ReactNode, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";

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
 * Switching between client and barber mode rises from the bottom behind a soft
 * gradient veil; everything else gets a quick fade/slide so there is no loading feel.
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
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      if (v) {
        const tint = type === "client" ? "255,45,70" : "168,85,247";
        v.style.background = `linear-gradient(180deg, rgba(10,10,12,0) 0%, rgba(${tint},0.32) 30%, rgba(10,10,12,0.92) 55%, rgba(${tint},0.18) 78%, rgba(10,10,12,0) 100%)`;
        tl.fromTo(
          v,
          { yPercent: 100, opacity: 1, display: "block" },
          { yPercent: -110, duration: 1.1, ease: "power3.inOut" },
          0
        )
          .to(v, { opacity: 0, duration: 0.45, ease: "power1.out" }, 0.65)
          .set(v, { display: "none" });
      }
      tl.fromTo(
        el,
        { opacity: 0, y: 64, scale: 0.985, filter: "blur(8px)" },
        { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.9, clearProps: clear },
        0.18
      );
      return () => {
        tl.kill();
        gsap.set(el, { clearProps: clear });
        if (v) gsap.set(v, { display: "none" });
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
            className="pointer-events-none fixed inset-x-0 -top-[20vh] z-[350] h-[140vh]"
            style={{ display: "none" }}
          />,
          document.body
        )}
    </>
  );
};

export default PageTransition;
