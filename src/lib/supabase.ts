/**
 * Browser Supabase client.
 *
 * The site is a static export — there is no Next.js server runtime in
 * production. All data fetching happens here, in the browser, against
 * Supabase. The anon key is baked into the JS bundle on purpose: it has
 * limited permissions (only `select` on `public.cars`, governed by RLS),
 * so exposing it is safe by design.
 *
 * Required environment variables (build time):
 *   NEXT_PUBLIC_SUPABASE_URL       e.g. https://xyz.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  the project's anon/public key
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client, or null if env vars are missing.
 * Callers should treat null as "no backend configured" and fall back to
 * an empty result set rather than crashing the page.
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  if (!url || !anonKey) {
    if (typeof window !== "undefined") {
      // Visible only in the browser console; don't spam during SSR/build.
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY " +
          "are not set. /cars will render as if no listings exist."
      );
    }
    return null;
  }
  _client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "dreshaj-web" } },
  });
  return _client;
}

export const isSupabaseConfigured = Boolean(url && anonKey);
