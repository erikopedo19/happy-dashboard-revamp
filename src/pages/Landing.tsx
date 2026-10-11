import { Seo } from "@/components/Seo";
import { Hero, LandingNav } from "@/components/landing/hero";
import { FeaturesBand, HowItWorks, Mission } from "@/components/landing/middle";
import { Membership } from "@/components/landing/membership";
import { Audience, Faq, FooterCta, Testimonial } from "@/components/landing/bottom";

export default function Landing() {
  return (
    <div className="min-h-screen scroll-smooth bg-white font-geist text-neutral-900 antialiased dark:bg-[#0a0a0c] dark:text-white">
      <Seo
        title="Cutzioo — Barbershop Booking & Management for Modern Barbers"
        description="Run your chair like a premium app. Publish a booking page, manage your agenda, and grow your barbershop with Cutzioo."
        path="/"
        jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", name: "Cutzioo", url: "https://cutzioo.com/" }}
      />
      <LandingNav />
      <main>
        <Hero />
        <FeaturesBand />
        <Mission />
        <HowItWorks />
        <Audience />
        <Testimonial />
        <Membership />
        <Faq />
      </main>
      <FooterCta />
    </div>
  );
}
