import { createClient } from '@supabase/supabase-js';

// Substitui com os teus dados do painel do Supabase (Project Settings -> API)
const supabaseUrl = 'https://knwdhkwomjawbogcsriq.supabase.co/rest/v1/';
const supabaseAnonKey = 'sb_publishable_i5wd6dJDkMyNJmH2M8nXIg_XBBqM0GL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);