"use client";

// npm install framer-motion @phosphor-icons/react

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUUpLeft, Check } from "@phosphor-icons/react";

const transition = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.7,
};

export default function DeleteButton() {
  const [status, setStatus] = useState<"default" | "counting" | "deleted">(
    "default",
  );
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (status !== "counting") return;
    const timer = window.setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          setStatus("deleted");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "deleted") return;
    const timer = window.setTimeout(() => {
      setStatus("default");
      setCount(5);
    }, 2800);
    return () => clearTimeout(timer);
  }, [status]);

  const startDelete = () => {
    setStatus("counting");
    setCount(5);
  };

  const undoDelete = () => {
    setStatus("default");
    setCount(5);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#E3E3E8] dark:bg-[#0E0E0F]">
      <motion.div
        layout
        className="mx-4 flex max-w-[calc(100vw-2rem)] items-center justify-center overflow-hidden rounded-full"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {status === "default" && (
            <motion.button
              key="default"
              type="button"
              aria-label="Delete account"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={transition}
              whileHover={{ scale: 1.025 }}
              whileTap={{ scale: 0.96 }}
              onClick={startDelete}
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold tracking-[0.01em] text-white outline-none shadow-[0_0.7rem_1.8rem_rgb(220_38_38_/_0.25),inset_0_2px_0_rgba(255,255,255,0.3)] hover:bg-red-700 focus-visible:ring-4 focus-visible:ring-red-400/45 dark:bg-red-500 dark:shadow-[0_0.7rem_1.8rem_rgb(248_113_113_/_0.18),inset_0_2px_0_rgba(255,255,255,0.18)] dark:hover:bg-red-400"
            >
              Delete Account
            </motion.button>
          )}

          {status === "counting" && (
            <motion.div
              key="counting"
              role="status"
              aria-live="polite"
              aria-label={`Account deletion will be final in ${count} seconds`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={transition}
              className="flex items-center gap-3 rounded-full border border-red-200 bg-red-100 p-1.5 pr-2 text-red-700 shadow-[0_0.8rem_2rem_rgb(239_68_68_/_0.12),inset_0_2px_0_rgba(255,255,255,0.65)] dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-300 dark:shadow-[0_0.8rem_2rem_rgb(248_113_113_/_0.1),inset_0_2px_0_rgba(255,255,255,0.15)]"
            >
              <motion.button
                type="button"
                aria-label="Undo account deletion"
                onClick={undoDelete}
                whileHover={{ scale: 1.08, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                transition={transition}
                className="size-10 place-items-center rounded-full bg-red-600 text-white shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05),inset_0_2px_0_rgba(255,255,255,0.3)] focus-visible:ring-4 focus-visible:ring-red-400/45 dark:bg-red-500 dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05),inset_0_2px_0_rgba(255,255,255,0.18)]"
              >
                <ArrowUUpLeft
                  size="1.1em"
                  weight="regular"
                  aria-hidden
                />
              </motion.button>

              <span className="whitespace-nowrap px-2 text-sm font-semibold">
                Cancel Deletion
              </span>

              <motion.span
                layout
                aria-hidden
                className="relative grid size-10 place-items-center overflow-hidden rounded-full bg-red-600 text-sm font-bold tabular-nums text-white shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05),inset_0_2px_0_rgba(255,255,255,0.3)] dark:bg-red-500 dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05),inset_0_2px_0_rgba(255,255,255,0.18)]"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={count}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            </motion.div>
          )}

          {status === "deleted" && (
            <motion.div
              key="deleted"
              role="status"
              aria-live="polite"
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={transition}
              className="flex items-center gap-2 rounded-full border border-stone-300 bg-stone-200 px-5 py-3 text-sm font-semibold text-stone-600 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05),inset_0_2px_0_rgba(255,255,255,0.65)] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.05),inset_0_2px_0_rgba(255,255,255,0.15)]"
            >
              <span className="grid size-5 place-items-center rounded-full bg-stone-500 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.3)] dark:bg-stone-600 dark:shadow-[inset_0_2px_0_rgba(255,255,255,0.15)]">
                <Check size="0.9em" weight="regular" aria-hidden />
              </span>
              Account Deleted
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
