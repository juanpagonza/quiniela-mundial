import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Guard used by admin Server Components and Server Actions. Sends the user
 * to /login if unauthenticated and to / (home) if authenticated but not
 * an admin — keeps non-admins from seeing 403 walls.
 *
 * Returns the supabase client + user so callers don't duplicate the
 * setup. Task 8.1 will move the redirect logic into a route-group layout
 * so server actions inside /admin don't each repeat this dance.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('es_admin')
    .eq('id', user.id)
    .single()

  if (!usuario?.es_admin) redirect('/')

  return { supabase, user }
}
