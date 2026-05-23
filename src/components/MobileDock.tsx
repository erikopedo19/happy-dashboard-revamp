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
  accent: string;
}

// Dock: keep it to 4 items for thumb reach on phones.
const dockItems: NavItem[] = [
  { label: 'Agenda', icon: Calendar, path: '/agenda', accent: 'from-[#d60052] to-rose-500' },
  { label: 'Reports', icon: BarChart3, path: '/reports', accent: 'from-emerald-500 to-teal-400' },
  { label: 'Services', icon: Scissors, path: '/services', accent: 'from-amber-500 to-orange-400' },
  { label: 'Settings', icon: Settings, path: '/settings', accent: 'from-violet-500 to-fuchsia-500' },
];

// "More" popup: non-dock pages (Admin first).
const moreItems: NavItem[] = [
  { label: 'Admin', icon: LayoutDashboard, path: '/admin', accent: 'from-[#d60052] to-rose-500' },
  { label: 'Customers', icon: Users, path: '/customers', accent: 'from-sky-500 to-cyan-400' },
  { label: 'Booking', icon: Globe, path: '/booking-page', accent: 'from-emerald-500 to-teal-400' },
  { label: 'Stylists', icon: UserCheck, path: '/stylists', accent: 'from-violet-500 to-fuchsia-500' },
  { label: 'Teams', icon: Briefcase, path: '/teams', accent: 'from-amber-500 to-orange-400' },
  { label: 'Products', icon: Package, path: '/products', accent: 'from-indigo-500 to-blue-500' },
];

export const MobileDock = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe">
      <div className="mb-3 flex items-center justify-around gap-1 rounded-[1.75rem] border border-[#d60052]/15 bg-white/90 px-2 py-2 shadow-[0_18px_45px_rgba(214,0,82,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#18171c]/95 max-w-lg mx-auto">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-2 transition-all duration-200",
                isActive
                  ? "text-white shadow-lg"
                  : "text-gray-500 dark:text-gray-400 hover:text-[#d60052] dark:hover:text-rose-300"
              )}
            >
              {isActive && <span className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br", item.accent)} />}
              <Icon className={cn("relative h-5 w-5", isActive && "scale-110")} />
              <span className={cn("relative text-[10px] font-medium", isActive && "font-semibold")}>
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
                "flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-2 transition-all duration-200",
                // "More" doesn't represent a route, so keep it neutral.
                "text-gray-500 dark:text-gray-400 hover:bg-[#d60052]/10 hover:text-[#d60052] dark:hover:text-rose-300"
              )}
              aria-label="More"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl border-[#d60052]/15 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:bg-[#18171c]/95">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <DropdownMenuItem
                  key={item.path}
                  onSelect={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl",
                    isActive && "bg-[#d60052]/10 text-[#d60052] dark:text-rose-300"
                  )}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white", item.accent)}>
                    <Icon className="h-4 w-4" />
                  </span>
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
