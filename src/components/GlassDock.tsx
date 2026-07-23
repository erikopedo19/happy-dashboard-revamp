"use client";

// Adapted from shadcn registry: glass-tab-bar
// Original used @phosphor-icons/react; swapped to lucide-react and made reusable.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

export interface DockItem {
  label: string;
  icon: ComponentType<{ className?: string; size?: number | string; style?: React.CSSProperties }>;
  to?: string;
  onClick?: () => void;
  color?: string;
}

interface GlassDockProps {
  items: DockItem[];
  activeIndex: number;
  className?: string;
}

const MotionLink = motion(Link);

const defaultColor = "#FF375F";

export const GlassDock = ({ items, activeIndex, className }: GlassDockProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-[max(env(safe-area-inset-bottom),0.7rem)]",
        className
      )}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="pointer-events-auto relative isolate mx-auto flex w-[min(380px,calc(100vw-2rem))] items-center justify-around rounded-full px-5 py-2.5"
        style={{
          background: "rgba(28, 28, 30, 0.72)",
          border: "1px solid rgba(255, 255, 255, 0.11)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[-1] rounded-full"
          style={{ backdropFilter: "blur(24px) saturate(1.8)", WebkitBackdropFilter: "blur(24px) saturate(1.8)" }}
        />
        {items.map((item, i) => {
          const Icon = item.icon;
          const isActive = activeIndex === i;
          const isHover = hovered === i && !isActive;
          const color = item.color || defaultColor;
          const itemTextColor = isActive
            ? color
            : isHover
            ? "rgba(255,255,255,0.7)"
            : "rgba(255,255,255,0.32)";

          const content = (
            <div
              className="relative z-10 flex flex-col items-center gap-px"
              style={{
                transform:
                  i === 0 ? "translateX(-4px)" : i === items.length - 1 ? "translateX(4px)" : undefined,
              }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Icon
                  size={20}
                  style={{ color: itemTextColor, transition: "color 0.2s ease" }}
                />
              </motion.div>
              <span
                className="text-[10px] font-medium"
                style={{ color: itemTextColor, transition: "color 0.2s ease" }}
              >
                {item.label}
              </span>
            </div>
          );

          return item.to ? (
            <MotionLink
              key={item.label}
              to={item.to}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              whileTap={{ scale: 0.85 }}
              className="relative flex cursor-pointer flex-col items-center gap-[3px] px-3 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-glow"
                  className={cn(
                    "absolute -inset-y-1 rounded-full",
                    i === 0 ? "-left-5 -right-3" : i === items.length - 1 ? "-left-3 -right-5" : "-inset-x-3"
                  )}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              {content}
            </MotionLink>
          ) : (
            <motion.button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick?.();
              }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              whileTap={{ scale: 0.85 }}
              className="relative flex cursor-pointer flex-col items-center gap-[3px] px-3 py-1"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-glow"
                  className={cn(
                    "absolute -inset-y-1 rounded-full",
                    i === 0 ? "-left-5 -right-3" : i === items.length - 1 ? "-left-3 -right-5" : "-inset-x-3"
                  )}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              {content}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};
