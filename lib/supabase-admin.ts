import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client for Server-Side Operations
 * Uses SERVICE ROLE KEY for elevated privileges (auth.admin, direct access without RLS)
 * Should ONLY be used in server-side code (API routes, server actions)
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
