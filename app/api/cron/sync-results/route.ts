import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sincronizarResultados } from '@/lib/football-api/sync-results'

// Vercel cron hits this as a GET. We force dynamic because it always runs against
// live data and writes to the DB.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vercel cron forwards the CRON_SECRET as Bearer in the Authorization header.
  // Reject anything that doesn't match — this endpoint must never be invokable
  // by anonymous traffic.
  const authHeader = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const client = createServiceRoleClient()
    const result = await sincronizarResultados(client)
    console.log(
      `[cron sync-results] partidos_actualizados=${result.partidos_actualizados}`,
    )
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[cron sync-results] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
