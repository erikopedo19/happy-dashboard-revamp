import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Users, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Services', icon: Scissors, path: '/services' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export const MobileDock = () => {
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-gray-200 dark:border-[#2C2C2E] pb-safe">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* More button for additional items */}
        <Link
          to="/more"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200",
            location.pathname === '/more' || location.pathname.startsWith('/more/')
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </Link>
      </div>
    </div>
  );
};
