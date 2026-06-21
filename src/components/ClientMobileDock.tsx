import { Link, useLocation } from 'react-router-dom';
import { Search, Calendar, Heart, User, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Explore', icon: Search, path: '/find-barber' },
  { label: 'Map', icon: MapIcon, path: '/find-barber?tab=map' },
  { label: 'Bookings', icon: Calendar, path: '/my-bookings' },
  { label: 'Favorites', icon: Heart, path: '/favorites' },
  { label: 'Profile', icon: User, path: '/me' },
];

export const ClientMobileDock = () => null;

export const ClientMobileDockInner = () => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab');

  const isItemActive = (path: string) => {
    const [base, query] = path.split('?');
    const itemTab = query ? new URLSearchParams(query).get('tab') : null;
    const pathMatches =
      location.pathname === base ||
      (base !== '/' && location.pathname.startsWith(base + '/'));
    if (!pathMatches) return false;
    if (itemTab) return currentTab === itemTab;
    // Base item only active when no tab query (so Explore doesn't light up on ?tab=map)
    if (base === '/find-barber') return !currentTab;
    return true;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-2.5 pb-[max(env(safe-area-inset-bottom),0.7rem)]">
      <div className="pointer-events-auto mx-auto flex max-w-[26rem] items-stretch justify-between rounded-[28px] border border-black/5 bg-white/90 px-1.5 py-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1C1C1E]/92">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2 transition-transform duration-150 active:scale-95',
                isActive
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="client-dock-active"
                  className="absolute inset-x-0.5 inset-y-0.5 rounded-2xl bg-rose-50 dark:bg-rose-500/15"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className={cn('relative h-[18px] w-[18px] transition-transform', isActive && 'scale-110')} />
              <span className={cn('relative text-[10px] font-medium leading-none', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ClientMobileDock;
