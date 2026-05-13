import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { importarFixture } from '@/lib/football-api/import-fixture'

// Always run dynamically — this hits the API and writes to the DB.
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()

  // Auth check: must be a logged-in user.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Authorization check: must be admin. We read es_admin via the user's own
  // session (RLS allows it: usuarios_select_all). No need for service-role here.
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('es_admin')
    .eq('id', user.id)
    .single()

  if (usuarioError || !usuario?.es_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Do the actual import with service-role so it can write to equipos (no
  // admin-write RLS policy there) without depending on the user's privileges.
  try {
    const serviceClient = createServiceRoleClient()
    const result = await importarFixture(serviceClient)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[importar-fixture] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
