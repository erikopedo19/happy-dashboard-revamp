import { Button, Card, CardBody, CardFooter, CardHeader, ScrollShadow } from "@heroui/react";

// Same sections as the public /terms page — keep these in sync.
const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Cutzioo, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
  },
  {
    title: "2. Use of the Platform",
    body: "Cutzioo connects clients with barbers and barbershops. You must use the platform only for lawful purposes and in accordance with these terms. You are responsible for any content you post or submit.",
  },
  {
    title: "3. Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information.",
  },
  {
    title: "4. Bookings and Cancellations",
    body: "Bookings made through the platform are agreements between clients and providers. Cancellations and no-shows may be subject to the policies set by each provider.",
  },
  {
    title: "5. Limitation of Liability",
    body: 'Cutzioo is not responsible for the quality of services provided by barbers or barbershops. We provide the platform on an "as is" basis without warranties of any kind.',
  },
  {
    title: "6. Changes to These Terms",
    body: "We may update these terms from time to time. Continued use of the platform after changes means you accept the revised terms.",
  },
  {
    title: "7. Contact",
    body: "If you have any questions about these Terms, please contact us through the app or at our support email.",
  },
];

interface Props {
  onAccept: () => void;
  onCancel: () => void;
  accepting?: boolean;
}

export function TermsAcceptCard({ onAccept, onCancel, accepting = false }: Props) {
  return (
    <Card className="w-full max-w-[400px] border border-black/[0.06] bg-white text-[#1C1C1E] shadow-2xl dark:border-white/[0.08] dark:bg-[#1C1C1E] dark:text-[#F2F2F7]">
      <CardHeader className="flex flex-col items-start gap-1 px-4 pb-1 pt-4">
        <h3 className="text-[17px] font-semibold">Terms and Conditions</h3>
        <p className="text-[12px] text-[#8E8E93]">Please review before proceeding</p>
      </CardHeader>
      <CardBody className="p-0">
        <ScrollShadow className="h-[280px] px-4" size={80}>
          <div className="space-y-4 py-3">
            {SECTIONS.map((s) => (
              <div key={s.title}>
                <p className="text-[13px] font-semibold">{s.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#636366] dark:text-[#A1A1A6]">
                  {s.body}
                </p>
              </div>
            ))}
            <p className="text-[11px] text-[#8E8E93]">Last updated: July 2026</p>
          </div>
        </ScrollShadow>
      </CardBody>
      <CardFooter className="mt-2 flex flex-row gap-2 px-4 pb-4">
        <Button
          variant="flat"
          className="w-full bg-black/[0.05] font-semibold text-[#1C1C1E] dark:bg-white/[0.08] dark:text-[#F2F2F7]"
          onPress={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="w-full bg-[#FF2D46] font-semibold text-white"
          isLoading={accepting}
          onPress={onAccept}
        >
          Accept
        </Button>
      </CardFooter>
    </Card>
  );
}
