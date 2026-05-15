import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Settings, MoreHorizontal, Globe, UserCheck, Package, Briefcase, Users } from 'lucide-react';
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

// Two items on each side of the central Admin FAB.
const leftItems: NavItem[] = [
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
];
const rightItems: NavItem[] = [
  { label: 'Services', icon: Scissors, path: '/services' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const moreItems: NavItem[] = [
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Booking', icon: Globe, path: '/booking-page' },
  { label: 'Stylists', icon: UserCheck, path: '/stylists' },
  { label: 'Teams', icon: Briefcase, path: '/teams' },
  { label: 'Products', icon: Package, path: '/products' },
];

const DockLink = ({ item, location }: { item: NavItem; location: ReturnType<typeof useLocation> }) => {
  const Icon = item.icon;
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  return (
    <Link
      to={item.path}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 active:scale-95",
        isActive
          ? "text-[#FF2D55]"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      )}
    >
      <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
      <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.label}</span>
    </Link>
  );
};

// Old per-page mount: now no-op (PersistentDock handles rendering globally)
export const MobileDock = () => null;

export const MobileDockInner = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const adminActive = location.pathname.startsWith('/admin');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glass dock background */}
      <div className="relative bg-white/80 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-gray-200 dark:border-[#2C2C2E]">
        {/* Floating Admin FAB — sits centered over the dock */}
        <Link
          to="/admin"
          aria-label="Admin"
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -top-7 z-10",
            "w-14 h-14 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-[#FF2D55] via-[#FF375F] to-[#A21CAF]",
            "shadow-[0_10px_30px_-8px_rgba(255,45,85,0.55)]",
            "ring-4 ring-white/80 dark:ring-[#1C1C1E]/95",
            "transition-transform duration-200 active:scale-95",
            adminActive && "animate-pulse"
          )}
        >
          <LayoutDashboard className="h-6 w-6 text-white drop-shadow" />
        </Link>

        <div className="grid grid-cols-5 items-center px-2 py-2 max-w-lg mx-auto">
          {leftItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}

          {/* Spacer for the FAB */}
          <div aria-hidden className="flex flex-col items-center justify-end pt-6">
            <span className={cn(
              "text-[10px] font-medium",
              adminActive ? "text-[#FF2D55] font-semibold" : "text-gray-500 dark:text-gray-400"
            )}>
              Admin
            </span>
          </div>

          {rightItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}
        </div>

        {/* Floating "more" button at bottom-right edge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More"
              className="absolute right-3 -top-4 w-9 h-9 rounded-full bg-white dark:bg-[#2C2C2E] shadow-md border border-gray-200 dark:border-[#3A3A3C] flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <DropdownMenuItem
                  key={item.path}
                  onSelect={() => navigate(item.path)}
                  className={cn("flex items-center gap-2", isActive && "bg-accent text-accent-foreground")}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-[#FF2D55]")} />
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
