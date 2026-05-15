import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingTableOne } from "@/components/billingsdk/pricing-table-one";
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
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <PricingTableOne
          plans={plans}
          title="Pricing"
          description="Choose the plan that's right for you"
          onPlanSelect={handlePlanSelect}
          size="small"
          theme="minimal"
          className="w-full"
        />
      </div>
    </div>
  );
}
