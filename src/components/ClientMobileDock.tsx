import { useLocation } from 'react-router-dom';
import { Search, Calendar, Heart, User } from 'lucide-react';
import { GlassDock, type DockItem } from '@/components/GlassDock';

const navItems: DockItem[] = [
  { label: 'Explore', icon: Search, to: '/find-barber', color: '#FF375F' },
  { label: 'Bookings', icon: Calendar, to: '/my-bookings', color: '#0A84FF' },
  { label: 'Favorites', icon: Heart, to: '/favorites', color: '#AF52DE' },
  { label: 'Profile', icon: User, to: '/me', color: '#32ADE6' },
];

export const ClientMobileDock = () => null;

export const ClientMobileDockInner = () => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab');

  const isItemActive = (to: string) => {
    const [base, query] = to.split('?');
    const itemTab = query ? new URLSearchParams(query).get('tab') : null;
    const pathMatches =
      location.pathname === base ||
      (base !== '/' && location.pathname.startsWith(base + '/'));
    if (!pathMatches) return false;
    if (itemTab) return currentTab === itemTab;
    if (base === '/find-barber') return !currentTab;
    return true;
  };

  const activeIndex = navItems.findIndex((item) => item.to && isItemActive(item.to));

  return <GlassDock items={navItems} activeIndex={activeIndex >= 0 ? activeIndex : 0} />;
};

export default ClientMobileDock;
