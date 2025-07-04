// src/lib/supabaseClient.ts
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
});

export default supabase;
