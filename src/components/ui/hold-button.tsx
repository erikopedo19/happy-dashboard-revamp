"use client";

// Hold-to-confirm button: press and hold until the fill completes to fire the
// action; releasing early springs the fill back — iOS-style destructive confirm.

import { useCallback, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface HoldButtonProps {
  label: string;
  doneLabel?: string;
  /** How long the press must be held, ms. Default 900. */
  holdMs?: number;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onError?: () => void;
  className?: string;
}

export function HoldButton({
  label,
  doneLabel = "Done",
  holdMs = 900,
  disabled = false,
  onConfirm,
  onError,
  className,
}: HoldButtonProps) {
  const [state, setState] = useState<"idle" | "holding" | "busy" | "done">("idle");
  const fill = useAnimationControls();
  const timer = useRef<number>();
  const pointerId = useRef<number | null>(null);
  const busy = state === "busy" || state === "done";

  const finish = useCallback(async () => {
    setState("busy");
    haptic("warning");
    try {
      await onConfirm();
      setState("done");
      haptic("success");
      window.setTimeout(() => {
        setState("idle");
        void fill.start({ width: "0%", transition: { duration: 0.2 } });
      }, 1200);
    } catch (e) {
      setState("idle");
      void fill.start({ width: "0%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onError?.();
    }
  }, [onConfirm, onError, fill]);

  const startHold = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || busy) return;
      pointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setState("holding");
      haptic("selection");
      void fill.start({ width: "100%", transition: { duration: holdMs / 1000, ease: "linear" } });
      timer.current = window.setTimeout(finish, holdMs);
    },
    [disabled, busy, fill, holdMs, finish],
  );

  const releaseHold = useCallback(() => {
    if (state !== "holding") return;
    window.clearTimeout(timer.current);
    setState("idle");
    void fill.start({ width: "0%", transition: { type: "spring", stiffness: 320, damping: 32 } });
  }, [state, fill]);

  return (
    <motion.button
      type="button"
      disabled={disabled || busy}
      onPointerDown={startHold}
      onPointerUp={releaseHold}
      onPointerCancel={releaseHold}
      onLostPointerCapture={releaseHold}
      onContextMenu={(e) => e.preventDefault()}
      animate={{ scale: state === "holding" ? 0.97 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "relative h-11 w-full select-none overflow-hidden rounded-2xl text-[13px] font-semibold",
        "disabled:cursor-default disabled:opacity-70",
        className,
      )}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-[#FF2D46]"
        initial={{ width: "0%" }}
        animate={fill}
      />
      <span className="relative z-10 flex items-center justify-center gap-1.5">
        {state === "busy" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Working…
          </>
        ) : state === "done" ? (
          doneLabel
        ) : state === "holding" ? (
          "Keep holding…"
        ) : (
          label
        )}
      </span>
    </motion.button>
  );
}

export default HoldButton;
