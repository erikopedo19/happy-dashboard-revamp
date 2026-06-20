import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Settings, MoreHorizontal, Globe, UserCheck, Package, Briefcase, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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
        'relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 transition-transform duration-150 active:scale-95',
        isActive
          ? 'text-[#e11d48]'
          : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]'
      )}
    >
      {isActive && (
        <motion.span
          layoutId="admin-dock-active"
          className="absolute inset-x-1 top-1 h-8 rounded-2xl bg-rose-50 dark:bg-rose-500/10"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className={cn('relative h-5 w-5 transition-transform', isActive && 'scale-110')} />
      <span className={cn('relative text-[10px] font-medium', isActive && 'font-semibold')}>
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
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-[max(env(safe-area-inset-bottom),0.8rem)]">
      <div className="pointer-events-auto relative mx-auto max-w-[34rem] rounded-[30px] border border-black/5 bg-white/88 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1C1C1E]/92">
        <div className="grid grid-cols-6 items-center px-2 py-2">
          {mainItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More"
                className="flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[#8E8E93] transition-transform active:scale-95 hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
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
                    <Icon className={cn('h-4 w-4', isActive && 'text-[#e11d48]')} />
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
