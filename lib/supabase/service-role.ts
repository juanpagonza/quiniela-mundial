import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Service-role Supabase client. Bypasses RLS, so use sparingly and only from
 * server code that has already authorized the caller. Used for:
 *   - Importing the fixture (writes equipos, which has no admin-write RLS policy)
 *   - Cron job sync (no auth context, needs full DB access)
 *   - Audit log inserts
 *
 * `server-only` makes the bundler error out if this module ever gets imported
 * from a Client Component — that would leak the service-role key to the browser.
 *
 * Auth options disable session/refresh because we never sign in with this
 * client; the key itself is the credential.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
