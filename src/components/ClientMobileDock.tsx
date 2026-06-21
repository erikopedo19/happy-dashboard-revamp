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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-[max(env(safe-area-inset-bottom),0.8rem)]">
      <div className="pointer-events-auto mx-auto flex max-w-[28rem] items-center justify-around rounded-[30px] border border-black/5 bg-white/88 px-2 py-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1C1C1E]/92">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex min-w-[4.1rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 transition-transform duration-150 active:scale-95',
                isActive
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="client-dock-active"
                  className="absolute inset-1 rounded-2xl bg-rose-50/90 shadow-sm dark:bg-rose-500/12"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className={cn('relative h-5 w-5 transition-transform', isActive && 'scale-110')} />
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
