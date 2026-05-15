import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDockInner } from "@/components/MobileDock";
import { ClientMobileDockInner } from "@/components/ClientMobileDock";

const HIDE_ON = ["/auth", "/superadmin", "/choose-role", "/complete-profile"];
const HIDE_PREFIX = ["/book/"];

const CLIENT_ROUTES = [
  "/find-barber",
  "/find-barbershop",
  "/my-bookings",
  "/favorites",
  "/me",
];

const ADMIN_ROUTES = [
  "/admin",
  "/agenda",
  "/reports",
  "/services",
  "/settings",
  "/customers",
  "/booking-page",
  "/stylists",
  "/teams",
  "/products",
  "/booking-forms",
  "/brand",
];

export const PersistentDock = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (!isMobile) return null;
  if (HIDE_ON.includes(location.pathname)) return null;
  if (HIDE_PREFIX.some((p) => location.pathname.startsWith(p))) return null;
  // Hide on landing page when logged out
  if (!user && location.pathname === "/") return null;

  const role = (user?.user_metadata as any)?.role;
  const isClientRoute = CLIENT_ROUTES.some((r) => location.pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => location.pathname.startsWith(r));

  // Route-based wins (handles role mismatch). Client routes → client dock.
  if (isClientRoute) return <ClientMobileDockInner />;
  if (isAdminRoute && role !== "client") return <MobileDockInner />;

  // Fallback by role: only barbers/admins see admin dock.
  if (role === "barber" || role === "admin" || role === "owner") {
    return <MobileDockInner />;
  }
  return <ClientMobileDockInner />;
};

export default PersistentDock;
