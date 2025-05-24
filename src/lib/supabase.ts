// Re-export the supabase client from services to ensure a single instance is used
import { supabase } from '../services/supabaseClient';

export { supabase };
