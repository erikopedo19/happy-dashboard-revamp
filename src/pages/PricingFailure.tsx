import { useNavigate } from "react-router-dom";
import { PaymentFailure } from "@/components/PaymentFailure";

export default function PricingFailure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <PaymentFailure
        title="Payment Failed"
        subtitle="We couldn't process your subscription payment."
        message="Please check your payment details and try again, or use a different payment method."
        retryButtonText="Try Again"
        secondaryButtonText="Home"
        tertiaryButtonText="Contact Support"
        onRetry={() => navigate("/pricing")}
        onSecondary={() => navigate("/admin")}
        onTertiary={() => window.location.href = "mailto:support@cutzioo.com"}
      />
    </div>
  );
}
