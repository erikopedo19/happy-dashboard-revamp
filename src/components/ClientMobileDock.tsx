import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Calendar, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/60 pb-safe">
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
                'relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-colors duration-300',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="client-dock-active-pill"
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
        })}
      </div>
    </div>
  );
};

export default ClientMobileDock;
