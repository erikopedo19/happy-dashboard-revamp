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
  /** Rendered as a separate, detached circular button next to the dock pill. */
  trailing?: DockItem;
  trailingActive?: boolean;
}

const defaultColor = "#FF375F";

export const GlassDock = ({ items, activeIndex, className, trailing, trailingActive }: GlassDockProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const navigate = useNavigate();

  const TrailingIcon = trailing?.icon;

  return (
    <div
      data-glass-dock
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-[max(env(safe-area-inset-bottom),0.7rem)] transition-opacity duration-200 [body.stories-open_&]:opacity-0 [body.stories-open_&]:pointer-events-none",
        className
      )}
    >
      <div className="mx-auto flex w-[min(400px,calc(100vw-1.5rem))] items-stretch justify-center gap-2.5">
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.8 }}
        className="pointer-events-auto relative isolate flex flex-1 items-center justify-around overflow-hidden rounded-full px-3 py-2"
        style={{
          background: "rgba(28, 28, 30, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[-1] rounded-full"
          style={{ backdropFilter: "blur(32px) saturate(2.2)", WebkitBackdropFilter: "blur(32px) saturate(2.2)" }}
        />
        {/* Inner shine gradient for liquid glass effect */}
        <div
          className="pointer-events-none absolute inset-0 z-[-1] rounded-full opacity-40"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
          }}
        />
        {/* Specular top highlight — SwiftUI glass material */}
        <div
          className="pointer-events-none absolute left-1/2 right-1/2 top-0 h-px -translate-x-1/2 w-1/2 rounded-full"
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
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="relative flex cursor-pointer flex-col items-center gap-[3px] rounded-full px-4 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-glow"
                  className="absolute -inset-y-1 -inset-x-2 rounded-full overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                >
                  {/* Subtle inner shine for active tab */}
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
                    }}
                  />
                </motion.div>
              )}
              {content}
            </motion.button>
          );

        })}
      </motion.div>

      {trailing && TrailingIcon && (
        <div className="pointer-events-auto flex items-center justify-center self-stretch">
          <motion.button
            type="button"
            initial={{ y: 28, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.7, delay: 0.05 }}
            whileTap={{ scale: 0.9 }}
            aria-label={trailing.label}
            onClick={() => {
              if (trailing.to) navigate(trailing.to);
              trailing.onClick?.();
            }}
            className="flex h-full w-auto aspect-square items-center justify-center rounded-full"
            style={{
              background: "rgba(28, 28, 30, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(32px) saturate(2.2)",
              WebkitBackdropFilter: "blur(32px) saturate(2.2)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.14)",
            }}
          >
            <TrailingIcon
              size={22}
              style={{
                color: trailingActive ? trailing.color || defaultColor : "rgba(255,255,255,0.75)",
                transition: "color 0.2s ease",
              }}
            />
          </motion.button>
        </div>
      )}
      </div>
    </div>
  );
};
