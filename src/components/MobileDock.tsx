import { Link, useLocation, useNavigate } from 'react-router-dom';
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
        'relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-2xl transition-colors duration-300',
        isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="dock-active-pill"
          className="absolute inset-0 rounded-2xl bg-gradient-rose shadow-rose"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon className={cn('relative z-10 h-5 w-5 transition-transform duration-300', isActive && 'scale-110')} />
      <span className={cn('relative z-10 text-[10px] font-medium', isActive && 'font-semibold')}>
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
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="relative bg-card/85 backdrop-blur-2xl border-t border-border/60">
        <div className="grid grid-cols-6 items-center px-2 py-2 max-w-lg mx-auto">
          {mainItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More"
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-2xl text-muted-foreground hover:text-foreground active:scale-95 transition-all"
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
