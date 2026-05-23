import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Settings, MoreHorizontal, Globe, UserCheck, Package, Briefcase, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
}

const mainItems: NavItem[] = [
  { label: 'Admin', icon: LayoutDashboard, path: '/admin' },
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
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
  const isActive =
    location.pathname === item.path ||
    (item.path !== '/admin' && location.pathname.startsWith(item.path + '/'));
  return (
    <Link
      to={item.path}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl transition-all duration-300 active:scale-95',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="dock-active-pill"
          className="absolute inset-x-1 top-1 bottom-1 rounded-2xl bg-foreground/8 dark:bg-white/10"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon className={cn('relative z-10 h-5 w-5 transition-transform duration-300', isActive && 'scale-105')} />
      <span className={cn('relative z-10 text-[9px] font-medium tracking-[-0.03em]', isActive && 'font-semibold')}>
        {item.label}
      </span>
    </Link>
  );
};

export const MobileDock = () => null;

export const MobileDockInner = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pointer-events-none">
      <div className="relative mx-auto max-w-lg rounded-[28px] border border-black/5 dark:border-white/10 bg-white/78 dark:bg-[#1c1c1e]/78 shadow-[0_14px_45px_rgba(0,0,0,0.16)] backdrop-blur-2xl pointer-events-auto">
        <div className="grid grid-cols-6 items-center px-1.5 py-1.5">
          {mainItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More"
                className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[9px] font-medium tracking-[-0.03em]">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mb-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/');
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onSelect={() => navigate(item.path)}
                    className={cn('flex items-center gap-2', isActive && 'bg-accent text-accent-foreground')}
                  >
                    <Icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                    <span className="text-sm">{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
