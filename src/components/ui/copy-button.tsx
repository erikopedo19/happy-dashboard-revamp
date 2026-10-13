"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconCheckCircle,
  IconCloseCircle,
  IconCopy,
  IconSpinner,
} from "@devigner-ui/icons";
import { cn } from "@/lib/utils";
import { useReducedMotionPreference } from "devignerui/hooks";
import { SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "devignerui/motion";
import { useControllableState } from "devignerui/hooks";

/** Seconds between letters as the label retypes itself, left to right. */
const LETTER_STAGGER = 0.035;
const BLUR = "blur(4px)";

/** React's drag and animation handlers collide with Motion's own. */
type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onCopy"
  | "onError"
  | "value"
>;

export type CopyButtonStatus = "idle" | "pending" | "copied" | "error";
export type CopyButtonSize = "sm" | "md" | "lg";

const SIZES: Record<
  CopyButtonSize,
  { root: string; square: string; icon: string }
> = {
  sm: {
    root: "h-9 gap-1.5 pl-2.5 pr-4 text-sm",
    square: "size-9",
    icon: "size-4.5",
  },
  md: {
    root: "h-11 gap-2 pl-3 pr-5 text-base",
    square: "size-11",
    icon: "size-5.5",
  },
  lg: {
    root: "h-13 gap-2.5 pl-4 pr-6 text-lg",
    square: "size-13",
    icon: "size-6.5",
  },
};

const TONE: Record<CopyButtonStatus, string> = {
  idle: "bg-foreground text-background",
  pending: "bg-foreground text-background",
  copied: "bg-green-700 text-white",
  error: "bg-red-600 text-white",
};

export interface CopyButtonProps extends ButtonProps {
  /** Text written to the clipboard. A function is read at click time and may
   *  return a promise; the button shows a spinner while it resolves. */
  value: string | (() => string | Promise<string>);
  /** Writes the text. Defaults to navigator.clipboard.writeText; swap it for
   *  rich content, an older-browser fallback or tests. */
  copy?: (text: string) => Promise<void>;
  /** Controlled state. */
  status?: CopyButtonStatus;
  /** Initial state when uncontrolled. */
  defaultStatus?: CopyButtonStatus;
  /** Fires whenever the state requests a change. */
  onStatusChange?: (status: CopyButtonStatus) => void;
  /** Fires after the text is on the clipboard. */
  onCopy?: (value: string) => void;
  /** Handles a failed read or write. The error state shows either way. */
  onError?: (error: unknown) => void;
  label?: string;
  copiedLabel?: string;
  /** Announced, and the accessible name, while an async value resolves. */
  pendingLabel?: string;
  errorLabel?: string;
  /** ms the copied or error state holds before returning to idle. 0 keeps it. */
  resetAfter?: number;
  size?: CopyButtonSize;
  /** Hides the text; the label stays as the accessible name. */
  iconOnly?: boolean;
  disabled?: boolean;
}

const defaultCopy = (text: string) => navigator.clipboard.writeText(text);

/** Each letter keyed by its slot and glyph, so the shared prefix of the two
 *  labels ("Cop") stays put and only the letters that differ swap. */
function Letters({ text, reduced }: { text: string; reduced: boolean }) {
  return (
    // layout="position" counter-scales the letters while the button's width
    // animates, so they never stretch.
    <motion.span
      aria-hidden
      layout={reduced ? false : "position"}
      transition={SPRING_LAYOUT}
      className="relative inline-flex whitespace-pre"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {[...text].map((char, i) => (
          <motion.span
            key={`${i}${char}`}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, filter: BLUR, y: 2 }
            }
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={
              reduced ? { opacity: 0 } : { opacity: 0, filter: BLUR, y: -2 }
            }
            transition={{
              ...SPRING_SWAP,
              delay: reduced ? 0 : i * LETTER_STAGGER,
            }}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.span>
  );
}

export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  function CopyButton(
    {
      value,
      copy = defaultCopy,
      status,
      defaultStatus = "idle",
      onStatusChange,
      onCopy,
      onError,
      label = "Copy",
      copiedLabel = "Copied",
      pendingLabel = "Copying",
      errorLabel = "Failed",
      resetAfter = 1000,
      size = "md",
      iconOnly = false,
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const reduced = useReducedMotionPreference();
    const [phase, setPhase] = useControllableState({
      value: status,
      defaultValue: defaultStatus,
      onValueChange: onStatusChange,
    });
    // Bumped on every finished copy, so a second click restarts the hold even
    // when the state is already "copied".
    const [run, setRun] = React.useState(0);
    const sizes = SIZES[size];

    React.useEffect(() => {
      if ((phase !== "copied" && phase !== "error") || resetAfter <= 0) return;
      const id = setTimeout(() => setPhase("idle"), resetAfter);
      return () => clearTimeout(id);
    }, [phase, resetAfter, run]);

    const text = {
      idle: label,
      pending: pendingLabel,
      copied: copiedLabel,
      error: errorLabel,
    }[phase];

    const handle = async () => {
      let resolved: string;
      try {
        const out = typeof value === "function" ? value() : value;
        if (typeof out === "string") resolved = out;
        else {
          setPhase("pending");
          resolved = await out;
        }
        await copy(resolved);
      } catch (error) {
        setPhase("error");
        setRun((n) => n + 1);
        onError?.(error);
        return;
      }
      setPhase("copied");
      setRun((n) => n + 1);
      onCopy?.(resolved);
    };

    // Every glyph stays mounted and stacked, so a swap is one interruptible
    // crossfade: the outgoing glyph shrinks and blurs while the incoming one
    // grows out of the same blur, and the eye reads a single morphing shape.
    const slot = (key: CopyButtonStatus, icon: React.ReactNode) => {
      const shown = phase === key;
      return (
        <motion.span
          className="col-start-1 row-start-1 grid place-items-center"
          initial={false}
          animate={
            reduced
              ? { opacity: shown ? 1 : 0 }
              : {
                  opacity: shown ? 1 : 0,
                  scale: shown ? 1 : 0.25,
                  filter: shown ? "blur(0px)" : BLUR,
                }
          }
          transition={SPRING_SWAP}
        >
          {icon}
        </motion.span>
      );
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        layout={!reduced}
        transition={SPRING_LAYOUT}
        whileTap={
          reduced ? undefined : { scale: 1.04, transition: SPRING_PRESS }
        }
        aria-label={text}
        aria-busy={phase === "pending"}
        data-status={phase}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center font-semibold transition-colors duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60",
          iconOnly ? sizes.square : sizes.root,
          TONE[phase],
          className,
        )}
        style={{ borderRadius: 999 }}
        onClick={(e) => {
          onClick?.(e);
          if (phase === "pending") return;
          void handle();
        }}
        {...rest}
      >
        <span aria-live="polite" className="sr-only">
          {phase === "idle" ? "" : text}
        </span>
        <motion.span
          layout={reduced ? false : "position"}
          transition={SPRING_LAYOUT}
          className={cn("relative grid place-items-center", sizes.icon)}
        >
          {slot(
            "idle",
            <IconCopy variant="Bold" aria-hidden className={sizes.icon} />,
          )}
          {slot(
            "pending",
            <IconSpinner
              aria-hidden
              className={cn(sizes.icon, !reduced && "animate-spin")}
            />,
          )}
          {slot(
            "copied",
            <IconCheckCircle
              variant="Bold"
              aria-hidden
              className={sizes.icon}
            />,
          )}
          {slot(
            "error",
            <IconCloseCircle
              variant="Bold"
              aria-hidden
              className={sizes.icon}
            />,
          )}
        </motion.span>
        {!iconOnly && <Letters text={text} reduced={reduced} />}
      </motion.button>
    );
  },
);
CopyButton.displayName = "CopyButton";
