import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Scissors, Settings, MoreHorizontal, Globe, UserCheck, Package, Briefcase, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
  isNew?: boolean;
}

const mainItems: NavItem[] = [
  { label: 'Admin', icon: LayoutDashboard, path: '/admin' },
  { label: 'Agenda', icon: Calendar, path: '/agenda' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const moreItems: NavItem[] = [
  { label: 'Services', icon: Scissors, path: '/services' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Booking', icon: Globe, path: '/booking-page' },
  { label: 'Stylists', icon: UserCheck, path: '/stylists' },
  { label: 'Teams', icon: Briefcase, path: '/teams', isNew: true },
  { label: 'Products', icon: Package, path: '/products', isNew: true },
];

const MoreOverlay = ({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Lock body scroll while the overlay is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="more-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-[100]"
          style={{
            background: 'rgba(6, 6, 10, 0.62)',
            backdropFilter: 'saturate(160%) blur(22px)',
            WebkitBackdropFilter: 'saturate(160%) blur(22px)',
          }}
          onClick={onClose}
        >
          {/* Soft ambient glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[#f43f5e]/20 blur-[110px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="pointer-events-none absolute bottom-24 -left-20 h-80 w-80 rounded-full bg-[#fb923c]/10 blur-[120px]"
          />

          {/* Menu items — bottom right, slide up staggered */}
          <div
            className="absolute bottom-0 right-0 flex flex-col items-end gap-1.5 px-7 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, i) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + '/');
              return (
                <motion.button
                  key={item.path}
                  type="button"
                  initial={{ opacity: 0, y: 46, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 32,
                    delay: 0.05 + (moreItems.length - 1 - i) * 0.045,
                  }}
                  onClick={() => {
                    onClose();
                    navigate(item.path);
                  }}
                  className="group flex items-center gap-3 py-1 text-right active:scale-[0.97] transition-transform"
                >
                  <span
                    className={cn(
                      'text-[34px] font-bold tracking-tight leading-[1.25]',
                      item.isNew
                        ? 'nav-shimmer-new'
                        : isActive
                        ? 'text-[#FF375F]'
                        : 'text-white'
                    )}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* Close button */}
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, delay: 0.16 }}
              onClick={onClose}
              className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/12 border border-white/10 text-white active:scale-90 transition-transform"
              style={{
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useAuth();

  const { data: services = [] } = useQuery({
    queryKey: ['dock-services', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('services')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const hasServices = services.length > 0;
  const visibleMoreItems = hasServices ? moreItems : moreItems.filter((item) => item.label !== 'Services');

  return (
    <>
      <MoreOverlay open={moreOpen} onClose={() => setMoreOpen(false)} items={visibleMoreItems} />
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-2.5 pb-[max(env(safe-area-inset-bottom),0.7rem)]">
        <div className="mobile-dock pointer-events-auto mx-auto flex max-w-[26rem] items-stretch justify-between rounded-[28px] px-1.5 py-1.5 backdrop-blur-2xl">
          {mainItems.map((item) => (
            <DockLink key={item.path} item={item} location={location} />
          ))}

          <button
            type="button"
            aria-label="More"
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2 text-[#8E8E93] transition-transform active:scale-95 hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </div>
    </>
  );
};
