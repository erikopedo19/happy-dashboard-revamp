import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDockInner } from "@/components/MobileDock";
import { ClientMobileDockInner } from "@/components/ClientMobileDock";

const HIDE_ON = ["/auth", "/superadmin", "/choose-role", "/complete-profile"];
const HIDE_PREFIX = ["/book/"];

export const PersistentDock = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (!isMobile) return null;
  if (HIDE_ON.includes(location.pathname)) return null;
  if (HIDE_PREFIX.some((p) => location.pathname.startsWith(p))) return null;

  const role = (user?.user_metadata as any)?.role;
  const clientRoutes = ["/find-barber", "/find-barbershop", "/my-bookings", "/favorites", "/me"];
  const isClientRoute = clientRoutes.some((r) => location.pathname.startsWith(r));

  if (isClientRoute || role === "client") return <ClientMobileDockInner />;
  return <MobileDockInner />;
};

export default PersistentDock;
