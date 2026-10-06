
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import React, { lazy, Suspense, useEffect, useState } from "react";
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
import { useOrganization } from "./hooks/use-organization";
import { canAccessPage, firstAllowedPage, isRestrictedMember, MEMBER_PAGES } from "./lib/pageAccess";
import { isNative } from "./lib/native";
import { setupQueryPersistence } from "./lib/queryPersist";


// Route chunks warmed up in the background after first paint, so switching
// pages never waits on a network download.
const PRELOAD: Array<() => Promise<unknown>> = [];

const Auth = lazyRetry(() => import("./pages/Auth"), true);
const Dashboard = lazyRetry(() => import("./pages/Dashboard"), true);
const Agenda = lazyRetry(() => import("./pages/Agenda"), true);
const Customers = lazyRetry(() => import("./pages/Customers"), true);
const Services = lazyRetry(() => import("./pages/Services"), true);
const Settings = lazyRetry(() => import("./pages/Settings"), true);
const Pricing = lazyRetry(() => import("./pages/Pricing"));
const PricingSuccess = lazyRetry(() => import("./pages/PricingSuccess"));
const PricingFailure = lazyRetry(() => import("./pages/PricingFailure"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const SuperAdminLogin = lazyRetry(() => import("./pages/SuperAdminLogin"));
const SuperAdminDashboard = lazyRetry(() => import("./pages/SuperAdminDashboard"));
const Brand = lazyRetry(() => import("./pages/Brand"));
const Booking = lazyRetry(() => import("./pages/Booking"));
const BookingPage = lazyRetry(() => import("./pages/BookingPage"));
const BookingForms = lazyRetry(() => import("./pages/BookingForms"));
const FindBarber = lazyRetry(() => import("./pages/FindBarber"), true);
const BarberDetail = lazyRetry(() => import("./pages/BarberDetail"), true);
const FindBarbershop = lazyRetry(() => import("./pages/FindBarbershop"));
const Stylists = lazyRetry(() => import("./pages/Stylists"));
const Teams = lazyRetry(() => import("./pages/Teams"));
const ChooseRole = lazyRetry(() => import("./pages/ChooseRole"));
const CompleteProfile = lazyRetry(() => import("./pages/CompleteProfile"));
const DbPrevStats = lazyRetry(() => import("./pages/DbPrevStats"));
const Reports = lazyRetry(() => import("./pages/Reports"), true);
const MyBookings = lazyRetry(() => import("./pages/MyBookings"), true);
const Me = lazyRetry(() => import("./pages/Me"), true);
const Favorites = lazyRetry(() => import("./pages/Favorites"), true);
const Events = lazyRetry(() => import("./pages/Events"), true);
const EventsManage = lazyRetry(() => import("./pages/EventsManage"));
const ManageBooking = lazyRetry(() => import("./pages/ManageBooking"));
const ReviewPage = lazyRetry(() => import("./pages/ReviewPage"));
const WaitlistClaim = lazyRetry(() => import("./pages/WaitlistClaim"));
const Landing = lazyRetry(() => import("./pages/Landing"));
const Onboarding = lazyRetry(() => import("./pages/Onboarding"));
const Microsite = lazyRetry(() => import("./pages/Microsite"));
const MicrositeEditor = lazyRetry(() => import("./pages/MicrositeEditor"));
const ChooseMode = lazyRetry(() => import("./pages/ChooseMode"));
const OAuthConsent = lazyRetry(() => import("./pages/OAuthConsent"));

function lazyRetry<T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>, preload = false) {
  if (preload) PRELOAD.push(load);
  return lazy(() => load().then((mod) => {
    if (!mod || !mod.default) throw new Error("Failed to fetch dynamically imported module");
    return mod;
  }).catch((err) => {
    const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem("chunk-reload-at", String(Date.now()));
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    }
    throw err;
  }));
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24h (matches persisted cache age)
      refetchOnWindowFocus: false, // Prevent background refetch on focus
      refetchOnReconnect: false,
    },
  },
});
setupQueryPersistence(queryClient);

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

// Redirects invited members away from pages their owner didn't grant.
function PageAccessGuard() {
  const location = useLocation();
  const { membership, loading } = useOrganization();
  const allowed = membership?.role === "member" ? membership.allowed_pages ?? null : null;
  const restricted = isRestrictedMember(membership?.role, allowed);

  useEffect(() => {
    if (!restricted || !allowed) return;
    const path = location.pathname;
    if (MEMBER_PAGES.some((p) => path === p.path || path.startsWith(p.path + "/")) && !canAccessPage(allowed, path)) {
      window.history.replaceState({}, "", firstAllowedPage(allowed));
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [restricted, allowed, location.pathname]);

  return null;
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
    location.pathname.startsWith("/b/") ||
    location.pathname.startsWith("/book/") ||
    (isMobile && location.pathname.startsWith("/find-barber")) ||
    (isMobile && location.pathname === "/agenda");
  if (hasOwnBell) return null;
  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50">
      <NotificationBell floating />
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
    const t = setTimeout(() => setShowSplash(false), 1200);
    const idle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
    idle(() => PRELOAD.reduce((p, load) => p.then(() => load().catch(() => {})), Promise.resolve() as Promise<unknown>));
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
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                  <PageAccessGuard />
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
