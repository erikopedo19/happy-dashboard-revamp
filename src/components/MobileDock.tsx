import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, BarChart3, Settings, MoreHorizontal, Globe, UserCheck, Briefcase, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassDock, type DockItem } from '@/components/GlassDock';

interface MoreItem {
  label: string;
  icon: any;
  path: string;
  isNew?: boolean;
}

const mainItems: DockItem[] = [
  { label: 'Admin', icon: LayoutDashboard, to: '/admin' },
  { label: 'Agenda', icon: Calendar, to: '/agenda' },
  { label: 'Reports', icon: BarChart3, to: '/reports' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

const moreItems: MoreItem[] = [
  { label: 'Services', icon: 'scissors', path: '/services' },
  { label: 'Customers', icon: 'users', path: '/customers' },
  { label: 'Booking', icon: 'globe', path: '/booking-page' },
  { label: 'Stylists', icon: 'user-check', path: '/stylists' },
  { label: 'Teams', icon: 'briefcase', path: '/teams', isNew: true },
];

const MoreOverlay = ({ open, onClose, items }: { open: boolean; onClose: () => void; items: MoreItem[] }) => {
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
                  initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 28,
                    delay: 0.04 + (moreItems.length - 1 - i) * 0.04,
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

  const glassItems: DockItem[] = [
    ...mainItems,
    { label: 'More', icon: MoreHorizontal, onClick: () => setMoreOpen(true) },
  ];

  const moreActive = visibleMoreItems.some(
    (item) => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'))
  );

  const activeIndex = moreActive
    ? mainItems.length
    : glassItems.findIndex((item) => {
        if (!item.to) return false;
        return location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to + '/'));
      });

  return (
    <>
      <MoreOverlay open={moreOpen} onClose={() => setMoreOpen(false)} items={visibleMoreItems} />
      <GlassDock items={glassItems} activeIndex={activeIndex >= 0 ? activeIndex : 0} />
    </>
  );
};
