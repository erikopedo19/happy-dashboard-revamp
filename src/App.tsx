
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { ThemeProvider } from "next-themes";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import PricingSuccess from "./pages/PricingSuccess";
import { PremiumGate } from "./components/PremiumGate";
import NotFound from "./pages/NotFound";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Brand from "./pages/Brand";
import Booking from "./pages/Booking";
import BookingPage from "./pages/BookingPage";
import BookingForms from "./pages/BookingForms";
import FindBarber from "./pages/FindBarber";
import FindBarbershop from "./pages/FindBarbershop";
import Stylists from "./pages/Stylists";
import Teams from "./pages/Teams";
import ChooseRole from "./pages/ChooseRole";
import CompleteProfile from "./pages/CompleteProfile";
import DbPrevStats from "./pages/DbPrevStats";
import Reports from "./pages/Reports";
import MyBookings from "./pages/MyBookings";
import Me from "./pages/Me";
import Favorites from "./pages/Favorites";
import ManageBooking from "./pages/ManageBooking";
import Landing from "./pages/Landing";
import { PersistentDock } from "./components/PersistentDock";
import { NotificationBell } from "./components/NotificationBell";
import { PremiumGiftPopup } from "./components/PremiumGiftPopup";
const queryClient = new QueryClient();

const LandingRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (user) {
    const role = user.user_metadata?.role;
    if (role === 'client') {
      return <FindBarber />;
    }
    return <Navigate to="/admin" replace />;
  }

  // Logged out → marketing landing page
  return <Landing />;
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const logoSrc = "/logo.svg";

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Toaster />
            <Sonner />
            {showSplash && (
              <div className="splash-screen">
                <div className="splash-stage">
                  <div className="splash-ring" />
                  <img src={logoSrc} alt="Logo" className="splash-logo" />
                  <span className="splash-label">Loading</span>
                </div>
              </div>
            )}
          <BrowserRouter>
            <AnimatedRoutes />
            <NotificationBell />
            <PremiumGiftPopup />
            <PersistentDock />
          </BrowserRouter>
        </div>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
