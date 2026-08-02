export interface Plan {
  id: string;
  title: string;
  description: string;
  highlight?: boolean;
  type?: "monthly" | "yearly";
  currency?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  buttonText: string;
  badge?: string;
  features: {
    name: string;
    icon: string;
    iconColor?: string;
  }[];
}

export interface CurrentPlan {
  plan: Plan;
  type: "monthly" | "yearly" | "custom";
  price?: string;
  nextBillingDate: string;
  paymentMethod: string;
  status: "active" | "inactive" | "past_due" | "cancelled";
}

// Stripe Payment Link for Pro Monthly (€8.99/mo) — checkout
export const STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/3cI3cn7lodSC9ODcvq2ZO04";

// Stripe Payment Link for Pro Yearly. Leave empty until a yearly link exists in
// Stripe — the pricing page hides the yearly option while this is empty so we
// never send a yearly selection to the monthly checkout.
export const STRIPE_PAYMENT_LINK_YEARLY = "";

// Set to true only when the Stripe payment link itself has a free trial
// configured (trials cannot be added via URL parameters).
export const STRIPE_TRIAL_ENABLED = false;

// Stripe-hosted Customer Portal login link — used to cancel / pause / update card.
// Get yours at: Stripe Dashboard → Settings → Billing → Customer portal → "Login link".
// Leave empty until configured; users will fall back to /pricing.
export const STRIPE_PORTAL_LINK = "";

export const plans: Plan[] = [
  {
    id: "free",
    title: "Free",
    description: "Get started with the essentials.",
    currency: "€",
    monthlyPrice: "0",
    yearlyPrice: "0",
    buttonText: "Current plan",
    features: [
      { name: "Up to 20 bookings / month", icon: "check", iconColor: "text-rose-500" },
      { name: "Public booking page", icon: "check", iconColor: "text-rose-500" },
      { name: "Email confirmations", icon: "check", iconColor: "text-rose-500" },
      { name: "Single user", icon: "check", iconColor: "text-rose-500" },
    ],
  },
  {
    id: "pro",
    title: "Pro",
    description: "For barbers serious about growth.",
    currency: "€",
    monthlyPrice: "8.99",
    yearlyPrice: "89.90",
    buttonText: "Subscribe",
    badge: "Most popular",
    highlight: true,
    features: [
      { name: "Unlimited bookings", icon: "check", iconColor: "text-rose-500" },
      { name: "Map listing & discovery", icon: "check", iconColor: "text-rose-500" },
      { name: "Custom branding & themes", icon: "check", iconColor: "text-rose-500" },
      { name: "Team members & stylists", icon: "check", iconColor: "text-rose-500" },
      { name: "Reports & analytics", icon: "check", iconColor: "text-rose-500" },
      { name: "Cancel anytime", icon: "check", iconColor: "text-rose-500" },
    ],
  },
];
