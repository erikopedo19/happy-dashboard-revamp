import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade-and-rise reveal on scroll — the "Apple" entrance used everywhere. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Small uppercase pill label above section headings ("OUR MISSION" etc). */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-1.5",
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 backdrop-blur",
        "dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-400",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Serif-italic accent word inside a heading, like the reference's italic words. */
export function Em({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <em className={cn("font-serif italic font-normal tracking-[-0.01em]", className)}>
      {children}
    </em>
  );
}

/** Black pill CTA used across the page ("Start learning for free" style). */
export function PillButton({
  children,
  href,
  className,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white",
    "shadow-[0_14px_30px_-10px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]",
    "dark:bg-white dark:text-neutral-900 dark:shadow-[0_14px_30px_-10px_rgba(255,255,255,0.25)]",
    className
  );
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
