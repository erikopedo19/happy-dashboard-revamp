// Quick test - add this to any component temporarily
import { supabase } from '@/integrations/supabase/client';

export async function testOrg() {
  const { data, error } = await (supabase as any)
    .from('organizations')
    .select('*')
    .limit(1);
    
  console.log('Org test:', { data, error });
  return { data, error };
}
