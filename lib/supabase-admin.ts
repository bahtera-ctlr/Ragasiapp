import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client — server-side only (service role key).
 * Falls back to placeholder strings so createClient() does not throw at module
 * init time when SUPABASE_SERVICE_ROLE_KEY is absent (e.g. client bundle or
 * missing Vercel env var). API calls will still fail with an auth error, which
 * each server action handles gracefully.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
