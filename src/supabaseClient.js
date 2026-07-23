import { createClient } from '@supabase/supabase-js';

// Sem o /rest/v1/ no final! Apenas o link base.
const supabaseUrl = 'https://knwdhkwomjawbogcsriq.supabase.co';
const supabaseAnonKey = 'sb_publishable_i5wd6dJDkMyNJmH2M8nXIg_XBBqM0GL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);