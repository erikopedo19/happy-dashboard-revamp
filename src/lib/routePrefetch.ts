/**
 * Prefetch-on-intent for the mobile docks. The dynamic imports share Vite's
 * module cache with the lazy() loaders in App.tsx, so kicking them off on
 * pointer-down means the chunk is usually parsed by the time the tap
 * completes and React Router swaps the page.
 */
const loaders: Record<string, () => Promise<unknown>> = {
  "/find-barber": () => import("@/pages/FindBarber"),
  "/find-barbershop": () => import("@/pages/FindBarbershop"),
  "/my-bookings": () => import("@/pages/MyBookings"),
  "/favorites": () => import("@/pages/Favorites"),
  "/me": () => import("@/pages/Me"),
  "/aggelies": () => import("@/pages/Aggelies"),
  "/b": () => import("@/pages/BarberDetail"),
};

export function prefetchRoute(to: string) {
  const base = to.split("?")[0];
  const loader = loaders[base] ?? loaders[`/${base.split("/")[1]}`];
  loader?.().catch(() => {});
}
