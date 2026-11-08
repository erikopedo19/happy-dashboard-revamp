import { Seo } from "@/components/Seo";
import { Hero, LandingNav, MobileCtaBar } from "@/components/landing/hero";
import { FeaturesBand, HowItWorks, Mission } from "@/components/landing/middle";
import { Membership } from "@/components/landing/membership";
import { Audience, FAQS, Faq, FooterCta } from "@/components/landing/bottom";

export default function Landing() {
  return (
    <div className="min-h-screen scroll-smooth pb-20 sm:pb-0 bg-white font-geist text-neutral-900 antialiased dark:bg-[#0a0a0c] dark:text-white">
      <Seo
        title="Cutzioo | Find & Book Barbers Near You – Free Barber Booking App"
        description="Find top-rated barbers and barbershops near you and book a haircut online in seconds. Barbers get a free booking page, agenda, reminders and payments."
        path="/"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "WebSite", name: "Cutzioo", alternateName: "Cutzioo Barber Booking", url: "https://cutzioo.com/" },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <LandingNav />
      <main>
        <Hero />
        <FeaturesBand />
        {/* Phones get a shorter page: these story sections are desktop-only. */}
        <div className="hidden sm:block">
          <Mission />
        </div>
        <HowItWorks />
        <div className="hidden sm:block">
          <Audience />
        </div>
        <Membership />
        <Faq />
      </main>
      <FooterCta />
      <MobileCtaBar />
    </div>
  );
}
