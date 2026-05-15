/**
 * Server-only Supabase client.
 *
 * Used exclusively by Next.js API routes and server components.
 * Unlike the browser client in `supabase.ts`, this file reads
 * `SUPABASE_URL` and `SUPABASE_ANON_KEY` (no NEXT_PUBLIC_ prefix),
 * so the values are never shipped to the browser JS bundle.
 *
 * For operations that need elevated privileges (e.g. inserting
 * inspection cache rows), pass `{ serviceRole: true }`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _anonClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getServerSupabase(
  opts?: { serviceRole?: boolean }
): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  if (opts?.serviceRole) {
    if (_serviceClient) return _serviceClient;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return null;
    _serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return _serviceClient;
  }

  if (_anonClient) return _anonClient;
  const anon =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return null;
  _anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anonClient;
}
