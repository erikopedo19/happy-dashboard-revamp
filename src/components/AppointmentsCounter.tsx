import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// Hook to get appointments count - can be used in other components
export function useAppointmentsCount() {
  const { user } = useAuth();

  const { data: count = 0, isLoading } = useQuery<number>({
    queryKey: ["appointments_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await db
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  return { count, isLoading };
}

// Component that displays the count
export function AppointmentsCounter() {
  const { count, isLoading } = useAppointmentsCount();

  if (isLoading) return <span>Loading...</span>;

  return <span>{count}</span>;
}

export default AppointmentsCounter;
