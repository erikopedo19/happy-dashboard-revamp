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

// Stripe Payment Link for Cutzio Pro Monthly ($19/mo)
export const STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/3cI3cn7lodSC9ODcvq2ZO04";

export const plans: Plan[] = [
  {
    id: "free",
    title: "Free",
    description: "Get started with the essentials.",
    currency: "$",
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
    currency: "$",
    monthlyPrice: "19",
    yearlyPrice: "190",
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
