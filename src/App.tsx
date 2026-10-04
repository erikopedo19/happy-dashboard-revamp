
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { GlimmProvider } from "glimm/react";
import { accentChain } from "glimm";
import { GlimmIntercept } from "./components/GlimmIntercept";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Scroll to top on route change for mobile
function ScrollToTop() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile() ?? false;

  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0);
    }
  }, [pathname, isMobile]);

  return null;
}

// Custom blue → rose → purple sweep palette
const SWEEP_PALETTE = accentChain(["#2E70FF", "#FF3D7F", "#D33CFF"]);
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { ThemeProvider } from "next-themes";
import { PremiumGate } from "./components/PremiumGate";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { PhoneAlerts, PhoneAlertsProvider } from "@/components/PhoneAlerts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistentDock } from "./components/PersistentDock";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { NotificationBell } from "./components/NotificationBell";
import { GlobalBanner } from "./components/GlobalBanner";
import { FreeUpgradeBanner } from "./components/FreeUpgradeBanner";
import { UpdatePopup } from "./components/UpdatePopup";
import { GuestSignupDrawer } from "./components/GuestSignupDrawer";
import { PageTransition } from "./components/PageTransition";
import { PullToRefresh } from "./components/PullToRefresh";
import { NativeScrollGuard } from "./components/NativeScrollGuard";
import { useFinalizeOnboarding } from "./hooks/use-finalize-onboarding";
import { isNative } from "./lib/native";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Customers = lazy(() => import("./pages/Customers"));
const Services = lazy(() => import("./pages/Services"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PricingSuccess = lazy(() => import("./pages/PricingSuccess"));
const PricingFailure = lazy(() => import("./pages/PricingFailure"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SuperAdminLogin = lazy(() => import("./pages/SuperAdminLogin"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const Brand = lazy(() => import("./pages/Brand"));
const Booking = lazy(() => import("./pages/Booking"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingForms = lazy(() => import("./pages/BookingForms"));
const FindBarber = lazy(() => import("./pages/FindBarber"));
const BarberDetail = lazy(() => import("./pages/BarberDetail"));
const FindBarbershop = lazy(() => import("./pages/FindBarbershop"));
const Stylists = lazy(() => import("./pages/Stylists"));
const Teams = lazy(() => import("./pages/Teams"));
const ChooseRole = lazy(() => import("./pages/ChooseRole"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const DbPrevStats = lazy(() => import("./pages/DbPrevStats"));
const Reports = lazy(() => import("./pages/Reports"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Me = lazy(() => import("./pages/Me"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Events = lazy(() => import("./pages/Events"));
const EventsManage = lazy(() => import("./pages/EventsManage"));
const ManageBooking = lazy(() => import("./pages/ManageBooking"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const WaitlistClaim = lazy(() => import("./pages/WaitlistClaim"));
const Landing = lazy(() => import("./pages/Landing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Microsite = lazy(() => import("./pages/Microsite"));
const MicrositeEditor = lazy(() => import("./pages/MicrositeEditor"));
const ChooseMode = lazy(() => import("./pages/ChooseMode"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

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

function RouteFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#F2F2F7] text-[#8E8E93] dark:bg-black">
      <div className="h-9 w-9 animate-pulse rounded-2xl bg-black/[0.08] dark:bg-white/[0.08]" />
    </div>
  );
}

function AnimatedRoutes() {
  useFinalizeOnboarding();
  const location = useLocation();
  const subdomain = isMicrositeSubdomain();
  if (subdomain) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Microsite />
      </Suspense>
    );
  }
  return (
    <PageTransition>
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
      <Route path="/auth" element={<Auth />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      <Route path="/choose-mode" element={<ChooseMode />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/book/:bookingLink" element={<Booking />} />
      <Route path="/b/:slug" element={<BarberDetail />} />
      <Route path="/manage/:token" element={<ManageBooking />} />
      <Route path="/review/:token" element={<ReviewPage />} />
      <Route path="/waitlist/claim/:token" element={<WaitlistClaim />} />
      <Route path="/bookingforms" element={<BookingForms />} />
      <Route path="/find-barber" element={<FindBarber />} />
      <Route path="/find-barbershop" element={<FindBarbershop />} />
      <Route path="/my-bookings" element={<MyBookings />} />
      <Route path="/me" element={<Me />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/manage" element={<ProtectedRoute><EventsManage /></ProtectedRoute>} />
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
      <Route path="/reports" element={<ProtectedRoute><PremiumGate featureName="Reports & Analytics"><Reports /></PremiumGate></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="/pricing/success" element={<ProtectedRoute><PricingSuccess /></ProtectedRoute>} />
      <Route path="/pricing/failure" element={<ProtectedRoute><PricingFailure /></ProtectedRoute>} />
      <Route path="/brand" element={<ProtectedRoute><Brand /></ProtectedRoute>} />
      <Route path="/booking-page" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
      <Route path="/microsite" element={<ProtectedRoute><MicrositeEditor /></ProtectedRoute>} />
      <Route path="/site/:slug" element={<Microsite />} />
      <Route path="/dbprevstats07" element={<ProtectedRoute><DbPrevStats /></ProtectedRoute>} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/:bookingLink" element={<Booking />} />
      <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageTransition>
  );
}

const HeaderActions = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile() ?? false;
  const location = useLocation();
  if (!user) return null;
  // Pages that already render their own notification bell in the header
  const hasOwnBell =
    location.pathname === "/admin" ||
    location.pathname === "/find-barbershop" ||
    location.pathname === "/settings" ||
    location.pathname === "/pricing" ||
    location.pathname === "/pricing/success" ||
    location.pathname === "/pricing/failure" ||
    (isMobile && location.pathname.startsWith("/find-barber")) ||
    (isMobile && location.pathname === "/agenda");
  if (hasOwnBell) return null;
  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50">
      <NotificationBell />
    </div>
  );
};

function NativeShell() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let removeBack: (() => void) | undefined;
    let cancelled = false;

    const setup = async () => {
      if (!isNative()) return;
      const { App: CapacitorApp } = await import("@capacitor/app");
      const listener = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) navigate(-1);
        else void CapacitorApp.exitApp();
      });
      if (!cancelled) removeBack = () => void listener.remove();
      else void listener.remove();
    };
    void setup();

    return () => {
      cancelled = true;
      removeBack?.();
    };
  }, [navigate]);

  useEffect(() => {
    let removeNativeListener: (() => void) | undefined;
    let cancelled = false;
    const setOnlineState = (connected: boolean) => setOffline(!connected);

    const setup = async () => {
      if (isNative()) {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        setOnlineState(status.connected);
        const listener = await Network.addListener("networkStatusChange", (next) => {
          setOnlineState(next.connected);
        });
        if (!cancelled) removeNativeListener = () => void listener.remove();
        else void listener.remove();
        return;
      }

      const update = () => setOnlineState(navigator.onLine);
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      removeNativeListener = () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    };
    void setup();

    return () => {
      cancelled = true;
      removeNativeListener?.();
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] -translate-x-1/2 rounded-full border border-black/5 bg-white/95 px-4 py-2 text-[12px] font-semibold text-[#1C1C1E] shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#1C1C1E]/95 dark:text-[#F2F2F7]"
    >
      Offline — showing saved data
    </div>
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
            {showSplash && (
              <div className="splash-screen">
                <div className="splash-stage">
                  <div className="splash-ring" />
                  <img src={logoSrc} alt="Cutzioo Barber Booking Logo" className="splash-logo" />
                  <span className="splash-label">Loading</span>
                </div>
              </div>
            )}
          <PhoneAlertsProvider>
            <BrowserRouter>
              <OnboardingProvider>
                <GlimmProvider palette={SWEEP_PALETTE} sweepMs={700} outroMs={380} brightness={1} swellAmount={0.9}>
                  <GlimmIntercept />
                  <GlobalBanner />
                  <FreeUpgradeBanner />
                  <UpdatePopup />
                  <GuestSignupDrawer />
                  <ScrollToTop />
                  <NativeShell />
                  <NativeScrollGuard />
                  <PullToRefresh />
                  <AnimatedRoutes />
                  <HeaderActions />

                  <PersistentDock />
                  <Toaster />
                  <Sonner />
                  <PhoneAlerts />

                </GlimmProvider>
              </OnboardingProvider>
            </BrowserRouter>
          </PhoneAlertsProvider>
        </div>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
