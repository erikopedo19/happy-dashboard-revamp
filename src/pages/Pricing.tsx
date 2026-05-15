import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingTableFour } from "@/components/billingsdk/pricing-table-four";
import { plans, STRIPE_PAYMENT_LINK } from "@/lib/billingsdk-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Pricing() {
  const navigate = useNavigate();

  async function handlePlanSelect(planId: string) {
    if (planId !== "pro") return;
    const { data: { user } } = await supabase.auth.getUser();
    const url = new URL(STRIPE_PAYMENT_LINK);
    if (user?.email) url.searchParams.set("prefilled_email", user.email);
    if (user?.id) url.searchParams.set("client_reference_id", user.id);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    toast.info("Opening secure Stripe checkout…");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 pt-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
      <PricingTableFour
        plans={plans}
        title="Choose Your Perfect Plan"
        theme="classic"
        description="Transform your workflow with pricing that fits every stage."
        subtitle="Simple Pricing"
        onPlanSelect={handlePlanSelect}
        size="medium"
        className="w-full"
        showBillingToggle={true}
        billingToggleLabels={{ monthly: "Monthly", yearly: "Yearly" }}
      />
    </div>
  );
}
