import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Settings, MoreHorizontal, Globe, UserCheck, Package, Briefcase, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
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
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2 transition-transform duration-150 active:scale-95',
        isActive
          ? 'text-[#FF375F]'
          : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]'
      )}
    >
      {isActive && (
        <motion.span
          layoutId="admin-dock-active"
          className="absolute inset-x-0.5 inset-y-0.5 rounded-2xl bg-[#FF375F]/15"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className={cn('relative h-[18px] w-[18px] transition-transform', isActive && 'scale-110')} />
      <span className={cn('relative text-[10px] font-medium leading-none', isActive && 'font-semibold')}>
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
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-2.5 pb-[max(env(safe-area-inset-bottom),0.7rem)]">
      <div className="mobile-dock pointer-events-auto mx-auto flex max-w-[26rem] items-stretch justify-between rounded-[28px] px-1.5 py-1.5 backdrop-blur-2xl">
        {mainItems.map((item) => (
          <DockLink key={item.path} item={item} location={location} />
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More"
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2 text-[#8E8E93] transition-transform active:scale-95 hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium leading-none">More</span>
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
                    className={cn('flex items-center gap-2', isActive && 'bg-[#FF375F]/10 text-white')}
                  >
                    <Icon className={cn('h-4 w-4', isActive && 'text-[#FF375F]')} />
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
