import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        const result = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        // Check if it's the stub client (has eq method) or real response
        if ('eq' in result) {
          setStatus('error');
          setError('Supabase not configured - check .env.local');
          return;
        }
        
        if (result.error) {
          setStatus('error');
          setError(result.error.message);
        } else {
          setStatus('connected');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    checkConnection();
  }, []);

  if (status === 'checking') return <span>Checking Supabase...</span>;
  if (status === 'error') return <span style={{ color: 'red' }}>❌ {error}</span>;
  return <span style={{ color: 'green' }}>✅ Supabase connected</span>;
}
