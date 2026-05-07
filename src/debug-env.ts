// Debug script to check env vars
console.log('=== ENV DEBUG ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Set (hidden)' : 'NOT SET');
console.log('All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
