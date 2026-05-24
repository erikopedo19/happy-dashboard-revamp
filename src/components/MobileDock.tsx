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
  accent: string;
}

const mainItems: NavItem[] = [
  { label: 'Admin', icon: LayoutDashboard, path: '/admin', accent: 'from-[#d60052] to-rose-500' },
  { label: 'Agenda', icon: Calendar, path: '/agenda', accent: 'from-emerald-500 to-teal-400' },
  { label: 'Reports', icon: BarChart3, path: '/reports', accent: 'from-amber-500 to-orange-400' },
  { label: 'Services', icon: Scissors, path: '/services', accent: 'from-violet-500 to-fuchsia-500' },
  { label: 'Settings', icon: Settings, path: '/settings', accent: 'from-sky-500 to-cyan-400' },
];

const moreItems: NavItem[] = [
  { label: 'Customers', icon: Users, path: '/customers', accent: 'from-sky-500 to-cyan-400' },
  { label: 'Booking', icon: Globe, path: '/booking-page', accent: 'from-emerald-500 to-teal-400' },
  { label: 'Stylists', icon: UserCheck, path: '/stylists', accent: 'from-violet-500 to-fuchsia-500' },
  { label: 'Teams', icon: Briefcase, path: '/teams', accent: 'from-amber-500 to-orange-400' },
  { label: 'Products', icon: Package, path: '/products', accent: 'from-indigo-500 to-blue-500' },
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
        'relative flex min-w-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-colors duration-300',
        isActive ? 'text-white' : 'text-muted-foreground hover:text-[#d60052] dark:hover:text-rose-300'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="dock-active-pill"
          className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br shadow-rose', item.accent)}
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

export const MobileDock = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe">
      <div className="mb-3 rounded-[1.75rem] border border-[#d60052]/15 bg-white/90 shadow-[0_18px_45px_rgba(214,0,82,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#18171c]/95 max-w-lg mx-auto">
        <div className="grid grid-cols-6 items-center gap-1 px-2 py-2">
          {mainItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More"
                className="flex min-w-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-muted-foreground transition-all hover:bg-[#d60052]/10 hover:text-[#d60052] active:scale-95 dark:hover:text-rose-300"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mb-2 w-52 rounded-2xl border-[#d60052]/15 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:bg-[#18171c]/95">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/');
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onSelect={() => navigate(item.path)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl',
                      isActive && 'bg-[#d60052]/10 text-[#d60052] dark:text-rose-300'
                    )}
                  >
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white', item.accent)}>
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
    </div>
  );
};
