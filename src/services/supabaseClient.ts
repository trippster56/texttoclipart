import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Create a single supabase client for the entire app
let supabase: SupabaseClient;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.token'
    },
    global: {
      headers: {
        'X-Client-Info': 'clipart-app/1.0.0'
      }
    }
  });
  
  console.log('Supabase client initialized successfully');
} catch (error) {
  const errorMessage = 'Failed to initialize Supabase client';
  console.error(errorMessage, error);
  throw new Error(errorMessage);
}

export { supabase };
