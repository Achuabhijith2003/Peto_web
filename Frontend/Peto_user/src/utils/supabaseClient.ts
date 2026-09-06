import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ednleoavhuxlarnnlmkq.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbmxlb2F2aHV4bGFybm5sbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mjk3MjksImV4cCI6MjA5NjMwNTcyOX0.nzIVnlnd-di9zPc99AbFk6wDFntcM9j8AuMoHpBw3c8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
