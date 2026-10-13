import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = ["Team details", "Invite by email", "Ready"];

/** Adapted from the uploaded Arc stepper: completed steps remain reachable. */
export function TeamSetupStepper({ current, onStepSelect }: { current: number; onStepSelect: (step: number) => void }) {
  const reduced = useReducedMotion();
  return (
    <nav aria-label="Team setup progress" className="py-5">
      <ol className="flex items-start" onKeyDown={(event) => {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const back = rtl ? "ArrowRight" : "ArrowLeft";
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : event.key === back || event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight") ? index + 1 : null;
        if (next === null) return;
        event.preventDefault();
        buttons[Math.max(0, Math.min(next, buttons.length - 1))]?.focus();
      }}>
        {steps.map((label, index) => (
          <li key={label} className="relative flex-1 min-w-0 text-center">
            {index < steps.length - 1 && <span className="absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-5 h-0.5 bg-border overflow-hidden"><motion.span className="block h-full bg-primary" initial={false} animate={{ scaleX: current > index ? 1 : 0 }} style={{ transformOrigin: "left" }} transition={{ duration: reduced ? 0 : 0.25 }} /></span>}
            <Button type="button" size="icon" variant="ghost" disabled={index > current} aria-current={index === current ? "step" : undefined} aria-label={`${label}: ${index < current ? "Completed" : index === current ? "Current step" : "Not started"}`} onClick={() => index < current && onStepSelect(index)} className={cn("relative h-10 w-10 rounded-full border", index < current ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : index === current ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}>
              <motion.span key={index < current ? "complete" : "number"} initial={reduced ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{index < current ? <Check className="h-4 w-4" /> : index + 1}</motion.span>
            </Button>
            <p className={cn("mt-2 text-xs break-words px-1", index === current ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</p>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">{current >= steps.length ? "All steps complete" : `Step ${current + 1} of ${steps.length}: ${steps[current]}`}</p>
    </nav>
  );
}