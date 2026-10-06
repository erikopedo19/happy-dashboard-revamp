// Per-member page access for invited barbers. Owners/admins see everything;
// members with allowed_pages set only see those pages.
export const MEMBER_PAGES = [
  { path: "/admin", label: "Dashboard" },
  { path: "/agenda", label: "Agenda" },
  { path: "/customers", label: "Customers" },
  { path: "/services", label: "Services" },
  { path: "/stylists", label: "Stylists" },
  { path: "/teams", label: "Teams" },
  { path: "/events/manage", label: "Events" },
  { path: "/reports", label: "Reports" },
  { path: "/booking-page", label: "Booking page" },
  { path: "/settings", label: "Settings" },
] as const;

export const DEFAULT_MEMBER_PAGES = ["/agenda", "/customers"];

// Pages a member can always reach so they're never locked out of
// sign-out / billing / account basics.
const ALWAYS_ALLOWED = [
  "/choose-role",
  "/complete-profile",
  "/pricing",
  "/profile",
  "/me",
  "/my-bookings",
  "/find-barber",
  "/favorites",
  "/settings",
];

const matches = (allowed: string, path: string) =>
  path === allowed || path.startsWith(allowed + "/");

export function canAccessPage(allowedPages: string[] | null | undefined, path: string): boolean {
  // No list stored → full access (owners/admins never carry one).
  if (!allowedPages || allowedPages.length === 0) return true;
  if (ALWAYS_ALLOWED.some((a) => matches(a, path))) return true;
  return allowedPages.some((a) => matches(a, path));
}

export function isRestrictedMember(role: string | undefined, allowedPages: string[] | null | undefined): boolean {
  return role === "member" && Array.isArray(allowedPages) && allowedPages.length > 0;
}

export function firstAllowedPage(allowedPages: string[] | null | undefined): string {
  return allowedPages && allowedPages.length > 0 ? allowedPages[0] : "/agenda";
}
