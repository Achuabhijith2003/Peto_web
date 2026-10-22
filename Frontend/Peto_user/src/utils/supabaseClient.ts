import { createClient } from "@supabase/supabase-js";

interface PetoWindowConfig {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

declare global {
  interface Window {
    __PETO_CONFIG__?: PetoWindowConfig;
  }
}

// 1. Read runtime config injected by backend Express into index.html
// 2. Fall back to Vite build-time environment variables
// 3. Fall back to local development defaults
const runtimeConfig = typeof window !== "undefined" ? window.__PETO_CONFIG__ : undefined;

export const supabaseUrl =
  runtimeConfig?.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ednleoavhuxlarnnlmkq.supabase.co";

export const supabaseAnonKey =
  runtimeConfig?.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbmxlb2F2aHV4bGFybm5sbWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mjk3MjksImV4cCI6MjA5NjMwNTcyOX0.nzIVnlnd-di9zPc99AbFk6wDFntcM9j8AuMoHpBw3c8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

