import { Link } from "react-router-dom";
import {
  Calendar,
  BarChart3,
  Scissors,
  Settings as SettingsIcon,
  Users,
  Globe,
  UserCheck,
  Brush,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tile {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  gradient: string;
}

// 4 columns × 2 rows = 8 tiles, iOS Springboard-style.
const tiles: Tile[] = [
  { label: "Agenda", icon: Calendar, path: "/agenda", gradient: "from-[#FF2D55] to-[#FF375F]" },
  { label: "Reports", icon: BarChart3, path: "/reports", gradient: "from-[#34C759] to-[#30D158]" },
  { label: "Services", icon: Scissors, path: "/services", gradient: "from-[#FF9500] to-[#FFCC00]" },
  { label: "Settings", icon: SettingsIcon, path: "/settings", gradient: "from-[#8E8E93] to-[#48484A]" },
  { label: "Customers", icon: Users, path: "/customers", gradient: "from-[#5AC8FA] to-[#007AFF]" },
  { label: "Booking", icon: Globe, path: "/booking-page", gradient: "from-[#AF52DE] to-[#5856D6]" },
  { label: "Stylists", icon: UserCheck, path: "/stylists", gradient: "from-[#BF5AF2] to-[#FF2D55]" },
  { label: "Brand", icon: Brush, path: "/brand", gradient: "from-[#FF9F0A] to-[#FF453A]" },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 26 },
  },
};

export const MobileSpringboard = () => {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-4 gap-3 px-1"
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <motion.div key={tile.path} variants={item}>
            <Link
              to={tile.path}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              <div
                className={cn(
                  "w-full aspect-square rounded-[22px] bg-gradient-to-br shadow-md flex items-center justify-center",
                  tile.gradient
                )}
              >
                <Icon className="h-7 w-7 text-white drop-shadow" />
              </div>
              <span className="text-[11px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7] text-center leading-tight">
                {tile.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default MobileSpringboard;
