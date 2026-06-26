import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { ApiMatchesResponse } from './types'
import { footballFetch } from './client'
import { STATUS_TO_ESTADO } from './import-fixture'

type Client = SupabaseClient<Database>

export interface SincronizarResultadosResult {
  partidos_actualizados: number
}

/**
 * Pulls live + finished matches from football-data.org and writes back
 * estado + marcador_*_real for each one. Matched against our partidos
 * rows by api_id (the football-data identifier).
 *
 * The API filter `status=IN_PLAY,PAUSED,FINISHED` keeps the payload
 * small — programado/scheduled matches don't move on their own.
 *
 * When a match crosses into 'finalizado' the DB trigger added in Fase 5
 * will fire and recompute predicciones_partido.puntos_obtenidos. This
 * function doesn't need to know about that.
 *
 * Errors abort early: if a single update fails we surface the error
 * and stop, so the cron job logs a clear failure instead of silently
 * processing half a batch.
 */
export async function sincronizarResultados(
  client: Client,
  competitionId: string = 'WC',
): Promise<SincronizarResultadosResult> {
  const response = await footballFetch<ApiMatchesResponse>(
    `/competitions/${competitionId}/matches?status=IN_PLAY,PAUSED,FINISHED`,
  )

  // Pre-fetch the current state of every partido this batch might touch so
  // we can compare DB vs API before writing. One round-trip total.
  const apiIds = response.matches.map((m) => m.id)
  const { data: currentRows, error: fetchError } = apiIds.length
    ? await client
        .from('partidos')
        .select('api_id, estado, marcador_local_real, marcador_visitante_real')
        .in('api_id', apiIds)
    : { data: [], error: null }
  if (fetchError) {
    throw new Error(`Failed to fetch current partidos state: ${fetchError.message}`)
  }
  const currentByApiId = new Map(
    (currentRows ?? []).map((r) => [r.api_id, r]),
  )

  let actualizados = 0
  for (const match of response.matches) {
    const apiHome = match.score.fullTime.home
    const apiAway = match.score.fullTime.away

    // Guard 1: never write null scores. football-data.org occasionally
    // reports a match as FINISHED with null scores when the data feed
    // is lagging — propagating that nulls out admin's manual results.
    if (apiHome === null || apiAway === null) {
      continue
    }

    // Guard 2: respect admin overrides. If the partido is already
    // 'finalizado' in our DB with non-null scores, skip — the admin
    // either set it manually or a previous sync already wrote it, and
    // either way the API shouldn't be allowed to silently change it.
    const current = currentByApiId.get(match.id)
    if (
      current &&
      current.estado === 'finalizado' &&
      current.marcador_local_real !== null &&
      current.marcador_visitante_real !== null
    ) {
      continue
    }

    const { error } = await client
      .from('partidos')
      .update({
        estado: STATUS_TO_ESTADO[match.status],
        marcador_local_real: apiHome,
        marcador_visitante_real: apiAway,
      })
      .eq('api_id', match.id)

    if (error) {
      throw new Error(`Failed to update partido api_id=${match.id}: ${error.message}`)
    }
    actualizados++
  }

  return { partidos_actualizados: actualizados }
}
