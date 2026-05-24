import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FunnelStage {
  label: string;
  value: number;
  displayValue: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  color?: string;
}

export function FunnelChart({ data, color = "var(--chart-3, #38bdf8)" }: FunnelChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="space-y-2">
        {data.map((stage, index) => {
          const widthPercent = (stage.value / maxValue) * 100;
          const isHovered = hoveredIndex === index;
          const prevValue = index > 0 ? data[index - 1].value : stage.value;
          const conversionRate = index > 0 ? Math.round((stage.value / prevValue) * 100) : 100;

          return (
            <motion.div
              key={stage.label}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3">
                {/* Label */}
                <div className="w-20 shrink-0 text-right">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isHovered ? "text-[#1C1C1E] dark:text-[#F2F2F7]" : "text-[#8E8E93]"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex-1 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] relative overflow-hidden flex items-center">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-xl"
                    style={{
                      background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span
                    className={cn(
                      "relative z-10 ml-3 text-sm font-semibold transition-colors",
                      widthPercent > 40
                        ? "text-white"
                        : "text-[#1C1C1E] dark:text-[#F2F2F7]"
                    )}
                  >
                    {stage.displayValue}
                  </span>
                </div>

                {/* Conversion rate */}
                {index > 0 && (
                  <div className="w-14 shrink-0 text-right">
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        isHovered ? "text-sky-500" : "text-[#8E8E93]"
                      )}
                    >
                      {conversionRate}%
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4">
        {data.map((stage, index) => (
          <button
            key={stage.label}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-100"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4 }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[#8E8E93]">
              {stage.label}: {stage.displayValue}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
