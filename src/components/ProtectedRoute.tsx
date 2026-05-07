
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);
  const [hasRole, setHasRole] = React.useState(false);
  const location = window.location;

  React.useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setIsCheckingRole(false);
        return;
      }

      // Check metadata first (faster, available on user object)
      if (user.user_metadata?.role) {
        setHasRole(true);
        setIsCheckingRole(false);
        return;
      }

      try {
        // Fallback to database check
        const { supabase } = await import('@/integrations/supabase/client');

        const { data, error } = await supabase
          .from('profiles')
          .select('role' as any)
          .eq('id', user.id)
          .single();

        if ((data as any)?.role) {
          setHasRole(true);
        }
      } catch (error) {
        console.error('Error checking role:', error);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkRole();
  }, [user]);

  if (loading || isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no role and is not already on the choose-role page, redirect them
  if (!hasRole && location.pathname !== '/choose-role') {
    return <Navigate to="/choose-role" replace />;
  }

  // If user has a role and tries to access choose-role, redirect to dashboard (optional but good UX)
  if (hasRole && location.pathname === '/choose-role') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
