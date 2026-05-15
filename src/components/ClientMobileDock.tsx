import { Link, useLocation } from 'react-router-dom';
import { Search, Calendar, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { label: 'Explore', icon: Search, path: '/find-barber' },
  { label: 'Bookings', icon: Calendar, path: '/my-bookings' },
  { label: 'Favorites', icon: Heart, path: '/favorites' },
  { label: 'Profile', icon: User, path: '/me' },
];

export const ClientMobileDock = () => null;

export const ClientMobileDockInner = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-black/5 dark:border-white/5 pb-safe">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
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
                'flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 active:scale-95',
                isActive
                  ? 'text-[#007AFF] dark:text-[#0A84FF]'
                  : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
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
