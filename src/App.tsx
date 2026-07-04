
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { GlimmProvider } from "glimm/react";
import { accentChain } from "glimm";
import { GlimmIntercept } from "./components/GlimmIntercept";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Custom blue → rose → purple sweep palette
const SWEEP_PALETTE = accentChain(["#2E70FF", "#FF3D7F", "#D33CFF"]);
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
import ReviewPage from "./pages/ReviewPage";
import WaitlistClaim from "./pages/WaitlistClaim";
import Landing from "./pages/Landing";
import { PersistentDock } from "./components/PersistentDock";
import { NotificationBell } from "./components/NotificationBell";
import { PremiumGiftPopup } from "./components/PremiumGiftPopup";
import Onboarding, { ONBOARDING_STORAGE_KEY } from "./pages/Onboarding";
import { useFinalizeOnboarding } from "./hooks/use-finalize-onboarding";
import Microsite from "./pages/Microsite";
import MicrositeEditor from "./pages/MicrositeEditor";
import ChooseMode from "./pages/ChooseMode";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
      refetchOnWindowFocus: false, // Prevent background refetch on focus
      refetchOnReconnect: false,
    },
  },
});

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
}

const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "admin", "api", "cutzioo", "happy-ios-dash", "localhost",
]);

function isMicrositeSubdomain(): string | null {
  const host = window.location.hostname;
  if (host.endsWith(".cutzioo.com")) {
    const sub = host.slice(0, -".cutzioo.com".length);
    if (sub && !RESERVED_SUBDOMAINS.has(sub) && !sub.includes(".")) return sub;
  }
  return null;
}

function AnimatedRoutes() {
  useFinalizeOnboarding();
  const location = useLocation();
  const subdomain = isMicrositeSubdomain();
  if (subdomain) {
    return <Microsite />;
  }
  return (
    <Routes location={location}>
      <Route path="/auth" element={<Auth />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      <Route path="/choose-mode" element={<ChooseMode />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/book/:bookingLink" element={<Booking />} />
      <Route path="/manage/:token" element={<ManageBooking />} />
      <Route path="/review/:token" element={<ReviewPage />} />
      <Route path="/waitlist/claim/:token" element={<WaitlistClaim />} />
      <Route path="/bookingforms" element={<BookingForms />} />
      <Route path="/find-barber" element={<FindBarber />} />
      <Route path="/find-barbershop" element={<FindBarbershop />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/me" element={<Me />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/" element={<LandingRoute />} />
      <Route path="/app" element={<LandingRoute />} />
      <Route path="/superadmin" element={<SuperAdminLogin />} />
      <Route path="/superadmin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/choose-role" element={<ProtectedRoute><ChooseRole /></ProtectedRoute>} />
      <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
      <Route path="/stylists" element={<ProtectedRoute><Stylists /></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute><PremiumGate featureName="Teams & Stylists"><Teams /></PremiumGate></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><PremiumGate featureName="Products Catalog"><Products /></PremiumGate></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><PremiumGate featureName="Reports & Analytics"><Reports /></PremiumGate></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="/pricing/success" element={<ProtectedRoute><PricingSuccess /></ProtectedRoute>} />
      <Route path="/brand" element={<ProtectedRoute><Brand /></ProtectedRoute>} />
      <Route path="/booking-page" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
      <Route path="/microsite" element={<ProtectedRoute><MicrositeEditor /></ProtectedRoute>} />
      <Route path="/site/:slug" element={<Microsite />} />
      <Route path="/dbprevstats07" element={<ProtectedRoute><DbPrevStats /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

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
                  <img src={logoSrc} alt="Cutzioo Barber Booking Logo" className="splash-logo" />
                  <span className="splash-label">Loading</span>
                </div>
              </div>
            )}
          <BrowserRouter>
            <GlimmProvider palette={SWEEP_PALETTE} sweepMs={700} outroMs={380} brightness={1} swellAmount={0.9}>
              <GlimmIntercept />
              <AnimatedRoutes />
              <NotificationBell />
              <PremiumGiftPopup />
              <PersistentDock />
            </GlimmProvider>
          </BrowserRouter>
        </div>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
