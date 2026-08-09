import { ReactNode, useLayoutEffect, useRef } from "react";
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
 * Admin <-> client views get a sideways slide + scale; everything else gets a
 * quick fade/slide so there is no loading feel.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const container = useRef<HTMLDivElement>(null);
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
    const adminToClient = fromType === "admin" && type === "client";
    const clientToAdmin = fromType === "client" && type === "admin";

    const fromX = adminToClient ? 80 : clientToAdmin ? -80 : 0;
    const fromY = fromX === 0 ? 12 : 0;
    const fromScale = adminToClient || clientToAdmin ? 0.96 : 1;

    const el = container.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, x: fromX, y: fromY, scale: fromScale },
      { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.32, ease: "power2.out" }
    );

    prevType.current = type;
  }, [pathname]);

  return <div ref={container}>{children}</div>;
};

export default PageTransition;
