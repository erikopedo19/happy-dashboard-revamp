import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface WeekDateSelectorProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

export const WeekDateSelector = ({ 
  selectedDate = new Date(), 
  onDateSelect,
  className 
}: WeekDateSelectorProps) => {
  const [currentWeek, setCurrentWeek] = useState(selectedDate);

  const startOfCurrentWeek = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfCurrentWeek,
    end: endOfCurrentWeek
  }), [startOfCurrentWeek, endOfCurrentWeek]);

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleDateSelect = (date: Date) => {
    onDateSelect?.(date);
  };

  const handleKeyDown = (event: React.KeyboardEvent, date: Date) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDateSelect(date);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 bg-card/60 backdrop-blur-sm border border-border/50 p-3 rounded-xl shadow-lg",
        "dark:bg-[#2b2b2f] dark:shadow-[0_6px_18px_rgba(0,0,0,0.45)]",
        className
      )}
      role="toolbar" 
      aria-label="Week selector"
    >
      <button
        onClick={handlePreviousWeek}
        className={cn(
          "inline-flex items-center justify-center w-[34px] h-[34px]",
          "text-muted-foreground hover:text-foreground rounded-lg cursor-pointer",
          "transition-all duration-150 hover:bg-muted/20 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        )}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/20">
        <div className="flex gap-3 items-center min-w-fit" role="list">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateSelect(day)}
                onKeyDown={(e) => handleKeyDown(e, day)}
                className={cn(
                  // Base styles with proper touch targets
                  "relative inline-flex items-center justify-center",
                  "h-[36px] min-w-[56px] px-3 rounded-[10px]",
                  "text-[13px] font-semibold leading-[36px]",
                  "cursor-pointer transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                  // Touch target enhancement
                  "after:absolute after:-inset-1 after:rounded-[14px] after:pointer-events-none",
                  // Default state
                  "bg-transparent text-muted-foreground",
                  "hover:bg-muted/20 hover:text-foreground hover:-translate-y-0.5",
                  "active:translate-y-0 active:scale-95",
                  // Selected state
                  isSelected && [
                    "bg-[#3f4246] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)_inset]",
                    "hover:bg-[#454a4e] hover:text-white hover:-translate-y-0.5"
                  ],
                  // Today indicator (if not selected)
                  isToday && !isSelected && "ring-1 ring-primary/30"
                )}
                role="listitem"
                aria-pressed={isSelected}
                aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              >
                <span className="flex flex-col items-center">
                  <span className="text-[11px] opacity-80">
                    {format(day, 'EEE').toUpperCase()}
                  </span>
                  <span className="font-bold -mt-0.5">
                    {format(day, 'd')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleNextWeek}
        className={cn(
          "inline-flex items-center justify-center w-[34px] h-[34px]",
          "text-muted-foreground hover:text-foreground rounded-lg cursor-pointer",
          "transition-all duration-150 hover:bg-muted/20 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        )}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};