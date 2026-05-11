import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Users, Settings, MoreHorizontal, Globe, UserCheck, Package, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Dock: keep it to 4 items for thumb reach on phones.
const dockItems: NavItem[] = [
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Services', icon: Scissors, path: '/services' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

// "More" popup: non-dock pages (Admin first).
const moreItems: NavItem[] = [
  { label: 'Admin', icon: LayoutDashboard, path: '/admin' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Booking', icon: Globe, path: '/booking-page' },
  { label: 'Stylists', icon: UserCheck, path: '/stylists' },
  { label: 'Teams', icon: Briefcase, path: '/teams' },
  { label: 'Products', icon: Package, path: '/products' },
];

export const MobileDock = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-gray-200 dark:border-[#2C2C2E] pb-safe">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {dockItems.map((item) => {
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
        
        {/* More popup for non-dock pages */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200",
                // "More" doesn't represent a route, so keep it neutral.
                "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
              aria-label="More"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <DropdownMenuItem
                  key={item.path}
                  onSelect={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-2",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-500" : "")} />
                  <span className="text-sm">{item.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
