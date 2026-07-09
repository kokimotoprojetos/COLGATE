import { createClient } from '@supabase/supabase-js';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
};

const supabaseUrl = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseAnonKey = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase URL or Anon Key is missing. Check your environment variables (.env.local).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
