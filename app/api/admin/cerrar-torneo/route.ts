import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/cerrar-torneo
 *
 * Body: { goleador_oficial: string | null }
 *
 * Saves the official top-scorer on configuracion (row id=1) and then calls
 * the SQL function calcular_puntos_torneo() which iterates every
 * predicciones_torneo row and writes puntos_campeon / puntos_subcampeon /
 * puntos_goleador per user.
 *
 * The function uses unaccent + lower for the goleador comparison, so
 * "Mbappé", "mbappe", and "MBAPPE" all match.
 *
 * Admin-only via requireAdmin. Uses service-role for the writes so it
 * bypasses RLS on configuracion + predicciones_torneo cleanly.
 */
export async function POST(request: NextRequest) {
  await requireAdmin()

  let body: { goleador_oficial?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body inválido — esperado JSON con { goleador_oficial }.' },
      { status: 400 },
    )
  }

  const goleadorRaw = body.goleador_oficial
  if (goleadorRaw != null && typeof goleadorRaw !== 'string') {
    return NextResponse.json(
      { error: 'goleador_oficial debe ser string o null.' },
      { status: 400 },
    )
  }
  const goleador =
    typeof goleadorRaw === 'string' && goleadorRaw.trim().length > 0
      ? goleadorRaw.trim()
      : null

  const client = createServiceRoleClient()

  const { error: configError } = await client
    .from('configuracion')
    .update({
      goleador_oficial: goleador,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (configError) {
    console.error('[cerrar-torneo] config update failed:', configError)
    return NextResponse.json({ error: configError.message }, { status: 500 })
  }

  const { error: calcError } = await client.rpc('calcular_puntos_torneo')
  if (calcError) {
    console.error('[cerrar-torneo] calcular_puntos_torneo failed:', calcError)
    return NextResponse.json({ error: calcError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    goleador_oficial: goleador,
  })
}
