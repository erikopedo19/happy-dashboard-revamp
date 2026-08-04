"use client";

// Adapted from shadcn registry: glass-tab-bar
// Original used @phosphor-icons/react; swapped to lucide-react and made reusable.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const defaultColor = "#FF375F";

export const GlassDock = ({ items, activeIndex, className }: GlassDockProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div
      data-glass-dock
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-[max(env(safe-area-inset-bottom),0.7rem)] transition-opacity duration-200 [body.stories-open_&]:opacity-0 [body.stories-open_&]:pointer-events-none",
        className
      )}
    >
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.8 }}
        className="pointer-events-auto relative isolate mx-auto flex w-[min(380px,calc(100vw-2rem))] items-center justify-around overflow-hidden rounded-[30px] px-4 py-2"
        style={{
          background:
            "linear-gradient(180deg, rgba(58,58,64,0.62) 0%, rgba(20,20,24,0.72) 100%)",
          border: "0.5px solid rgba(255,255,255,0.16)",
          boxShadow:
            "0 18px 40px -12px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[-1] rounded-[30px]"
          style={{ backdropFilter: "blur(40px) saturate(2.2)", WebkitBackdropFilter: "blur(40px) saturate(2.2)" }}
        />
        {/* Specular top highlight — SwiftUI glass material */}
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)" }}
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

          const handleClick = () => {
            if (item.to) navigate(item.to);
            item.onClick?.();
          };

          return (
            <motion.button
              key={item.label}
              type="button"
              onClick={handleClick}
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
