import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oietcsgsbklgqjatefxt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZXRjc2dzYmtsZ3FqYXRlZnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTg5NTAsImV4cCI6MjA2NDI5NDk1MH0.I_1HUJSBjclNsNNI69yr133UD-VZZCdAoMpLCBQb_ns'

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 