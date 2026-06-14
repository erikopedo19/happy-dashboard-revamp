import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { GuestBanner } from '@/components/GuestBanner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Guests are allowed to browse all pages. They will only be prompted to sign in
 * when they perform an action that requires the database (handled at action
 * sites via `useRequireAuth`). Logged-in users without a role still get sent
 * to /choose-role.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);
  const [hasRole, setHasRole] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        setIsCheckingRole(false);
        return;
      }
      if (user.user_metadata?.role) {
        if (!cancelled) {
          setHasRole(true);
          setIsCheckingRole(false);
        }
        return;
      }
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('profiles')
          .select('role' as any)
          .eq('id', user.id)
          .single();
        if (!cancelled && (data as any)?.role) setHasRole(true);
      } catch (e) {
        console.error('role check failed', e);
      } finally {
        if (!cancelled) setIsCheckingRole(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [user]);

  // Zero loading screens — render children optimistically while auth resolves.
  if (loading || (user && isCheckingRole)) {
    return (
      <>
        <GuestBanner />
        {children}
      </>
    );
  }

  // Guests: render the page in read-only browse mode with a sign-in banner.
  if (!user) {
    return (
      <>
        <GuestBanner />
        {children}
      </>
    );
  }

  // Authenticated but no role yet → finish onboarding.
  if (!hasRole && window.location.pathname !== '/choose-role') {
    // soft redirect via window to avoid pulling in extra deps
    window.location.replace('/choose-role');
    return null;
  }

  return <>{children}</>;
};
