import { createClient } from '@supabase/supabase-js';

// Utilizziamo le chiavi che hai fornito nella chat
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfsqfabxhibpawfqxdow.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmc3FmYWJ4aGlicGF3ZnF4ZG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjk2NjEsImV4cCI6MjA5MjcwNTY2MX0.L7EWhLvHrUKoYKpASoHxGi8-CPps4CvTzfaoe3ObaEU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
