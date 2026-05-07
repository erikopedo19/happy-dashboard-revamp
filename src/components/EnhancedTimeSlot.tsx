
import { Plus } from "lucide-react";

interface EnhancedTimeSlotProps {
  time: string;
  isOccupied: boolean;
  appointmentColor?: string;
  appointmentBorderColor?: string;
  appointmentTextColor?: string;
  onCreateAppointment?: () => void;
  className?: string;
}

const EnhancedTimeSlot = ({ 
  time, 
  isOccupied, 
  appointmentColor = "bg-blue-50",
  appointmentBorderColor = "border-blue-200",
  appointmentTextColor = "text-blue-600",
  onCreateAppointment,
  className 
}: EnhancedTimeSlotProps) => {
  return (
    <div className={`border-r border-slate-100 last:border-r-0 relative group min-h-[60px] transition-all duration-200 ${isOccupied ? "bg-slate-50/50" : "hover:bg-blue-50/30"} ${className}`}>
      {/* Color line indicator for occupied slots */}
      {isOccupied && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r-sm z-10" />
      )}
      
      {/* Time label for first column */}
      {time && (
        <div className="absolute -left-16 top-2 text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded shadow-sm border border-slate-200">
          {time}
        </div>
      )}
      
      {/* Add appointment button for empty slots */}
      {!isOccupied && onCreateAppointment && (
        <div className="h-full flex items-center justify-center transition-opacity duration-200">
          <button
            className="w-8 h-8 bg-transparent hover:bg-blue-100 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all duration-200 opacity-0 group-hover:opacity-100 border border-transparent hover:border-blue-200 hover:shadow-sm"
            onClick={onCreateAppointment}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedTimeSlot;
