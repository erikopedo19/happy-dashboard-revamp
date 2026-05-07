
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModernTimeSlotProps {
  time: string;
  isSelected: boolean;
  isAvailable: boolean;
  isOccupied?: boolean;
  appointmentColor?: string;
  onClick: () => void;
  className?: string;
}

const ModernTimeSlot = ({ 
  time, 
  isSelected, 
  isAvailable, 
  isOccupied = false,
  appointmentColor = "bg-blue-500",
  onClick, 
  className 
}: ModernTimeSlotProps) => {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        // Base styles with consistent height and modern design
        "h-12 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 relative overflow-hidden",
        
        // Available state
        isAvailable && !isSelected && !isOccupied && [
          "bg-white/90 backdrop-blur-sm border-apple-gray-200 text-apple-gray-700",
          "hover:bg-apple-gray-50 hover:border-apple-gray-300 hover:shadow-apple",
          "active:scale-95"
        ],
        
        // Selected state
        isSelected && [
          "bg-gradient-blue text-white border-transparent shadow-apple-hover",
          "hover:opacity-90"
        ],
        
        // Occupied state
        isOccupied && !isSelected && [
          "bg-apple-gray-100 border-apple-gray-200 text-apple-gray-500",
          "cursor-not-allowed opacity-60"
        ],
        
        // Unavailable state
        !isAvailable && !isOccupied && [
          "bg-apple-gray-50 border-apple-gray-100 text-apple-gray-400",
          "cursor-not-allowed opacity-50"
        ],
        
        className
      )}
      disabled={!isAvailable || isOccupied}
      onClick={onClick}
    >
      {/* Color indicator line for occupied slots */}
      {isOccupied && (
        <div 
          className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", appointmentColor)}
        />
      )}
      
      {/* Time display */}
      <span className="relative z-10">{time}</span>
      
      {/* Subtle gradient overlay for depth */}
      {(isAvailable && !isOccupied) && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none" />
      )}
    </Button>
  );
};

export default ModernTimeSlot;
