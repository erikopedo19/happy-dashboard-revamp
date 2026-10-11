import type { ReactNode } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { haptic as fireHaptic, type HapticStyle } from "@/lib/haptics";

export type RimVariant = "default" | "success" | "destructive";

type Politeness = "status" | "alert";

export interface PolishedToastOptions {
  title: string;
  description?: string;
  messageKey?: string;
  politeness?: Politeness;
  rimVariant?: RimVariant;
  closeButton?: boolean;
  icon?: ReactNode;
  haptic?: HapticStyle | false;
  duration?: number;
}

const RIM_GRADIENTS: Record<RimVariant, string> = {
  default: "linear-gradient(135deg, #FF2D46, #A3E635)",
  success: "linear-gradient(135deg, #A3E635, #30D158)",
  destructive: "linear-gradient(135deg, #FF2D46, #E0152F)",
};

function HaloCard({
  id,
  title,
  description,
  politeness,
  rimVariant,
  closeButton,
  icon,
}: PolishedToastOptions & { id: string | number }) {
  const iconColor = rimVariant === "destructive" ? "text-[#FF2D46]" : "text-[#30D158]";

  return (
    <div
      className="w-[calc(100vw-24px)] rounded-[18px] p-px sm:w-[360px]"
      style={{ background: RIM_GRADIENTS[rimVariant ?? "default"] }}
    >
      <div
        role={politeness === "alert" ? "alert" : "status"}
        className="flex items-center gap-3 rounded-[17px] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl dark:bg-[#1C1C1E]/95"
      >
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] dark:bg-white/[0.08] ${iconColor}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight text-neutral-900 dark:text-white">{title}</p>
          {description && (
            <p className="mt-0.5 text-[13px] leading-snug text-neutral-600 dark:text-white/60">{description}</p>
          )}
        </div>
        {closeButton && (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => toast.dismiss(id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/[0.06] dark:text-white/60 dark:hover:bg-white/[0.08]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function showPolishedToast(opts: PolishedToastOptions) {
  const rimVariant = opts.rimVariant ?? "default";
  const hapticStyle = opts.haptic ?? (rimVariant === "destructive" ? "warning" : "celebrate");
  const id = toast.custom(
    (id) => <HaloCard {...opts} id={id} rimVariant={rimVariant} />,
    { id: opts.messageKey, duration: opts.duration },
  );
  if (hapticStyle) fireHaptic(hapticStyle);
  return id;
}
